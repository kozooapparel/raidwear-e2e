import { OrderWithCustomer } from '@/types/database'
import { hasFormOrderData } from '@/lib/form-order'

export type OrderStageReadiness = {
    isReady: boolean
    label: string
    /** Kalimat yang ditampilkan ke admin: apa yang perlu dikerjakan pada tahap ini sekarang. */
    action: string
}

/** `action` untuk semua tahap yang sudah selesai: tinggal dipindah ke tahap berikutnya. */
const READY_ACTION = 'Siap dipindah ke tahap berikutnya'

/**
 * The canonical completion state for the action required in each Kanban stage.
 * It is shared by the card, modal, and Kanban filters so their status cannot drift.
 * `action` = pekerjaan yang harus dilakukan admin; `isReady` dan `label` tidak diubah.
 */
export function getOrderStageReadiness(
    order: OrderWithCustomer,
    options: { hasInvoice?: boolean } = {},
): OrderStageReadiness {
    const hasInvoice = options.hasInvoice ?? (order.invoices?.length ?? 0) > 0

    switch (order.stage) {
        case 'customer_dp_desain':
            return order.dp_desain_verified
                ? { isReady: true, label: 'Sudah DP', action: READY_ACTION }
                : { isReady: false, label: 'Belum Bayar', action: 'Verifikasi pembayaran DP Desain' }
        case 'proses_desain':
            return order.mockup_url
                ? { isReady: true, label: 'Mockup Siap', action: READY_ACTION }
                : { isReady: false, label: 'Belum Mockup', action: 'Unggah mockup desain' }
        case 'proses_layout':
            // ACC customer atas layout adalah penanda selesainya tahap ini. Unggahan file
            // cetak tetap disarankan, tetapi tidak lagi menahan perpindahan tahap.
            return order.layout_approved_at
                ? { isReady: true, label: 'ACC Layout', action: READY_ACTION }
                : { isReady: false, label: 'Menunggu ACC', action: 'Menunggu ACC layout dari customer' }
        case 'dp_produksi':
            if (!hasInvoice) return { isReady: false, label: 'Belum Invoice', action: 'Buat invoice' }
            if (!order.dp_produksi_verified) return { isReady: false, label: 'Belum DP', action: 'Verifikasi pembayaran DP 50%' }
            return hasFormOrderData(order)
                ? { isReady: true, label: 'Sudah DP', action: READY_ACTION }
                : { isReady: false, label: 'Belum Form Order', action: 'Lengkapi Form Order' }
        case 'antrean_produksi':
            return order.production_ready
                ? { isReady: true, label: 'Selesai', action: READY_ACTION }
                : { isReady: false, label: 'Belum Selesai', action: 'Tandai antrean produksi selesai' }
        case 'print_press':
            return order.print_completed
                ? { isReady: true, label: 'Selesai', action: READY_ACTION }
                : { isReady: false, label: 'Belum Selesai', action: 'Tandai Print & Press selesai' }
        case 'cutting_jahit':
            return order.sewing_completed
                ? { isReady: true, label: 'Selesai', action: READY_ACTION }
                : { isReady: false, label: 'Belum Selesai', action: 'Tandai Cutting & Jahit selesai' }
        case 'packing':
            return order.packing_completed
                ? { isReady: true, label: 'Selesai', action: READY_ACTION }
                : { isReady: false, label: 'Belum Selesai', action: 'Tandai Packing selesai' }
        case 'pelunasan':
            return order.pelunasan_verified
                ? { isReady: true, label: 'Sudah Lunas', action: READY_ACTION }
                : { isReady: false, label: 'Belum Lunas', action: 'Verifikasi pelunasan' }
        case 'pengiriman':
            return order.tracking_number && order.shipped_at
                ? { isReady: true, label: 'Sudah Kirim', action: READY_ACTION }
                : { isReady: false, label: 'Belum Kirim', action: 'Isi nomor resi lalu kirim' }
    }
}
