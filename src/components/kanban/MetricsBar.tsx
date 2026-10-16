'use client'

import { ReactNode } from 'react'
import { DashboardMetrics, OrderWithCustomer } from '@/types/database'
import { StatCard } from '@/components/ui/ds'

interface MetricsBarProps {
    metrics: DashboardMetrics
    /**
     * Order yang sedang tampil di papan (sudah disaring `is_archived = false`).
     * Dipakai kartu "Order Masuk" supaya angkanya ikut berubah saat order baru
     * dibuat / masuk lewat realtime, tanpa query tambahan.
     */
    orders: OrderWithCustomer[]
}

/** Kunci bulan (YYYY-MM) menurut waktu lokal admin, bukan UTC. */
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export default function MetricsBar({ metrics, orders }: MetricsBarProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    // Arus order bulan berjalan: jumlah order yang dibuat sejak tanggal 1 bulan ini.
    const now = new Date()
    const currentMonth = monthKey(now)
    const ordersThisMonth = orders.filter(
        (order) => order.created_at && monthKey(new Date(order.created_at)) === currentMonth
    ).length
    const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)

    const metricsData: {
        label: string
        value: ReactNode
        icon: ReactNode
        tone: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'
        helper?: string
    }[] = [
        {
            label: 'Total Orders',
            value: metrics.total_active_orders,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
            ),
            tone: 'info',
        },
        {
            label: 'Belum Lunas',
            value: metrics.total_unpaid_orders,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            tone: 'warning',
        },
        {
            label: 'Total Piutang',
            value: formatCurrency(metrics.total_receivables),
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
            ),
            tone: 'success',
        },
        {
            // Pengganti kartu "Bottleneck": arus order bulan berjalan dari
            // orders.created_at — bukan ambang hari di stage yang hampir selalu menyala.
            label: 'Order Masuk',
            value: ordersThisMonth,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-2.162c0-.224-.034-.447-.1-.661l-2.41-7.839a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.012-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
                </svg>
            ),
            tone: 'default',
            helper: `Bulan ini · ${monthLabel}`,
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[8px] md:gap-[12px]">
            {metricsData.map((metric) => (
                <StatCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    icon={metric.icon}
                    tone={metric.tone}
                    helper={metric.helper}
                />
            ))}
        </div>
    )
}
