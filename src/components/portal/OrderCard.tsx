'use client'

import Image from 'next/image'
import { AlertCircle, ChevronRight } from 'lucide-react'
import type { PortalOrder } from '@/lib/portal/types'
import {
    CUSTOMER_STAGE_LABELS,
    getPaymentSummary,
    getPortalAction,
} from '@/lib/portal/stages'

interface OrderCardProps {
    order: PortalOrder
}

const PAYMENT_TONE: Record<string, string> = {
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info',
    success: 'badge-success',
}

/**
 * Satu kartu order di dashboard customer.
 * Menampilkan ringkasan: nomor order, deskripsi, tahap, status pembayaran,
 * dan badge "Perlu tindakan" bila customer harus melakukan sesuatu.
 * Klik kartu menautkan ke detail /lacak/[token].
 */
export function OrderCard({ order }: OrderCardProps) {
    const action = getPortalAction(order, order.layoutApproved)
    const payment = getPaymentSummary(order)
    const stageLabel =
        CUSTOMER_STAGE_LABELS[order.stage] ?? order.stage

    return (
        <a
            href={`/lacak/${order.token}`}
            className="surface group block p-4 transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500"
        >
            <div className="flex gap-3">
                {order.mockupUrl && (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <Image
                            src={order.mockupUrl}
                            alt={order.orderDescription}
                            fill
                            className="object-cover"
                            sizes="64px"
                        />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                            {order.orderNumber}
                        </p>
                        <span className="badge badge-info text-[10px]">
                            {stageLabel}
                        </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                        {order.orderDescription}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                            className={`badge text-[10px] ${
                                PAYMENT_TONE[payment.tone]
                            }`}
                        >
                            {payment.label}
                        </span>

                        {action.required && (
                            <span className="badge badge-warning text-[10px]">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Perlu tindakan
                            </span>
                        )}
                    </div>
                </div>

                <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-300 transition group-hover:text-slate-500" />
            </div>
        </a>
    )
}