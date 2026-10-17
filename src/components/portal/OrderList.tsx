'use client'

import { useMemo } from 'react'
import { MessageCircle, Mail, PackageOpen } from 'lucide-react'
import type { PortalOrder, PortalBrand } from '@/lib/portal/types'
import { getPortalAction } from '@/lib/portal/stages'
import { formatWaLink } from '@/lib/utils/phone'
import { OrderCard } from './OrderCard'

interface OrderListProps {
    orders: PortalOrder[]
    brand: PortalBrand
}

/**
 * Daftar kartu order. Mengurutkan order yang butuh tindakan ke atas, lalu
 * order terbaru. Menampilkan state kosong bila tidak ada order aktif.
 */
export function OrderList({ orders, brand }: OrderListProps) {
    const sorted = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aReq = getPortalAction(a, a.layoutApproved).required
            const bReq = getPortalAction(b, b.layoutApproved).required
            if (aReq !== bReq) return aReq ? -1 : 1
            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
        })
    }, [orders])

    const waLink = formatWaLink(
        brand.phoneNormalized ?? brand.phone,
        'Halo, saya ingin menanyakan order saya.',
    )

    return (
        <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Daftar Order
            </h2>

            {sorted.length === 0 ? (
                <div className="surface flex flex-col items-center gap-3 px-5 py-10 text-center">
                    <PackageOpen className="h-10 w-10 text-slate-300" />
                    <div>
                        <p className="text-sm font-semibold text-slate-700">
                            Belum ada order aktif
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Order Anda akan muncul di sini setelah diproses.
                            Bila ada pertanyaan, hubungi kami.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {waLink && (
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary btn-sm"
                            >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                            </a>
                        )}
                        {brand.email && (
                            <a
                                href={`mailto:${brand.email}`}
                                className="btn-secondary btn-sm"
                            >
                                <Mail className="h-4 w-4" />
                                Email
                            </a>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">{sorted.map((o) => <OrderCard key={o.token} order={o} />)}</div>
            )}
        </section>
    )
}