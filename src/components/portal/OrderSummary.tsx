'use client'

import type { ReactNode } from 'react'
import { AlertCircle, CalendarClock, CheckCircle2, Package } from 'lucide-react'
import type { PortalOrder } from '@/lib/portal/types'
import type { PortalAction } from '@/lib/portal/stages'
import { formatDate } from '@/lib/utils/format'

interface OrderSummaryProps {
    order: PortalOrder
    action: PortalAction
    /** Tombol/aksi yang dirender saat customer perlu melakukan sesuatu. */
    actionSlot?: ReactNode
}

/**
 * Kartu ringkasan order + banner aksi yang diperlukan customer.
 */
export function OrderSummary({ order, action, actionSlot }: OrderSummaryProps) {
    return (
        <section className="space-y-4">
            <div className="surface p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                            {order.orderNumber}
                        </p>
                        <h1 className="text-h2 text-slate-900">{order.orderDescription}</h1>
                        <p className="text-sm text-slate-500">
                            Untuk {order.customer.name}
                            {order.customer.kota ? ` • ${order.customer.kota}` : ''}
                        </p>
                    </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                        <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Package className="h-3.5 w-3.5" />
                            Jumlah
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                            {order.totalQuantity} pcs
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-slate-500">Order Dibuat</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                            {formatDate(order.createdAt)}
                        </dd>
                    </div>
                    <div>
                        <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Estimasi Selesai
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                            {order.deadline ? formatDate(order.deadline) : 'Belum ditentukan'}
                        </dd>
                    </div>
                </dl>
            </div>

            <div
                className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    action.required
                        ? 'border-warning-100 bg-warning-50'
                        : 'border-success-100 bg-success-50'
                }`}
            >
                <div className="flex items-start gap-3">
                    {action.required ? (
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-700" />
                    ) : (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-700" />
                    )}
                    <div>
                        <p
                            className={`text-sm font-semibold ${
                                action.required ? 'text-warning-700' : 'text-success-700'
                            }`}
                        >
                            {action.title}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">{action.description}</p>
                    </div>
                </div>
                {action.required && actionSlot && <div className="flex-shrink-0">{actionSlot}</div>}
            </div>
        </section>
    )
}
