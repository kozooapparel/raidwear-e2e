'use client'

import { ClipboardList, AlertCircle, Wallet } from 'lucide-react'
import type { PortalOrder } from '@/lib/portal/types'
import { getPortalAction } from '@/lib/portal/stages'
import { formatCurrency } from '@/lib/utils/format'

interface CustomerSummaryProps {
    orders: PortalOrder[]
}

/**
 * Tiga metrik ringkasan dashboard customer: jumlah order aktif, order yang
 * butuh tindakan, dan total sisa tagihan dari semua order.
 *
 * Prioritas visual mengikuti saran PRD §11.2: tiga angka dengan ikon supaya
 * customer dapat menjawab "ada order apa saja & yang mana perlu saya urus"
 * dalam sekali lihat.
 */
export function CustomerSummary({ orders }: CustomerSummaryProps) {
    const actionCount = orders.filter(
        (o) => getPortalAction(o, o.layoutApproved).required,
    ).length
    const sisaTagihan = orders.reduce(
        (sum, o) => sum + (o.payment.invoice?.sisaTagihan ?? 0),
        0,
    )

    const metrics = [
        {
            label: 'Order Aktif',
            value: String(orders.length),
            icon: ClipboardList,
            highlight: false,
        },
        {
            label: 'Perlu Tindakan',
            value: String(actionCount),
            icon: AlertCircle,
            highlight: actionCount > 0,
        },
        {
            label: 'Sisa Tagihan',
            value: formatCurrency(sisaTagihan),
            icon: Wallet,
            highlight: sisaTagihan > 0,
        },
    ]

    return (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map((m) => (
                <div key={m.label} className="surface p-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <m.icon
                            className={`h-4 w-4 ${
                                m.highlight ? 'text-warning-700' : ''
                            }`}
                        />
                        {m.label}
                    </div>
                    <p
                        className={`mt-1 text-lg font-semibold ${
                            m.highlight ? 'text-warning-700' : 'text-slate-900'
                        }`}
                    >
                        {m.value}
                    </p>
                </div>
            ))}
        </section>
    )
}