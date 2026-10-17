/**
 * Tipe data untuk dashboard customer (/portal/[token]).
 *
 * Dashboard menampilkan ringkasan identitas customer + daftar order aktif
 * milik customer tersebut. Berbeda dengan /lacak/[token] yang hanya menampilkan
 * satu order, dashboard mengembalikan semua order aktif customer dalam satu
 * respons agar tidak perlu query tambahan.
 */

import type { PortalBrand, PortalCustomer, PortalOrder } from './types'

/** Respons penuh RPC get_customer_portal(p_token). */
export interface PortalCustomerDashboard {
    /** Token customer 5 karakter (kini internal; navigasi publik memakai nomor WA). */
    token: string
    /** Status customer: 'pending' (menunggu persetujuan) atau 'active'. */
    status: 'pending' | 'active'
    /** Nomor WA ternormalisasi 62xxx, dipakai sebagai identitas URL /pesanan/[phone]. */
    phoneNormalized: string | null
    /** Data customer ter-mask (nama, phone, alamat). */
    customer: PortalCustomer
    /** Informasi brand dari order terbaru, atau brand default. null jika tidak ada brand sama sekali. */
    brand: PortalBrand | null
    /** Daftar order aktif (is_archived = false), diurutkan terbaru. */
    orders: PortalOrder[]
}