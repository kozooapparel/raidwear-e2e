/**
 * Pemetaan istilah tahap Order ke bahasa customer.
 *
 * Urutan & makna tahap TIDAK berubah dari sistem yang ada — hanya katanya
 * yang disederhanakan agar mudah dipahami customer (lihat PRD §11).
 * Sumber urutan kanonik: STAGES_ORDER di src/types/database.ts
 */

import { STAGES_ORDER, type OrderStage } from '@/types/database'
import type { PortalOrder } from './types'

/** Istilah tahap yang dilihat customer. */
export const CUSTOMER_STAGE_LABELS: Record<OrderStage, string> = {
    customer_dp_desain: 'Deposit Desain',
    proses_desain: 'Proses Desain',
    dp_produksi: 'Pembayaran DP Produksi',
    proses_layout: 'Layout & Persetujuan',
    antrean_produksi: 'Antrean Produksi',
    print_press: 'Proses Cetak',
    cutting_jahit: 'Cutting & Jahit',
    packing: 'Packing & Pengecekan',
    pelunasan: 'Pelunasan',
    pengiriman: 'Pengiriman',
}

/** Penjelasan singkat apa yang terjadi pada tahap tersebut. */
export const CUSTOMER_STAGE_DESCRIPTIONS: Record<OrderStage, string> = {
    customer_dp_desain: 'Pembayaran deposit awal untuk memulai proses desain.',
    proses_desain: 'Tim desain menyiapkan mockup desain untuk order Anda.',
    dp_produksi: 'Pembayaran DP produksi minimal 50% dari total invoice.',
    proses_layout: 'Layout siap cetak disiapkan. Anda dapat memeriksa dan menyetujuinya.',
    antrean_produksi: 'Order masuk antrean produksi dan mendapatkan nomor SPK.',
    print_press: 'Proses cetak (print & press) kain.',
    cutting_jahit: 'Kain dipotong dan dijahit menjadi jersey.',
    packing: 'Pengecekan akhir dan pengemasan.',
    pelunasan: 'Pembayaran sisa tagihan sebelum pengiriman.',
    pengiriman: 'Order dikirim ke alamat Anda.',
}

export function getCustomerStageIndex(stage: OrderStage): number {
    return STAGES_ORDER.indexOf(stage)
}

export interface PortalAction {
    /** true bila customer perlu melakukan sesuatu saat ini. */
    required: boolean
    title: string
    description: string
    /** Jenis aksi, dipakai UI untuk memilih tombol. */
    kind: 'approve_layout' | 'payment' | 'none'
}

/**
 * Menentukan aksi yang diperlukan customer, mengikuti aturan gatekeeper
 * sistem yang ada (DP Desain, DP Produksi, Pelunasan) dan proses ACC layout.
 */
export function getPortalAction(order: PortalOrder, layoutApproved: boolean): PortalAction {
    switch (order.stage) {
        case 'customer_dp_desain':
            if (!order.payment.dpDesainVerified) {
                return {
                    required: true,
                    kind: 'payment',
                    title: 'Deposit Desain menunggu pembayaran',
                    description: 'Order akan mulai diproses setelah deposit desain dibayarkan.',
                }
            }
            break
        case 'proses_layout':
            if (!layoutApproved) {
                return {
                    required: true,
                    kind: 'approve_layout',
                    title: 'Layout menunggu persetujuan Anda',
                    description: 'Periksa gambar layout terbaru, lalu setujui atau ajukan revisi.',
                }
            }
            break
        case 'dp_produksi':
            if (!order.payment.dpProduksiVerified) {
                return {
                    required: true,
                    kind: 'payment',
                    title: 'Pembayaran DP Produksi',
                    description: 'Produksi dimulai setelah DP produksi (minimal 50%) dibayarkan.',
                }
            }
            break
        case 'pelunasan':
            if (!order.payment.pelunasanVerified) {
                return {
                    required: true,
                    kind: 'payment',
                    title: 'Pelunasan menunggu pembayaran',
                    description: 'Order dikirim setelah sisa tagihan dilunasi.',
                }
            }
            break
        default:
            break
    }

    return {
        required: false,
        kind: 'none',
        title: 'Tidak ada yang perlu Anda lakukan',
        description: 'Kami sedang mengerjakan order Anda. Kami akan memberi tahu jika ada yang diperlukan.',
    }
}

/** Status ringkas pembayaran, mengikuti logika yang dipakai ERP. */
export function getPaymentSummary(order: PortalOrder): { label: string; tone: 'danger' | 'warning' | 'info' | 'success' } {
    const { payment } = order
    if (payment.pelunasanVerified) return { label: 'Lunas', tone: 'success' }
    if (payment.dpProduksiVerified) return { label: 'DP Produksi 50%', tone: 'warning' }
    if (payment.dpDesainVerified) return { label: 'Deposit Desain', tone: 'info' }
    return { label: 'Belum Bayar', tone: 'danger' }
}
