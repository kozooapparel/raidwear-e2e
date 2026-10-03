import { notFound } from 'next/navigation'
import { PortalClient } from '@/components/portal/PortalClient'
import { getPortalOrderByToken } from '@/lib/portal/queries'

interface PageProps {
    params: Promise<{ token: string }>
}

export const metadata = {
    title: 'Lacak Order — RAIDWEAR',
    robots: { index: false, follow: false },
}

/**
 * Halaman portal customer.
 * Token pada URL dipetakan ke order nyata lewat RPC get_portal_order().
 */
export default async function LacakOrderPage({ params }: PageProps) {
    const { token } = await params
    const order = await getPortalOrderByToken(token)

    if (!order) {
        notFound()
    }

    return <PortalClient order={order} />
}
