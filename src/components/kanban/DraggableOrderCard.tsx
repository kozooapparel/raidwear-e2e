'use client'

import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OrderWithCustomer } from '@/types/database'
import { getOrderStageReadiness } from '@/lib/order-stage-readiness'
import Image from 'next/image'

interface DraggableOrderCardProps {
    order: OrderWithCustomer
    isBottleneck: boolean
    onClick: () => void
}

export default function DraggableOrderCard({ order, isBottleneck, onClick }: DraggableOrderCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: order.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    }

    const formatDate = (date: string | null) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
        })
    }

    const getDaysInStage = () => {
        const stageEnteredAt = new Date(order.stage_entered_at)
        const now = new Date()
        return Math.floor((now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Format order age from created_at
    const formatOrderAge = (createdAt: string): string => {
        const created = new Date(createdAt)
        const now = new Date()
        const diffMs = now.getTime() - created.getTime()

        const minutes = Math.floor(diffMs / (1000 * 60))
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const weeks = Math.floor(days / 7)

        if (weeks >= 1) {
            const remainingDays = days % 7
            return remainingDays > 0 ? `${weeks} minggu ${remainingDays} hari` : `${weeks} minggu`
        }
        if (days >= 1) {
            const remainingHours = hours % 24
            return remainingHours > 0 ? `${days} hari ${remainingHours} jam` : `${days} hari`
        }
        if (hours >= 1) {
            const remainingMinutes = minutes % 60
            return remainingMinutes > 0 ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`
        }
        return `${minutes} menit`
    }

    // State for order age timer
    const [orderAge, setOrderAge] = useState(() => formatOrderAge(order.created_at))
    const [isOverOneDay, setIsOverOneDay] = useState(() => {
        const created = new Date(order.created_at)
        const now = new Date()
        const diffMs = now.getTime() - created.getTime()
        return diffMs >= 24 * 60 * 60 * 1000
    })

    // Update timer every hour
    useEffect(() => {
        const updateAge = () => {
            setOrderAge(formatOrderAge(order.created_at))
            const created = new Date(order.created_at)
            const now = new Date()
            const diffMs = now.getTime() - created.getTime()
            setIsOverOneDay(diffMs >= 24 * 60 * 60 * 1000)
        }

        // Initial update
        updateAge()

        // Update every minute (60000ms)
        const interval = setInterval(updateAge, 60000)

        return () => clearInterval(interval)
    }, [order.created_at])

    const stageStatus = getOrderStageReadiness(order)
    const daysInStage = getDaysInStage()
    const stageReadiness = stageStatus

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => {
                if (!isDragging) {
                    onClick()
                }
            }}
            className={`group transition-shadow ${isDragging ? 'z-50' : ''}`}
        >
            {/* Satu kartu putih: tepi saja, tanpa bayangan ganda */}
            <div className={`rounded-lg border bg-white ${isDragging
                ? 'border-brand-400 ring-2 ring-brand-200'
                : isBottleneck
                    ? 'border-red-300 hover:border-red-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>

                {/* Baris status: titik + label (teks tetap sama) */}
                <div className="flex items-center gap-[6px] px-[12px] pt-[10px]">
                    <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${stageReadiness.isReady ? 'bg-emerald-500' : 'bg-red-500'
                        }`} aria-hidden="true" />
                    <span className={`truncate text-sm font-semibold uppercase tracking-wide ${stageReadiness.isReady ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                        {stageReadiness.isReady ? 'SIAP PINDAH' : 'PERLU ACTION'}
                    </span>

                    {/* Bottleneck Days Badge */}
                    {isBottleneck && (
                        <span className="ml-auto inline-flex h-[20px] shrink-0 items-center rounded-full border border-red-200 bg-red-50 px-[6px] text-sm font-semibold text-red-700 text-mono">
                            {daysInStage}d
                        </span>
                    )}
                </div>

                {/* Card Content */}
                <div className="p-[12px]">
                    {/* Thumbnail Logic */}
                    {/* Tampilkan desain (mockup) di semua stage bila sudah ada.
                        Placeholder "No Mockup" hanya muncul saat stage proses_desain. */}
                    {(order.mockup_url || order.stage === 'proses_desain') && (
                        <div className="relative mb-[8px]">
                            {order.mockup_url ? (
                                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-slate-100">
                                    <Image src={order.mockup_url} alt="Desain" fill sizes="(max-width: 768px) 100vw, 256px" className="object-cover pointer-events-none" />
                                </div>
                            ) : (
                                <div className="w-full aspect-video rounded-md bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                                    <span className="text-sm text-slate-500">No Mockup</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Customer Name with Brand Logo */}
                    <div className="flex items-center gap-[6px] mb-[6px]">
                        {order.brand?.logo_url && (
                            <div className="w-4 h-4 relative shrink-0">
                                <Image
                                    src={order.brand.logo_url}
                                    alt={order.brand.name || 'Brand'}
                                    fill
                                    className="object-contain rounded-sm"
                                />
                            </div>
                        )}
                        <h4 className="min-w-0 truncate text-base font-semibold leading-tight text-slate-900">
                            {order.customer?.name || 'Unknown'}
                        </h4>
                    </div>

                    {/* Nama PO - Show from proses_layout stage onwards if SPK is filled */}
                    {order.nama_po && ['proses_layout', 'dp_produksi', 'antrean_produksi', 'print_press', 'cutting_jahit', 'packing', 'pelunasan', 'pengiriman'].includes(order.stage) && (
                        <p className="text-sm text-slate-500 truncate mb-[6px]">
                            PO: <span className="text-slate-700 font-semibold">{order.nama_po}</span>
                        </p>
                    )}

                    {/* Order Details Row */}
                    <div className="flex items-center justify-between gap-[8px]">
                        <div className="flex items-center gap-[8px] text-sm font-medium text-slate-500 min-w-0">
                            <span className="inline-flex items-center gap-[4px]">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className="text-mono">{order.total_quantity}pcs</span>
                            </span>
                            {order.deadline && (
                                <span className="inline-flex items-center gap-[4px]">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-mono">{formatDate(order.deadline)}</span>
                                </span>
                            )}
                        </div>

                        {/* Stage Status Badge - Bottom Right */}
                        <span className={`inline-flex h-[20px] shrink-0 items-center gap-[5px] rounded-full border px-[6px] text-sm font-semibold ${stageStatus.isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            <span className={`h-[6px] w-[6px] rounded-full ${stageStatus.isReady ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden="true" />
                            {stageStatus.label}
                        </span>
                    </div>

                    {/* Admin Badge with Order Age Timer */}
                    {order.creator?.full_name && (
                        <div className="mt-[8px] pt-[8px] border-t border-slate-100 flex items-center gap-[6px]">
                            <span className="inline-flex items-center gap-[4px] text-sm font-medium text-slate-500 min-w-0">
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="truncate">{order.creator.full_name}</span>
                            </span>
                            <span className={`ml-auto inline-flex items-center gap-[4px] text-sm font-medium whitespace-nowrap shrink-0 ${isOverOneDay
                                ? 'text-red-600'
                                : 'text-slate-500'
                                }`}>
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-mono">{orderAge}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
