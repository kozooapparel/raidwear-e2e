'use client'

import { Check } from 'lucide-react'
import { STAGES_ORDER, type OrderStage } from '@/types/database'
import type { PortalOrder } from '@/lib/portal/types'
import { CUSTOMER_STAGE_LABELS, getCustomerStageIndex } from '@/lib/portal/stages'
import { formatDateShort } from '@/lib/utils/format'

interface StageProgressProps {
    order: PortalOrder
    /** Override tanggal ACC layout (mis. dari state lokal setelah customer menyetujui). */
    layoutApprovedAt?: string | null
}

/**
 * Tanggal penyelesaian tiap tahap, bila sudah tercatat di order.
 * Tahap desain tidak menyimpan timestamp sendiri, jadi dikosongkan.
 */
function getStageDates(order: PortalOrder): Record<OrderStage, string | null> {
    return {
        customer_dp_desain: order.payment.dpDesainVerifiedAt,
        proses_desain: null,
        dp_produksi: order.payment.dpProduksiVerifiedAt,
        proses_layout: order.layoutApprovedAt ?? order.progress.layoutCompletedAt,
        antrean_produksi: order.progress.productionReadyAt,
        print_press: order.progress.printCompletedAt,
        cutting_jahit: order.progress.sewingCompletedAt,
        packing: order.progress.packingCompletedAt,
        pelunasan: order.payment.pelunasanVerifiedAt,
        pengiriman: order.shipping.shippedAt,
    }
}

/**
 * Timeline progres order dalam istilah customer (satu kolom, ramah layar HP).
 * Tahap sebelum current = selesai (hijau), current = sedang berjalan (merah brand),
 * sesudahnya = menunggu (abu). Tanggal penyelesaian tampil bila sudah tercatat.
 */
export function StageProgress({ order, layoutApprovedAt }: StageProgressProps) {
    const currentStage = order.stage
    const currentIndex = getCustomerStageIndex(currentStage)
    const stageDates = getStageDates(order)
    if (layoutApprovedAt) stageDates.proses_layout = layoutApprovedAt

    return (
        <section className="surface p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Progres Order</h2>
                <span className="text-xs text-slate-500">
                    Tahap {currentIndex + 1} dari {STAGES_ORDER.length}
                </span>
            </div>

            <ol>
                {STAGES_ORDER.map((stage, index) => {
                    const done = index < currentIndex
                    const current = index === currentIndex
                    const isLast = index === STAGES_ORDER.length - 1
                    const date = stageDates[stage]

                    const circleClass = done
                        ? 'border-success-600 bg-success-600 text-white'
                        : current
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 bg-white text-slate-400'
                    const lineClass = done ? 'bg-success-500' : 'bg-slate-200'
                    const labelClass = done
                        ? 'text-slate-700'
                        : current
                            ? 'font-semibold text-slate-900'
                            : 'text-slate-400'

                    return (
                        <li key={stage} className="flex gap-3">
                            {/* Kolom penanda: lingkaran status + garis penghubung */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${circleClass}`}
                                >
                                    {done ? <Check className="h-4 w-4" /> : index + 1}
                                </div>
                                {!isLast && <div className={`mt-1 w-px flex-1 ${lineClass}`} />}
                            </div>

                            {/* Kolom keterangan tahap */}
                            <div className={isLast ? 'pb-0' : 'pb-5'}>
                                <p className={`text-sm leading-tight ${labelClass}`}>
                                    {CUSTOMER_STAGE_LABELS[stage]}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {current
                                        ? 'Sedang berjalan'
                                        : date
                                            ? formatDateShort(date)
                                            : 'Menunggu'}
                                </p>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}
