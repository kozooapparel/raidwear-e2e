'use client'

import { useState } from 'react'
import { OrderWithCustomer } from '@/types/database'
import { getOrderStageReadiness } from '@/lib/order-stage-readiness'
import Image from 'next/image'

interface OrderCardProps {
    order: OrderWithCustomer
    isBottleneck: boolean
    onClick: () => void
}

export default function OrderCard({ order, isBottleneck, onClick }: OrderCardProps) {
    const [showImagePreview, setShowImagePreview] = useState(false)

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

    const getPaymentStatus = () => {
        if (order.pelunasan_verified) return { label: 'Lunas', color: 'bg-emerald-100 text-emerald-700', priority: 'low' }
        if (order.dp_produksi_verified) return { label: 'DP 50%', color: 'bg-amber-100 text-amber-700', priority: 'medium' }
        if (order.dp_desain_verified) return { label: 'Deposit Desain', color: 'bg-blue-100 text-blue-700', priority: 'medium' }
        return { label: 'Belum Bayar', color: 'bg-red-100 text-red-700', priority: 'urgent' }
    }

    const getPriorityBadge = () => {
        const daysInStage = getDaysInStage()
        if (isBottleneck || daysInStage >= 5) return { label: 'URGENT', color: 'bg-red-500 text-white' }
        if (daysInStage >= 3) return { label: 'MODERATE', color: 'bg-amber-500 text-white' }
        return null
    }

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent card onClick
        setShowImagePreview(true)
    }

    const paymentStatus = getPaymentStatus()
    const priorityBadge = getPriorityBadge()
    const daysInStage = getDaysInStage()
    const stageReadiness = getOrderStageReadiness(order)

    return (
        <>
            <div
                onClick={onClick}
                className={`group relative p-3 rounded-xl bg-white border shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg overflow-hidden ${isBottleneck
                    ? 'border-red-300 shadow-md shadow-red-100'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
            >
                {/* Left Border Color Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stageReadiness.isReady
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                    }`} />

                {/* Readiness Badge */}
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide mb-1.5 ${stageReadiness.isReady
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    : 'bg-red-500 text-white shadow-sm shadow-red-200'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${stageReadiness.isReady ? 'bg-white/80 ring-1 ring-white/50' : 'bg-white/80 ring-1 ring-white/50'
                        }`}></span>
                    {stageReadiness.isReady ? 'SIAP PINDAH' : 'PERLU ACTION'}
                </div>

                {/* Priority Badge - only show if urgent/moderate */}
                {priorityBadge && (
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-2 ml-1 ${priorityBadge.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
                        {priorityBadge.label}
                    </div>
                )}

                {/* Category Tag + Brand Badge */}
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {order.stage === 'cutting_jahit' ? 'Produksi' :
                            order.stage === 'print_press' ? 'Finishing' :
                                order.stage === 'proses_desain' ? 'Design' :
                                    'Order'}
                    </span>
                    {/* Brand Badge */}
                    {order.brand && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                            {order.brand.logo_url ? (
                                <img
                                    src={order.brand.logo_url}
                                    alt={order.brand.name}
                                    className="w-3 h-3 object-contain"
                                />
                            ) : null}
                            {order.brand.code}
                        </span>
                    )}
                </div>

                {/* Customer Name - Title */}
                <h4 className="font-semibold text-slate-900 text-sm leading-tight mb-1 group-hover:text-brand-600 transition-colors">
                    {order.customer?.name || 'Unknown'}
                </h4>

                {/* Order Description */}
                <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-snug">
                    {order.order_description || `Order ${order.total_quantity} pcs jersey`}
                </p>

                {/* Progress Bar */}
                <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Progress</span>
                        <span>{Math.min(daysInStage * 10, 100)}%</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isBottleneck ? 'bg-red-500' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min(daysInStage * 10, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between">
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-slate-400 text-xs">
                        {/* Quantity */}
                        <span className="flex items-center gap-1" title="Quantity">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {order.total_quantity}
                        </span>

                        {/* Deadline */}
                        {order.deadline && (
                            <span className="flex items-center gap-1" title="Deadline">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(order.deadline)}
                            </span>
                        )}
                    </div>

                    {/* Payment Badge */}
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${paymentStatus.color}`}>
                        {paymentStatus.label}
                    </span>
                </div>

                {/* Thumbnail Logic */}
                {/* 1. Proses Desain: Show Mockup */}
                {order.stage === 'proses_desain' && order.mockup_url && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        <div
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowImagePreview(true)
                            }}
                            className="relative w-full h-16 rounded-lg overflow-hidden bg-slate-50 cursor-zoom-in hover:ring-2 hover:ring-brand-400 transition-all"
                        >
                            <Image
                                src={order.mockup_url}
                                alt="Mockup"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                )}

                {/* 2. Layout Link: Show from proses_layout onwards */}
                {order.layout_url && ['proses_layout', 'antrean_produksi', 'print_press', 'cutting_jahit', 'packing', 'pelunasan', 'pengiriman'].includes(order.stage) && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        <a
                            href={order.layout_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors border border-brand-200"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Buka Layout
                        </a>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {showImagePreview && order.mockup_url && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowImagePreview(false)}
                >
                    {/* Close button */}
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        onClick={() => setShowImagePreview(false)}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Customer name label */}
                    <div className="absolute top-4 left-4 text-white">
                        <h3 className="text-lg font-semibold">{order.customer?.name}</h3>
                        <p className="text-sm text-white/70">{order.order_description}</p>
                    </div>

                    {/* Large Image */}
                    <div
                        className="relative max-w-4xl max-h-[80vh] w-full h-full m-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={
                                (order.stage === 'proses_layout' && order.layout_url)
                                    ? order.layout_url
                                    : order.mockup_url || ''
                            }
                            alt="Mockup Preview"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </>
    )
}
