/**
 * Lapisan baca portal publik.
 *
 * Portal diakses tanpa login, jadi RLS tabel orders tidak bisa dipakai
 * langsung. Pembacaan dilakukan lewat RPC SECURITY DEFINER `get_portal_order`
 * yang hanya mengembalikan data bila token cocok. Hasil jsonb dipetakan ke
 * PortalOrder agar komponen portal tetap memakai bentuk data yang sama.
 */

import { createClient } from '@/lib/supabase/server'
import type { OrderStage } from '@/types/database'
import type { PortalOrder } from './types'

interface PortalOrderRpc {
    token: string
    orderNumber: string
    orderDescription: string
    totalQuantity: number
    stage: string
    stageEnteredAt: string
    createdAt: string
    deadline: string | null
    mockupUrl: string | null
    layoutUrl: string | null
    layoutPreviewUrl: string | null
    designNotes: string | null
    spkNumber: string | null
    layoutApprovedAt: string | null
    layoutRevisionNote: string | null
    layoutRevisionRequestedAt: string | null
    customer: {
        name: string
        phone: string
        alamat: string | null
        kota: string | null
    } | null
    brand: {
        name: string | null
        companyName: string | null
        logoUrl: string | null
        phone: string | null
        email: string | null
        address: string | null
        bankName: string | null
        accountName: string | null
        accountNumber: string | null
    } | null
    payment: {
        dpDesainAmount: number | null
        dpDesainVerified: boolean | null
        dpDesainVerifiedAt: string | null
        dpProduksiAmount: number | null
        dpProduksiVerified: boolean | null
        dpProduksiVerifiedAt: string | null
        pelunasanAmount: number | null
        pelunasanVerified: boolean | null
        pelunasanVerifiedAt: string | null
        invoice: {
            noInvoice: string
            tanggal: string
            subTotal: number
            ppnPersen: number
            ppnAmount: number
            total: number
            totalDibayar: number
            sisaTagihan: number
            statusPembayaran: string
            terminPembayaran: number
        } | null
    } | null
    progress: {
        layoutCompletedAt: string | null
        productionReadyAt: string | null
        printCompletedAt: string | null
        sewingCompletedAt: string | null
        packingCompletedAt: string | null
    } | null
    shipping: {
        trackingNumber: string | null
        courier: string | null
        shippedAt: string | null
    } | null
}

/** Ubah hasil RPC menjadi PortalOrder dengan nilai default yang aman. */
function mapPortalOrder(raw: PortalOrderRpc): PortalOrder {
    const invoice = raw.payment?.invoice ?? null

    return {
        token: raw.token,
        orderNumber: raw.orderNumber,
        orderDescription: raw.orderDescription,
        totalQuantity: raw.totalQuantity,
        stage: raw.stage as OrderStage,
        stageEnteredAt: raw.stageEnteredAt,
        createdAt: raw.createdAt,
        deadline: raw.deadline,
        mockupUrl: raw.mockupUrl,
        layoutUrl: raw.layoutUrl,
        layoutPreviewUrl: raw.layoutPreviewUrl,
        designNotes: raw.designNotes,
        spkNumber: raw.spkNumber,
        layoutApproved: raw.layoutApprovedAt !== null,
        layoutApprovedAt: raw.layoutApprovedAt,
        layoutRevisionNote: raw.layoutRevisionNote,
        layoutRevisionRequestedAt: raw.layoutRevisionRequestedAt,
        customer: {
            name: raw.customer?.name ?? '',
            phone: raw.customer?.phone ?? '',
            alamat: raw.customer?.alamat ?? null,
            kota: raw.customer?.kota ?? null,
        },
        brand: {
            name: raw.brand?.name || 'RAIDWEAR',
            companyName: raw.brand?.companyName ?? '',
            logoUrl: raw.brand?.logoUrl ?? null,
            phone: raw.brand?.phone ?? null,
            email: raw.brand?.email ?? null,
            address: raw.brand?.address ?? null,
            bankName: raw.brand?.bankName ?? null,
            accountName: raw.brand?.accountName ?? null,
            accountNumber: raw.brand?.accountNumber ?? null,
        },
        payment: {
            dpDesainAmount: raw.payment?.dpDesainAmount ?? 0,
            dpDesainVerified: raw.payment?.dpDesainVerified ?? false,
            dpDesainVerifiedAt: raw.payment?.dpDesainVerifiedAt ?? null,
            dpProduksiAmount: raw.payment?.dpProduksiAmount ?? 0,
            dpProduksiVerified: raw.payment?.dpProduksiVerified ?? false,
            dpProduksiVerifiedAt: raw.payment?.dpProduksiVerifiedAt ?? null,
            pelunasanAmount: raw.payment?.pelunasanAmount ?? 0,
            pelunasanVerified: raw.payment?.pelunasanVerified ?? false,
            pelunasanVerifiedAt: raw.payment?.pelunasanVerifiedAt ?? null,
            invoice: invoice
                ? {
                      noInvoice: invoice.noInvoice,
                      tanggal: invoice.tanggal,
                      subTotal: invoice.subTotal,
                      ppnPersen: invoice.ppnPersen,
                      ppnAmount: invoice.ppnAmount,
                      total: invoice.total,
                      totalDibayar: invoice.totalDibayar,
                      sisaTagihan: invoice.sisaTagihan,
                      statusPembayaran:
                          invoice.statusPembayaran === 'SUDAH_LUNAS' ? 'SUDAH_LUNAS' : 'BELUM_LUNAS',
                      terminPembayaran: invoice.terminPembayaran,
                  }
                : null,
        },
        progress: {
            layoutCompletedAt: raw.progress?.layoutCompletedAt ?? null,
            productionReadyAt: raw.progress?.productionReadyAt ?? null,
            printCompletedAt: raw.progress?.printCompletedAt ?? null,
            sewingCompletedAt: raw.progress?.sewingCompletedAt ?? null,
            packingCompletedAt: raw.progress?.packingCompletedAt ?? null,
        },
        shipping: {
            trackingNumber: raw.shipping?.trackingNumber ?? null,
            courier: raw.shipping?.courier ?? null,
            shippedAt: raw.shipping?.shippedAt ?? null,
        },
    }
}

/** Ambil order portal berdasarkan token. Mengembalikan null bila tidak cocok. */
export async function getPortalOrderByToken(token: string): Promise<PortalOrder | null> {
    const clean = token?.trim()
    if (!clean) return null

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_portal_order', { p_token: clean })

    if (error || !data) return null

    return mapPortalOrder(data as unknown as PortalOrderRpc)
}
