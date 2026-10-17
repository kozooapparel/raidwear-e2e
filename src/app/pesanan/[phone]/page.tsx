import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PortalDashboardClient } from '@/components/portal/PortalDashboardClient'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { getCustomerPortalByPhone } from '@/lib/portal/customer-queries'
import type { PortalBrand } from '@/lib/portal/types'
import { formatWaLink } from '@/lib/utils/phone'
import { MessageCircle } from 'lucide-react'

interface PageProps {
    params: Promise<{ phone: string }>
}

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

/** Cache agar generateMetadata dan halaman tidak memanggil RPC dua kali. */
const getCachedCustomerPortal = cache(getCustomerPortalByPhone)

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { phone } = await params
    const dashboard = await getCachedCustomerPortal(phone)

    if (!dashboard) {
        return {
            title: 'Order Saya — RAIDWEAR',
            robots: { index: false, follow: false },
        }
    }

    return {
        title: `Order Saya — ${dashboard.brand?.name ?? 'RAIDWEAR'}`,
        description: `Pantau semua order ${dashboard.customer.name}.`,
        robots: { index: false, follow: false },
    }
}

/**
 * Halaman dashboard customer /pesanan/[phone].
 * Nomor WA dinormalisasi oleh RPC; bila tidak cocok Next.js merender not-found.
 * Customer berstatus 'pending' (daftar mandiri belum disetujui) melihat halaman
 * "menunggu persetujuan" alih-alih dashboard.
 */
export default async function PesananPhonePage({ params }: PageProps) {
    const { phone } = await params
    const dashboard = await getCachedCustomerPortal(phone)

    if (!dashboard) {
        notFound()
    }

    if (dashboard.status === 'pending') {
        const brand = dashboard.brand ?? FALLBACK_BRAND
        const waLink = formatWaLink(
            brand.phoneNormalized ?? brand.phone,
            'Halo, saya ingin konfirmasi akses dashboard order saya.',
        )

        return (
            <div className="min-h-dvh bg-slate-50">
                <PortalHeader brand={brand} />

                <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
                    <div className="surface flex flex-col items-center gap-4 px-6 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-700">
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-slate-900">
                            Menunggu persetujuan
                        </h1>
                        <p className="max-w-md text-sm text-slate-500">
                            Permintaan akses Anda sedang kami tinjau. Setelah
                            disetujui, Anda akan menerima tautan dashboard lewat
                            WhatsApp. Bila ingin mempercepat proses, hubungi kami
                            di bawah ini.
                        </p>
                        {waLink && (
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Hubungi Admin
                            </a>
                        )}
                    </div>
                </main>
            </div>
        )
    }

    return <PortalDashboardClient dashboard={dashboard} />
}