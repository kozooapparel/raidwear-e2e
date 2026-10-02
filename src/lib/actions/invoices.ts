'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
    Invoice,
    InvoiceInsert,
    InvoiceUpdate,
    InvoiceWithItems,
    InvoiceWithCustomer,
    InvoiceItem,
    InvoiceItemInsert,
    Brand
} from '@/types/database'
import { generateInvoiceNumber } from '@/lib/utils/invoice-number'

export interface InvoiceFilters {
    customerId?: string
    status?: 'BELUM_LUNAS' | 'SUDAH_LUNAS'
    dateFrom?: string
    dateTo?: string
    orderId?: string
}

/**
 * Get invoice list with filters
 */
export async function getInvoiceList(filters?: InvoiceFilters): Promise<InvoiceWithCustomer[]> {
    const supabase = await createClient()

    let query = supabase
        .from('invoices')
        .select(`
            *,
            customer:customers(*),
            brand:brands(*)
        `)
        .order('created_at', { ascending: false })

    if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId)
    }

    if (filters?.status) {
        query = query.eq('status_pembayaran', filters.status)
    }

    if (filters?.dateFrom) {
        query = query.gte('tanggal', filters.dateFrom)
    }

    if (filters?.dateTo) {
        query = query.lte('tanggal', filters.dateTo)
    }

    if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching invoices:', error)
        throw new Error('Failed to fetch invoices')
    }

    return data || []
}

/**
 * Get invoice by ID with items and brand
 */
export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
    const supabase = await createClient()

    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
            *,
            customer:customers(*),
            brand:brands(*)
        `)
        .eq('id', id)
        .single()

    if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError)
        return null
    }

    const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('item_no', { ascending: true })

    if (itemsError) {
        console.error('Error fetching invoice items:', itemsError)
    }

    return {
        ...invoice,
        items: items || []
    }
}

/**
 * Get invoices by order ID
 */
export async function getInvoicesByOrderId(orderId: string): Promise<InvoiceWithCustomer[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            customer:customers(*)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching invoices by order:', error)
        return []
    }

    return data || []
}

/**
 * Generate unique invoice number
 */
export async function generateUniqueInvoiceNumber(customerName: string, date: Date = new Date()): Promise<string> {
    const supabase = await createClient()

    let baseNumber = generateInvoiceNumber(customerName, date)
    let noInvoice = baseNumber
    let counter = 1

    // Check if invoice number already exists
    while (true) {
        const { data } = await supabase
            .from('invoices')
            .select('id')
            .eq('no_invoice', noInvoice)
            .single()

        if (!data) break

        // Add counter suffix if duplicate
        counter++
        noInvoice = `${baseNumber}-${counter}`
    }

    return noInvoice
}

/**
 * Create invoice with items
 */
export async function createInvoice(
    invoiceData: Omit<InvoiceInsert, 'no_invoice'> & { customerName: string },
    items: Omit<InvoiceItemInsert, 'invoice_id'>[]
): Promise<Invoice | null> {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Get order data including brand_id and dp_desain info
    let orderBrandId: string | null = null
    let orderData: { brand_id: string | null; dp_desain_verified: boolean; dp_desain_amount: number } | null = null

    if (invoiceData.order_id) {
        const { data: order } = await supabase
            .from('orders')
            .select('brand_id, dp_desain_verified, dp_desain_amount')
            .eq('id', invoiceData.order_id)
            .single()
        orderBrandId = order?.brand_id || null
        orderData = order
    }

    // Prioritize brand_id from invoiceData (manual selection), then fallback to order's brand
    const finalBrandId = invoiceData.brand_id || orderBrandId

    const { data: brand } = finalBrandId
        ? await supabase
            .from('brands')
            .select('default_invoice_template_id, default_kuitansi_template_id')
            .eq('id', finalBrandId)
            .single()
        : { data: null }

    // Generate invoice number
    const noInvoice = await generateUniqueInvoiceNumber(
        invoiceData.customerName,
        invoiceData.tanggal ? new Date(invoiceData.tanggal) : new Date()
    )

    // Calculate totals
    const subTotal = items.reduce((sum, item) => sum + item.sub_total, 0)
    const ppnPersen = invoiceData.ppn_persen || 0
    const ppnAmount = (subTotal * ppnPersen) / 100
    const total = subTotal + ppnAmount

    // Create invoice with brand_id from manual selection or order
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            no_invoice: noInvoice,
            tanggal: invoiceData.tanggal,
            customer_id: invoiceData.customer_id,
            order_id: invoiceData.order_id,
            brand_id: finalBrandId,  // Use prioritized brand_id
            template_id: brand?.default_invoice_template_id || 'invoice_01',
            perkiraan_produksi: invoiceData.perkiraan_produksi,
            deadline: invoiceData.deadline,
            termin_pembayaran: invoiceData.termin_pembayaran,
            no_po: invoiceData.no_po,
            sub_total: subTotal,
            ppn_persen: ppnPersen,
            ppn_amount: ppnAmount,
            total: total,
            sisa_tagihan: total,
            created_by: user?.id
        })
        .select()
        .single()

    if (invoiceError) {
        console.error('Error creating invoice:', invoiceError)
        throw new Error('Failed to create invoice')
    }

    // Create invoice items
    if (invoice && items.length > 0) {
        const itemsWithInvoiceId = items.map((item, index) => ({
            ...item,
            invoice_id: invoice.id,
            item_no: index + 1
        }))

        const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsWithInvoiceId)

        if (itemsError) {
            console.error('Error creating invoice items:', itemsError)
        }
    }

    // Auto-create kuitansi for Deposit Desain if already verified
    if (invoice && orderData?.dp_desain_verified && orderData.dp_desain_amount > 0) {
        const { error: kuitansiError } = await supabase
            .from('kuitansi')
            .insert({
                invoice_id: invoice.id,
                tanggal: new Date().toISOString().split('T')[0],
                jumlah: orderData.dp_desain_amount,
                template_id: brand?.default_kuitansi_template_id || 'receipt_01',
                keterangan: `Pembayaran Deposit Desain - ${noInvoice}`,
                created_by: user?.id
            })

        if (kuitansiError) {
            console.error('Error creating auto-kuitansi for Deposit Desain:', kuitansiError)
        } else {
            console.log('Auto-kuitansi Deposit Desain created for invoice:', noInvoice)
        }
    }

    revalidatePath('/invoices')
    revalidatePath('/kuitansi')
    return invoice
}

/**
 * Update invoice
 */
export async function updateInvoice(
    id: string,
    invoiceData: InvoiceUpdate,
    items?: Omit<InvoiceItemInsert, 'invoice_id'>[]
): Promise<Invoice | null> {
    const supabase = await createClient()

    // If items provided, recalculate totals
    let updateData = { ...invoiceData }

    if (items) {
        const subTotal = items.reduce((sum, item) => sum + item.sub_total, 0)
        const ppnPersen = invoiceData.ppn_persen ?? 0
        const ppnAmount = (subTotal * ppnPersen) / 100
        const total = subTotal + ppnAmount

        // Get current total_dibayar to calculate sisa_tagihan
        const { data: currentInvoice } = await supabase
            .from('invoices')
            .select('total_dibayar')
            .eq('id', id)
            .single()

        const totalDibayar = currentInvoice?.total_dibayar || 0

        updateData = {
            ...updateData,
            sub_total: subTotal,
            ppn_amount: ppnAmount,
            total: total,
            sisa_tagihan: total - totalDibayar,
            status_pembayaran: total <= totalDibayar ? 'SUDAH_LUNAS' : 'BELUM_LUNAS'
        }
    }

    const { data: invoice, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating invoice:', error)
        throw new Error('Failed to update invoice')
    }

    // Update items if provided
    if (items !== undefined) {
        // Delete existing items
        await supabase
            .from('invoice_items')
            .delete()
            .eq('invoice_id', id)

        // Insert new items
        if (items.length > 0) {
            const itemsWithInvoiceId = items.map((item, index) => ({
                ...item,
                invoice_id: id,
                item_no: index + 1
            }))

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsWithInvoiceId)

            if (itemsError) {
                console.error('Error updating invoice items:', itemsError)
            }
        }
    }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return invoice
}

/**
 * Delete invoice
 */
export async function deleteInvoice(id: string): Promise<boolean> {
    const supabase = await createClient()

    // Check if invoice has kuitansi
    const { data: kuitansi } = await supabase
        .from('kuitansi')
        .select('id')
        .eq('invoice_id', id)
        .limit(1)

    if (kuitansi && kuitansi.length > 0) {
        throw new Error('Cannot delete invoice with existing payments. Delete payments first.')
    }

    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting invoice:', error)
        throw new Error('Failed to delete invoice')
    }

    revalidatePath('/invoices')
    return true
}

/**
 * Get unpaid invoices for kuitansi dropdown
 */
export async function getUnpaidInvoices(): Promise<(InvoiceWithCustomer & { brand?: Brand | null })[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            customer:customers(*),
            brand:brands(*)
        `)
        .eq('status_pembayaran', 'BELUM_LUNAS')
        .order('tanggal', { ascending: false })

    if (error) {
        console.error('Error fetching unpaid invoices:', error)
        return []
    }

    return data || []
}

/**
 * Get all invoice items for rekap
 */
export async function getInvoiceItemsRekap(filters?: InvoiceFilters): Promise<(InvoiceItem & { invoice: InvoiceWithCustomer })[]> {
    const supabase = await createClient()

    let query = supabase
        .from('invoice_items')
        .select(`
            *,
            invoice:invoices(
                *,
                customer:customers(*)
            )
        `)
        .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
        console.error('Error fetching invoice items rekap:', error)
        return []
    }

    // Apply filters on invoice level
    let filtered = data || []

    if (filters?.customerId) {
        filtered = filtered.filter(item => item.invoice?.customer_id === filters.customerId)
    }

    if (filters?.dateFrom) {
        filtered = filtered.filter(item => item.invoice?.tanggal >= filters.dateFrom!)
    }

    if (filters?.dateTo) {
        filtered = filtered.filter(item => item.invoice?.tanggal <= filters.dateTo!)
    }

    return filtered
}
