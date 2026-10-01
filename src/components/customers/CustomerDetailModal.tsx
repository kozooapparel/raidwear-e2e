'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/types/database'

interface CustomerWithStats {
    id: string
    name: string
    phone: string
    created_at: string
    order_count: number
    total_quantity: number
    total_revenue: number
}

interface Order {
    id: string
    order_description: string | null
    mockup_url: string | null
    total_quantity: number
    stage: string
    dp_desain_amount: number
    dp_desain_verified: boolean
    dp_produksi_amount: number
    dp_produksi_verified: boolean
    pelunasan_amount: number
    pelunasan_verified: boolean
    created_at: string
    deadline: string | null
}

interface CustomerDetailModalProps {
    customer: CustomerWithStats | null
    isOpen: boolean
    onClose: () => void
}

export default function CustomerDetailModal({ customer, isOpen, onClose }: CustomerDetailModalProps) {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(false)

    const supabase = useMemo(() => createClient(), [])

    // Ambil order terbaru customer saat modal dibuka
    useEffect(() => {
        if (!customer || !isOpen) return
        let cancelled = false

        const load = async () => {
            // setState dijalankan setelah await agar tidak memicu render berantai di body effect
            await Promise.resolve()
            if (cancelled) return
            setLoading(true)
            const { data } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false })
                .limit(5)
            if (cancelled) return
            setOrders(data || [])
            setLoading(false)
        }

        load()
        return () => { cancelled = true }
    }, [customer, isOpen, supabase])

    // Tutup dengan Escape saat modal terbuka
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    const getCustomerTier = (orderCount: number) => {
        if (orderCount >= 10) return { label: 'VIP', badge: 'badge-warning' }
        if (orderCount >= 5) return { label: 'Loyal', badge: 'badge-brand' }
        if (orderCount >= 2) return { label: 'Repeat', badge: 'badge-info' }
        return { label: 'New', badge: 'badge-success' }
    }

    const getPaymentStatus = (order: Order) => {
        if (order.pelunasan_verified) return { label: 'Lunas', badge: 'badge-success' }
        if (order.dp_produksi_verified) return { label: 'DP 50%', badge: 'badge-warning' }
        if (order.dp_desain_verified) return { label: 'Deposit Desain', badge: 'badge-info' }
        return { label: 'Belum Bayar', badge: 'badge-danger' }
    }

    if (!isOpen || !customer) return null

    const tier = getCustomerTier(customer.order_count)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Detail customer ${customer.name}`}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn"
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-brand-gradient flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                                    <span className={`badge ${tier.badge}`}>{tier.label}</span>
                                </div>
                                <a
                                    href={`tel:${customer.phone}`}
                                    className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                    </svg>
                                    {customer.phone}
                                </a>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Customer sejak {formatDate(customer.created_at)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Tutup"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50">
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="text-xs text-slate-500">Total Order</p>
                        <p className="text-xl font-bold text-slate-900">{customer.order_count}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="text-xs text-slate-500">Total Qty</p>
                        <p className="text-xl font-bold text-slate-900">{customer.total_quantity} pcs</p>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl bg-white border border-slate-200">
                        <p className="text-xs text-slate-500">Total Revenue</p>
                        <p className="text-xl font-bold text-emerald-600">{formatCurrency(customer.total_revenue)}</p>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        Order Terbaru
                        {orders.length > 0 && <span className="badge badge-neutral">{orders.length}</span>}
                    </h3>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : orders.length > 0 ? (
                        <div className="space-y-2">
                            {orders.map((order) => {
                                const paymentStatus = getPaymentStatus(order)
                                return (
                                    <div
                                        key={order.id}
                                        className="p-3 rounded-xl bg-slate-50 border border-slate-200"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Thumbnail */}
                                            {order.mockup_url ? (
                                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                                    <Image src={order.mockup_url} alt="Mockup" fill className="object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Order Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="badge badge-neutral">
                                                        {STAGE_LABELS[order.stage as keyof typeof STAGE_LABELS]}
                                                    </span>
                                                    <span className={`badge ${paymentStatus.badge}`}>
                                                        {paymentStatus.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-700 mt-1 truncate">
                                                    {order.order_description || 'Tidak ada deskripsi'}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {order.total_quantity} pcs • {formatDate(order.created_at)}
                                                </p>
                                            </div>

                                            {/* Price */}
                                            <p className="text-sm font-semibold text-emerald-600 flex-shrink-0">
                                                {formatCurrency(order.dp_desain_amount + order.dp_produksi_amount + order.pelunasan_amount)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-slate-400 py-6 text-sm">Belum ada order</p>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-white flex gap-2">
                    <a
                        href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                    </a>
                    <Link
                        href={`/customer/${customer.id}`}
                        className="btn btn-secondary flex-1"
                    >
                        Lihat Detail Lengkap
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    )
}
