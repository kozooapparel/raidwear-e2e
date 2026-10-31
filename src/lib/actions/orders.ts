'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { abortMultipartUpload, deleteObject, isObjectNotFound } from '@/lib/storage/r2'
import { requireTenantContext } from '@/lib/storage/tenant'

/**
 * Verify DP payment and auto-create kuitansi if invoice exists
 */
export async function verifyDPPayment(
    orderId: string,
    type: 'dp_desain' | 'dp_produksi' | 'pelunasan',
    amount?: number
): Promise<{ success: boolean; message: string; kuitansiCreated?: boolean }> {
    const supabase = await createClient()

    try {
        // Get order with invoice
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, invoices(*)')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
            [`${type}_verified`]: true,
            [`${type}_verified_at`]: new Date().toISOString(),
        }

        // If amount provided, update the amount too
        if (amount !== undefined && amount > 0) {
            updateData[`${type}_amount`] = amount
        }

        // Update order
        const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)

        if (updateError) throw updateError

        // Check if invoice exists for this order to create kuitansi
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, no_invoice, sisa_tagihan, brand_id')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1)

        let kuitansiCreated = false
        const invoice = invoices?.[0]

        // Only create kuitansi if invoice exists
        if (invoice) {
            const paymentAmount = amount || order[`${type}_amount`] || 0

            if (paymentAmount > 0) {
                // Create kuitansi
                const { data: { user } } = await supabase.auth.getUser()

                const keterangan = type === 'dp_desain'
                    ? 'Pembayaran Deposit Desain'
                    : type === 'dp_produksi'
                        ? 'Pembayaran DP Produksi'
                        : 'Pembayaran Pelunasan'

                const { data: brand } = invoice.brand_id
                    ? await supabase
                        .from('brands')
                        .select('default_kuitansi_template_id')
                        .eq('id', invoice.brand_id)
                        .single()
                    : { data: null }

                const { error: kuitansiError } = await supabase
                    .from('kuitansi')
                    .insert({
                        invoice_id: invoice.id,
                        tanggal: new Date().toISOString().split('T')[0],
                        jumlah: paymentAmount,
                        template_id: brand?.default_kuitansi_template_id || 'receipt_01',
                        keterangan: `${keterangan} - ${invoice.no_invoice}`,
                        created_by: user?.id
                    })

                if (!kuitansiError) {
                    kuitansiCreated = true
                }
            }
        }

        revalidatePath('/')
        revalidatePath('/kuitansi')
        revalidatePath('/invoices')

        return {
            success: true,
            message: kuitansiCreated
                ? 'DP verified dan kuitansi otomatis dibuat'
                : 'DP verified (kuitansi akan dibuat setelah invoice ada)',
            kuitansiCreated
        }

    } catch (err) {
        console.error('Verify DP error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal verify DP'
        }
    }
}

/**
 * Correct DP payment amount after verification (for admin input errors)
 * Also updates the related kuitansi if one exists
 */
export async function correctDPPayment(
    orderId: string,
    type: 'dp_desain' | 'dp_produksi' | 'pelunasan',
    newAmount: number
): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        if (newAmount < 0) {
            return { success: false, message: 'Nominal tidak boleh negatif' }
        }

        // Get order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        const oldAmount = order[`${type}_amount`] || 0

        // Update order amount
        const { error: updateError } = await supabase
            .from('orders')
            .update({ [`${type}_amount`]: newAmount })
            .eq('id', orderId)

        if (updateError) throw updateError

        // Find and update related kuitansi
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1)

        const invoice = invoices?.[0]
        let kuitansiUpdated = false

        if (invoice) {
            // Match kuitansi by invoice_id and keterangan pattern
            const keteranganPattern = type === 'dp_desain'
                ? '%Pembayaran%Desain%'
                : type === 'dp_produksi'
                    ? '%Pembayaran DP Produksi%'
                    : '%Pembayaran Pelunasan%'

            // Find kuitansi with matching amount and keterangan
            const { data: kuitansiList } = await supabase
                .from('kuitansi')
                .select('id, jumlah')
                .eq('invoice_id', invoice.id)
                .like('keterangan', keteranganPattern)
                .eq('jumlah', oldAmount)
                .limit(1)

            const kuitansi = kuitansiList?.[0]

            if (kuitansi) {
                const { error: kuitansiUpdateError } = await supabase
                    .from('kuitansi')
                    .update({ jumlah: newAmount })
                    .eq('id', kuitansi.id)

                if (!kuitansiUpdateError) {
                    kuitansiUpdated = true
                }
            }
        }

        revalidatePath('/')
        revalidatePath('/kuitansi')
        revalidatePath('/invoices')

        return {
            success: true,
            message: kuitansiUpdated
                ? `Nominal ${type === 'dp_desain' ? 'Deposit Desain' : type === 'dp_produksi' ? 'DP Produksi' : 'Pelunasan'} berhasil dikoreksi (kuitansi ikut diupdate)`
                : `Nominal ${type === 'dp_desain' ? 'Deposit Desain' : type === 'dp_produksi' ? 'DP Produksi' : 'Pelunasan'} berhasil dikoreksi`
        }

    } catch (err) {
        console.error('Correct DP error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal koreksi nominal DP'
        }
    }
}

/**
 * Generate SPK number for an order
 */
export async function generateSPKNumber(orderId: string): Promise<{ success: boolean; spkNumber?: string; message: string }> {
    const supabase = await createClient()

    try {
        // Get order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, spk_number')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // Already has SPK
        if (order.spk_number) {
            return {
                success: true,
                spkNumber: order.spk_number,
                message: 'SPK sudah ada'
            }
        }

        // Generate SPK number: SPK-YYYYMM-XXXX
        const now = new Date()
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

        // Get last SPK of this month
        const { data: lastOrder } = await supabase
            .from('orders')
            .select('spk_number')
            .like('spk_number', `SPK-${yearMonth}-%`)
            .order('spk_number', { ascending: false })
            .limit(1)
            .single()

        let nextNumber = 1
        if (lastOrder?.spk_number) {
            const lastNum = parseInt(lastOrder.spk_number.split('-')[2]) || 0
            nextNumber = lastNum + 1
        }

        const spkNumber = `SPK-${yearMonth}-${String(nextNumber).padStart(4, '0')}`

        // Update order with SPK number
        const { error: updateError } = await supabase
            .from('orders')
            .update({ spk_number: spkNumber })
            .eq('id', orderId)

        if (updateError) throw updateError

        revalidatePath('/')
        revalidatePath('/form-order')

        return {
            success: true,
            spkNumber,
            message: 'SPK berhasil di-generate'
        }

    } catch (err) {
        console.error('Generate SPK error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal generate SPK'
        }
    }
}

/**
 * Move order to next stage with validations and auto-actions
 */
export async function moveOrderToNextStage(
    orderId: string,
    currentStage: string,
    nextStage: string
): Promise<{ success: boolean; message: string; spkGenerated?: boolean }> {
    const supabase = await createClient()

    try {
        // Get order with related data
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // Validate based on current stage
        if (currentStage === 'dp_produksi') {
            // Check if invoice exists
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id')
                .eq('order_id', orderId)

            if (!invoices || invoices.length === 0) {
                return {
                    success: false,
                    message: 'Buat Invoice terlebih dahulu sebelum pindah ke Antrean Produksi'
                }
            }

            if (!order.dp_produksi_verified) {
                return {
                    success: false,
                    message: 'DP Produksi harus diverifikasi terlebih dahulu'
                }
            }
        }

        // Update stage
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                stage: nextStage,
                stage_entered_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (updateError) throw updateError

        let spkGenerated = false

        // Auto-generate SPK when entering OR leaving antrean_produksi without one
        // (covers orders that were dragged straight into the stage before SPK existed)
        const needsSPK =
            !order.spk_number &&
            (nextStage === 'antrean_produksi' || currentStage === 'antrean_produksi')
        if (needsSPK) {
            const result = await generateSPKNumber(orderId)
            if (!result.success) {
                return { success: false, message: result.message }
            }
            spkGenerated = true
        }

        revalidatePath('/')

        return {
            success: true,
            message: spkGenerated
                ? 'Berhasil pindah stage dan SPK auto-generated'
                : 'Berhasil pindah stage',
            spkGenerated
        }

    } catch (err) {
        console.error('Move stage error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal pindah stage'
        }
    }
}

/**
 * Permanently delete an order and records that belong exclusively to it.
 *
 * R2 is an external service, so its objects are removed first.  Database work
 * then runs in the delete_order_permanently() transaction; its metadata is
 * never deleted if any R2 operation fails.
 */
export async function deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { tenantId } = await requireTenantContext()
        const supabase = await createClient()

        // Confirm the migration is live before deleting an irreversible R2
        // object. A random non-existent order causes the deployed function to
        // reject safely, while a schema-cache error means it is not deployed.
        const { error: functionCheckError } = await supabase.rpc('delete_order_permanently', {
            p_order_id: randomUUID(),
        })
        if (!functionCheckError?.message.includes('Order tidak ditemukan')) {
            const detail = functionCheckError?.message || 'fungsi database tidak merespons seperti yang diharapkan'
            throw new Error(`Migration penghapusan permanen belum tersedia. Tidak ada data atau file yang dihapus: ${detail}`)
        }

        const admin = createAdminClient()
        const { data: order, error: orderError } = await admin
            .from('orders')
            .select('id, tenant_id')
            .eq('id', orderId)
            .single()

        if (orderError || !order) throw new Error('Order tidak ditemukan')
        if (order.tenant_id !== tenantId) throw new Error('Anda tidak memiliki akses untuk menghapus order ini')

        const { data: files, error: filesError } = await admin
            .from('r2_files')
            .select('id, storage_key, status, multipart_upload_id')
            .eq('tenant_id', tenantId)
            .eq('order_id', orderId)

        if (filesError) throw new Error(`Gagal memeriksa file order: ${filesError.message}`)

        for (const file of files || []) {
            if (file.status === 'deleted' || file.status === 'missing' || file.status === 'failed') continue

            try {
                if (file.status === 'uploading' && file.multipart_upload_id) {
                    await abortMultipartUpload(tenantId, file.storage_key, file.multipart_upload_id)
                } else {
                    await deleteObject(tenantId, file.storage_key)
                }
            } catch (error) {
                if (!isObjectNotFound(error)) {
                    throw new Error(`Gagal menghapus file R2 \"${file.storage_key}\". Order tidak dihapus: ${error instanceof Error ? error.message : 'kesalahan tidak diketahui'}`)
                }
            }
        }

        const { error: deleteError } = await supabase.rpc('delete_order_permanently', { p_order_id: orderId })
        if (deleteError) {
            throw new Error(`Penghapusan database dibatalkan: ${deleteError.message}. Object R2 yang sudah dihapus tidak akan dipulihkan otomatis.`)
        }

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/invoices')
        revalidatePath('/kuitansi')
        revalidatePath('/orders/history')

        return {
            success: true,
            message: 'Order dan seluruh data transaksi khususnya berhasil dihapus permanen'
        }

    } catch (err) {
        console.error('Delete order error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal menghapus order'
        }
    }
}

/**
 * Update design notes for an order
 */
export async function updateDesignNotes(
    orderId: string,
    notes: string
): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('orders')
            .update({ design_notes: notes || null })
            .eq('id', orderId)

        if (error) throw error

        revalidatePath('/')
        revalidatePath('/dashboard')

        return {
            success: true,
            message: 'Catatan desain berhasil disimpan'
        }
    } catch (err) {
        console.error('Update design notes error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal menyimpan catatan'
        }
    }
}

/**
 * Archive an order without altering its invoices, payments, or files.
 */
export async function archiveOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        // Get order to validate
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, is_archived')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order tidak ditemukan')
        }

        // Check if already archived
        if (order.is_archived) {
            return {
                success: false,
                message: 'Order sudah diarsip'
            }
        }

        // Update order to archived
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                is_archived: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (updateError) throw updateError

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/orders/history')

        return {
            success: true,
            message: 'Order berhasil diarsipkan. Invoice, kuitansi, pembayaran, dan file tetap tersimpan.'
        }
    } catch (err) {
        console.error('Archive order error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal mengarsip order'
        }
    }
}

/**
 * Mark an order as fully paid and archive it from every Kanban stage.
 */
export async function completeOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, is_archived')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order tidak ditemukan')
        }

        if (order.is_archived) {
            return { success: false, message: 'Order sudah diarsip' }
        }

        const now = new Date().toISOString()
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                pelunasan_verified: true,
                pelunasan_verified_at: now,
                is_archived: true,
                updated_at: now,
            })
            .eq('id', orderId)

        if (updateError) throw updateError

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/orders/history')

        return {
            success: true,
            message: 'Order ditandai selesai, pembayaran dianggap lunas, dan dipindahkan ke arsip.'
        }
    } catch (err) {
        console.error('Complete order error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal menyelesaikan order'
        }
    }
}

/**
 * Unarchive an order (restore to Kanban)
 */
export async function unarchiveOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()

    try {
        // Get order to validate
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, is_archived')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order tidak ditemukan')
        }

        if (!order.is_archived) {
            return {
                success: false,
                message: 'Order tidak dalam status arsip'
            }
        }

        // Update order to unarchived
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                is_archived: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (updateError) throw updateError

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/orders/history')

        return {
            success: true,
            message: 'Order berhasil dikembalikan ke Kanban'
        }
    } catch (err) {
        console.error('Unarchive order error:', err)
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Gagal mengembalikan order'
        }
    }
}
