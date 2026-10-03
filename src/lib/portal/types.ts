/**
 * Tipe data Customer Portal.
 *
 * Bentuk data sengaja dibuat mengikuti struktur ERP yang sudah ada
 * (lihat src/types/database.ts) agar saat integrasi pengalaman customer tidak
 * perlu didesain ulang. Nilai diisi dari hasil RPC get_portal_order() yang
 * diakses lewat token pada URL /lacak/[token].
 */

import type { OrderStage } from '@/types/database'

export interface PortalBrand {
    name: string
    companyName: string
    logoUrl: string | null
    phone: string | null
    email: string | null
    address: string | null
    bankName: string | null
    accountName: string | null
    accountNumber: string | null
}

export interface PortalCustomer {
    name: string
    phone: string
    alamat: string | null
    kota: string | null
}

export interface PortalInvoice {
    noInvoice: string
    tanggal: string
    subTotal: number
    ppnPersen: number
    ppnAmount: number
    total: number
    totalDibayar: number
    sisaTagihan: number
    statusPembayaran: 'BELUM_LUNAS' | 'SUDAH_LUNAS'
    terminPembayaran: number
}

export interface PortalPayment {
    dpDesainAmount: number
    dpDesainVerified: boolean
    dpDesainVerifiedAt: string | null
    dpProduksiAmount: number
    dpProduksiVerified: boolean
    dpProduksiVerifiedAt: string | null
    pelunasanAmount: number
    pelunasanVerified: boolean
    pelunasanVerifiedAt: string | null
    invoice: PortalInvoice | null
}

export interface PortalProgress {
    layoutCompletedAt: string | null
    productionReadyAt: string | null
    printCompletedAt: string | null
    sewingCompletedAt: string | null
    packingCompletedAt: string | null
}

export interface PortalShipping {
    trackingNumber: string | null
    courier: string | null
    shippedAt: string | null
}

export interface PortalOrder {
    /** Token pada URL /lacak/[token] */
    token: string
    orderNumber: string
    orderDescription: string
    totalQuantity: number
    stage: OrderStage
    stageEnteredAt: string
    createdAt: string
    deadline: string | null
    mockupUrl: string | null
    layoutUrl: string | null
    /** Gambar pratinjau layout yang ditampilkan untuk ACC customer. */
    layoutPreviewUrl: string | null
    designNotes: string | null
    spkNumber: string | null
    /** Persetujuan layout oleh customer lewat portal. */
    layoutApproved: boolean
    layoutApprovedAt: string | null
    layoutRevisionNote: string | null
    layoutRevisionRequestedAt: string | null
    customer: PortalCustomer
    brand: PortalBrand
    payment: PortalPayment
    progress: PortalProgress
    shipping: PortalShipping
}
