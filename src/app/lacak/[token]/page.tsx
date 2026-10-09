import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PortalClient } from '@/components/portal/PortalClient'
import { getPortalOrderByToken } from '@/lib/portal/queries'

interface PageProps {
    params: Promise<{ token: string }>
}

// Dibungkus cache agar generateMetadata dan halaman tidak memanggil RPC
// get_portal_order dua kali dalam satu request.
const getCachedPortalOrder = cache(getPortalOrderByToken)

/**
 * Metadata Open Graph agar link /lacak/[token] menampilkan pratinjau
 * (thumbnail) saat dibagikan, misalnya di WhatsApp.
 *
 * Thumbnail memakai gambar layout jika sudah ada; bila belum, pakai mockup
 * desain. Keduanya berupa URL publik Supabase yang bisa diambil pihak ketiga.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { token } = await params
    const order = await getCachedPortalOrder(token)

    if (!order) {
        return {
            title: 'Lacak Order — RAIDWEAR',
            robots: { index: false, follow: false },
        }
    }

    const thumbnail = order.layoutPreviewUrl || order.mockupUrl
    const title = `Lacak Order ${order.orderNumber} — ${order.brand.name}`
    const description = `Pantau progres pesanan ${order.orderDescription}.`

    return {
        title,
        description,
        robots: { index: false, follow: false },
        openGraph: {
            title,
            description,
            type: 'website',
            images: thumbnail ? [{ url: thumbnail }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: thumbnail ? [thumbnail] : undefined,
        },
    }
}

/**
 * Halaman portal customer.
 * Token pada URL dipetakan ke order nyata lewat RPC get_portal_order().
 */
export default async function LacakOrderPage({ params }: PageProps) {
    const { token } = await params
    const order = await getCachedPortalOrder(token)

    if (!order) {
        notFound()
    }

    return <PortalClient order={order} />
}
