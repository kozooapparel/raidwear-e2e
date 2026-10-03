import { OrderWithCustomer } from '@/types/database'
import { hasFormOrderData } from '@/lib/form-order'

export type OrderStageReadiness = {
    isReady: boolean
    label: string
}

/**
 * The canonical completion state for the action required in each Kanban stage.
 * It is shared by the card, modal, and Kanban filters so their status cannot drift.
 */
export function getOrderStageReadiness(
    order: OrderWithCustomer,
    options: { hasInvoice?: boolean } = {},
): OrderStageReadiness {
    const hasInvoice = options.hasInvoice ?? (order.invoices?.length ?? 0) > 0

    switch (order.stage) {
        case 'customer_dp_desain':
            return order.dp_desain_verified
                ? { isReady: true, label: 'Sudah DP' }
                : { isReady: false, label: 'Belum Bayar' }
        case 'proses_desain':
            return order.mockup_url
                ? { isReady: true, label: 'Mockup Siap' }
                : { isReady: false, label: 'Belum Mockup' }
        case 'proses_layout':
            // ACC customer atas layout adalah penanda selesainya tahap ini. Unggahan file
            // cetak tetap disarankan, tetapi tidak lagi menahan perpindahan tahap.
            return order.layout_approved_at
                ? { isReady: true, label: 'ACC Layout' }
                : { isReady: false, label: 'Menunggu ACC' }
        case 'dp_produksi':
            if (!hasInvoice) return { isReady: false, label: 'Belum Invoice' }
            if (!order.dp_produksi_verified) return { isReady: false, label: 'Belum DP' }
            return hasFormOrderData(order)
                ? { isReady: true, label: 'Sudah DP' }
                : { isReady: false, label: 'Belum Form Order' }
        case 'antrean_produksi':
            return order.production_ready
                ? { isReady: true, label: 'Selesai' }
                : { isReady: false, label: 'Belum Selesai' }
        case 'print_press':
            return order.print_completed
                ? { isReady: true, label: 'Selesai' }
                : { isReady: false, label: 'Belum Selesai' }
        case 'cutting_jahit':
            return order.sewing_completed
                ? { isReady: true, label: 'Selesai' }
                : { isReady: false, label: 'Belum Selesai' }
        case 'packing':
            return order.packing_completed
                ? { isReady: true, label: 'Selesai' }
                : { isReady: false, label: 'Belum Selesai' }
        case 'pelunasan':
            return order.pelunasan_verified
                ? { isReady: true, label: 'Sudah Lunas' }
                : { isReady: false, label: 'Belum Lunas' }
        case 'pengiriman':
            return order.tracking_number && order.shipped_at
                ? { isReady: true, label: 'Sudah Kirim' }
                : { isReady: false, label: 'Belum Kirim' }
    }
}
