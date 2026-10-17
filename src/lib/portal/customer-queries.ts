/**
 * Lapisan baca dashboard customer (/pesanan/[phone]).
 *
 * Mengakses RPC SECURITY DEFINER get_customer_portal_by_phone(p_phone) yang
 * mengembalikan seluruh data customer, brand, dan order aktif dalam satu
 * panggilan. Pemetaan order me-reuse mapPortalOrder agar bentuk data order
 * identik dengan halaman /lacak/[token].
 */

import { createClient } from '@/lib/supabase/server'
import type { PortalCustomerDashboard } from './customer-types'
import type { PortalOrderRpc } from './queries'
import { mapPortalOrder } from './queries'

/** Bentuk data mentah dari RPC get_customer_portal* sebelum pemetaan. */
interface PortalCustomerDashboardRpc {
    token: string
    status: 'pending' | 'active'
    phone_normalized: string | null
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
        phone_normalized: string | null
        email: string | null
        address: string | null
        bankName: string | null
        accountName: string | null
        accountNumber: string | null
    } | null
    orders: PortalOrderRpc[]
}

/** Petakan hasil RPC mentah menjadi PortalCustomerDashboard. */
function mapCustomerDashboard(raw: PortalCustomerDashboardRpc): PortalCustomerDashboard {
    return {
        token: raw.token,
        status: raw.status,
        phoneNormalized: raw.phone_normalized ?? null,
        customer: {
            name: raw.customer?.name ?? '',
            phone: raw.customer?.phone ?? '',
            alamat: raw.customer?.alamat ?? null,
            kota: raw.customer?.kota ?? null,
        },
        brand: raw.brand
            ? {
                  name: raw.brand.name || 'RAIDWEAR',
                  companyName: raw.brand.companyName ?? '',
                  logoUrl: raw.brand.logoUrl ?? null,
                  phone: raw.brand.phone ?? null,
                  phoneNormalized: raw.brand.phone_normalized ?? null,
                  email: raw.brand.email ?? null,
                  address: raw.brand.address ?? null,
                  bankName: raw.brand.bankName ?? null,
                  accountName: raw.brand.accountName ?? null,
                  accountNumber: raw.brand.accountNumber ?? null,
              }
            : null,
        orders: Array.isArray(raw.orders)
            ? raw.orders.map(mapPortalOrder)
            : [],
    }
}

/**
 * Ambil dashboard customer berdasarkan nomor WA (identifier publik).
 * Mengembalikan null bila nomor kosong, tidak dikenal, atau error RPC.
 */
export async function getCustomerPortalByPhone(
    phone: string,
): Promise<PortalCustomerDashboard | null> {
    const clean = phone?.trim()
    if (!clean) return null

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_customer_portal_by_phone', {
        p_phone: clean,
    })

    if (error || !data) return null

    return mapCustomerDashboard(data as unknown as PortalCustomerDashboardRpc)
}

/**
 * Ambil dashboard customer berdasarkan token portal (kompatibilitas lama).
 * Masih dipakai untuk redirect /portal/[token] ke /pesanan/[phone].
 */
export async function getCustomerPortalByToken(
    token: string,
): Promise<PortalCustomerDashboard | null> {
    const clean = token?.trim()
    if (!clean) return null

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_customer_portal', {
        p_token: clean,
    })

    if (error || !data) return null

    return mapCustomerDashboard(data as unknown as PortalCustomerDashboardRpc)
}
