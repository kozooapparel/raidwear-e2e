import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCustomerPortalByToken } from '@/lib/portal/customer-queries'

interface PageProps {
    params: Promise<{ token: string }>
}

/** Cache agar generateMetadata dan halaman tidak memanggil RPC dua kali. */
const getCachedCustomerPortal = cache(getCustomerPortalByToken)

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Order Saya — RAIDWEAR',
        robots: { index: false, follow: false },
    }
}

/**
 * Kompatibilitas lama /portal/[token].
 * Link lama dialihkan ke identifier publik /pesanan/[phone] agar alur tetap
 * linier dan terpusat pada satu bentuk link.
 */
export default async function PortalLegacyRedirectPage({ params }: PageProps) {
    const { token } = await params
    const dashboard = await getCachedCustomerPortal(token)

    if (!dashboard || !dashboard.phoneNormalized) {
        notFound()
    }

    redirect(`/pesanan/${dashboard.phoneNormalized}`)
}