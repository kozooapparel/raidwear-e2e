'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Delete a customer - only allowed if customer has no orders
 */
export async function deleteCustomer(customerId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        // Check if customer has any orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id')
            .eq('customer_id', customerId)
            .limit(1)

        if (ordersError) throw ordersError

        // If customer has orders, reject deletion
        if (orders && orders.length > 0) {
            return {
                success: false,
                message: 'Tidak bisa hapus customer yang memiliki order. Hapus order terlebih dahulu.'
            }
        }

        // Check if customer has any invoices (direct invoices without orders)
        const { data: invoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('id')
            .eq('customer_id', customerId)
            .limit(1)

        if (invoicesError) throw invoicesError

        if (invoices && invoices.length > 0) {
            return {
                success: false,
                message: 'Tidak bisa hapus customer yang memiliki invoice. Hapus invoice terlebih dahulu.'
            }
        }

        // Delete the customer
        const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId)

        if (deleteError) throw deleteError

        revalidatePath('/customers')
        revalidatePath('/dashboard')

        return {
            success: true,
            message: 'Customer berhasil dihapus'
        }

    } catch (err) {
        console.error('Delete customer error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal menghapus customer'
        }
    }
}

/**
 * Ambil link portal customer (dashboard "Order Saya").
 *
 * Link kini memakai nomor WA ternormalisasi (/pesanan/[phone]) sebagai
 * identitas URL publik. Nomor dinormalisasi otomatis oleh trigger database
 * saat customer dibuat/berubah.
 */
export async function getCustomerPortalLink(
    customerId: string
): Promise<{ success: boolean; url?: string; message?: string }> {
    const supabase = await createClient()

    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('phone_normalized')
            .eq('id', customerId)
            .single()

        if (error) throw error

        if (!customer?.phone_normalized) {
            return {
                success: false,
                message:
                    'Customer ini belum punya nomor WA yang valid sehingga link akses tidak bisa dibuat.',
            }
        }

        return {
            success: true,
            url: `/pesanan/${customer.phone_normalized}`,
        }
    } catch (err) {
        console.error('Get customer portal link error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal membuat link portal',
        }
    }
}

/**
 * Setujui calon customer (pending -> active).
 * Hanya dipakai oleh admin pada menu Customers.
 */
export async function approveCustomer(
    customerId: string
): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase.rpc('approve_customer', {
            p_customer_id: customerId,
        })

        if (error) throw error

        const result = data as { success?: boolean; message?: string } | null
        if (!result?.success) {
            return {
                success: false,
                message: result?.message || 'Gagal menyetujui customer',
            }
        }

        revalidatePath('/customers')
        revalidatePath('/dashboard')

        return {
            success: true,
            message: 'Customer disetujui dan sekarang aktif',
        }
    } catch (err) {
        console.error('Approve customer error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal menyetujui customer',
        }
    }
}
