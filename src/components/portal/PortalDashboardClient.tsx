'use client'

import type { PortalCustomerDashboard } from '@/lib/portal/customer-types'
import type { PortalBrand } from '@/lib/portal/types'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { CustomerSummary } from '@/components/portal/CustomerSummary'
import { OrderList } from '@/components/portal/OrderList'

/** Fallback brand bila RPC mengembalikan brand null. */
const FALLBACK_BRAND: PortalBrand = {
    name: 'RAIDWEAR',
    companyName: '',
    logoUrl: null,
    phone: null,
    phoneNormalized: null,
    email: null,
    address: null,
    bankName: null,
    accountName: null,
    accountNumber: null,
}

interface PortalDashboardClientProps {
    dashboard: PortalCustomerDashboard
}

/**
 * Shell dashboard customer /pesanan/[phone].
 *
 * Menampilkan header brand, sapaan customer, ringkasan 3 metrik, dan daftar
 * order. Tidak menggunakan DashboardLayout — namespace, layout, dan auth
 * sepenuhnya terpisah dari dashboard admin.
 */
export function PortalDashboardClient({
    dashboard,
}: PortalDashboardClientProps) {
    const brand = dashboard.brand ?? FALLBACK_BRAND

    return (
        <div className="min-h-dvh bg-slate-50">
            <PortalHeader brand={brand} />

            <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
                <section>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Order Saya
                    </p>
                    <h1 className="text-h2 text-slate-900">
                        Halo, {dashboard.customer.name}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Berikut ringkasan semua order Anda.
                    </p>
                </section>

                <CustomerSummary orders={dashboard.orders} />
                <OrderList orders={dashboard.orders} brand={brand} />

                <footer className="pb-4 pt-2 text-center text-xs text-slate-400">
                    {brand.companyName || brand.name} &bull;{' '}
                    {dashboard.customer.phone}
                </footer>
            </main>
        </div>
    )
}