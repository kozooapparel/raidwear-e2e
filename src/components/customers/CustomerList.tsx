'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import AddCustomerModal from './AddCustomerModal'
import CustomerDetailModal from './CustomerDetailModal'
import EditCustomerModal from './EditCustomerModal'
import { deleteCustomer } from '@/lib/actions/customers'
import { PageHeader, EmptyState, DefaultEmptyIcon, StatCard } from '@/components/ui/ds'
import { SearchBar, SelectBox, ConfirmDialog, FilterPills } from '@/components/ui'
import type { SelectOption, FilterPillOption } from '@/components/ui'

interface CustomerWithStats {
    id: string
    name: string
    phone: string
    created_at: string
    order_count: number
    total_quantity: number
    total_revenue: number
}

interface CustomerListProps {
    customers: CustomerWithStats[]
}

// Icons
const Icon = {
    Plus: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    ArrowLeft: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
    ),
    Phone: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
    ),
    ShoppingBag: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    Eye: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Pencil: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
    ),
    Trash: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
    ),
    Whatsapp: (p: { className?: string }) => (
        <svg className={p.className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    ),
    X: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
}

type TierTone = 'default' | 'info' | 'success' | 'warning' | 'brand'

interface TierInfo {
    label: string
    tone: TierTone
}

type TierKey = 'vip' | 'loyal' | 'repeat' | 'new'
type TierFilter = 'all' | TierKey
type SortKey = 'name' | 'orders' | 'revenue' | 'recent'

/** Ambang batas tier dipakai bersama oleh filter, pill, dan badge */
const tierOf = (orderCount: number): TierKey => {
    if (orderCount >= 10) return 'vip'
    if (orderCount >= 5) return 'loyal'
    if (orderCount >= 2) return 'repeat'
    return 'new'
}

const TIER_META: Record<TierKey, TierInfo> = {
    vip: { label: 'VIP', tone: 'warning' },
    loyal: { label: 'Loyal', tone: 'brand' },
    repeat: { label: 'Repeat', tone: 'info' },
    new: { label: 'New', tone: 'success' },
}

const getCustomerTier = (orderCount: number): TierInfo => TIER_META[tierOf(orderCount)]

const toneToBadge: Record<TierTone, string> = {
    default: 'badge-neutral',
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    brand: 'badge-brand',
}

const SORT_OPTIONS: SelectOption[] = [
    { value: 'name', label: 'Nama (A-Z)' },
    { value: 'orders', label: 'Order terbanyak' },
    { value: 'revenue', label: 'Revenue terbesar' },
    { value: 'recent', label: 'Terbaru' },
]

const TIER_FILTERS: FilterPillOption<TierFilter>[] = [
    { value: 'all', label: 'Semua', tone: 'neutral' },
    { value: 'vip', label: 'VIP', tone: 'warning' },
    { value: 'loyal', label: 'Loyal', tone: 'brand' },
    { value: 'repeat', label: 'Repeat', tone: 'info' },
    { value: 'new', label: 'New', tone: 'success' },
]

export default function CustomerList({ customers: initialCustomers }: CustomerListProps) {
    const [customers, setCustomers] = useState<CustomerWithStats[]>(initialCustomers)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null)
    const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    // Toolbar daftar: pencarian, filter tier, pengurutan
    const [searchQuery, setSearchQuery] = useState('')
    const [tierFilter, setTierFilter] = useState<TierFilter>('all')
    const [sortBy, setSortBy] = useState<SortKey>('name')
    // Bump key untuk mereset SearchBar (komponen uncontrolled)
    const [searchKey, setSearchKey] = useState(0)

    // Sync with server data when page re-renders (e.g. first load)
    useEffect(() => {
        setCustomers(initialCustomers)
    }, [initialCustomers])

    const upsertCustomer = (nextCustomer: CustomerWithStats) => {
        setCustomers((current) => {
            const idx = current.findIndex((c) => c.id === nextCustomer.id)
            if (idx === -1) return [nextCustomer, ...current]
            const updated = [...current]
            updated[idx] = nextCustomer
            return updated
        })
    }

    const handleCustomerCreated = (customer: CustomerWithStats) => {
        upsertCustomer(customer)
    }

    const handleCustomerUpdated = (customer: CustomerWithStats) => {
        upsertCustomer(customer)
        setEditingCustomer(null)
    }

    const handleCustomerDeleted = (customerId: string) => {
        setCustomers((current) => current.filter((c) => c.id !== customerId))
    }

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value)
    }

    // Handle delete customer
    const handleDeleteCustomer = async (customerId: string) => {
        setDeleting(true)
        try {
            const result = await deleteCustomer(customerId)
            if (!result.success) {
                toast.error(result.message)
                return
            }
            toast.success(result.message)
            setDeleteConfirmId(null)
            handleCustomerDeleted(customerId)
        } catch (err) {
            console.error('Delete error:', err)
            toast.error('Gagal menghapus customer')
        } finally {
            setDeleting(false)
        }
    }

    const totalCustomers = customers.length
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_revenue, 0)

    // Jumlah per tier, dipakai oleh kartu statistik dan pill filter
    const tierCounts = useMemo(() => {
        const counts: Record<TierFilter, number> = { all: customers.length, vip: 0, loyal: 0, repeat: 0, new: 0 }
        customers.forEach((c) => { counts[tierOf(c.order_count)] += 1 })
        return counts
    }, [customers])

    const tierFilterOptions = useMemo(
        () => TIER_FILTERS.map((f) => ({ ...f, count: tierCounts[f.value] })),
        [tierCounts]
    )

    // Daftar yang tampil setelah difilter & diurutkan
    const visibleCustomers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        const qDigits = q.replace(/\D/g, '')
        const list = customers.filter((c) => {
            if (tierFilter !== 'all' && tierOf(c.order_count) !== tierFilter) return false
            if (!q) return true
            if (c.name.toLowerCase().includes(q)) return true
            return qDigits.length > 0 && c.phone.replace(/\D/g, '').includes(qDigits)
        })
        return [...list].sort((a, b) => {
            switch (sortBy) {
                case 'orders': return b.order_count - a.order_count
                case 'revenue': return b.total_revenue - a.total_revenue
                case 'recent': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                default: return a.name.localeCompare(b.name, 'id')
            }
        })
    }, [customers, searchQuery, tierFilter, sortBy])

    const hasActiveFilter = searchQuery.trim().length > 0 || tierFilter !== 'all'

    const resetFilters = () => {
        setSearchQuery('')
        setTierFilter('all')
        setSearchKey((k) => k + 1)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <Icon.ArrowLeft className="w-4 h-4" />
                    Kembali ke Dashboard
                </Link>

                <PageHeader
                    title="Daftar Customer"
                    description="Kelola data customer dan lihat ringkasan order"
                    actions={
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                        >
                            <Icon.Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Tambah Customer</span>
                            <span className="sm:hidden">Tambah</span>
                        </button>
                    }
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    label="Total Customer"
                    value={totalCustomers}
                    tone="default"
                />
                <StatCard
                    label="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    tone="success"
                />
                <StatCard
                    label="VIP Customers"
                    value={tierCounts.vip}
                    tone="warning"
                />
                <StatCard
                    label="Repeat Customers"
                    value={tierCounts.repeat}
                    tone="info"
                />
            </div>

            {/* Toolbar: pencarian, filter tier, pengurutan */}
            {customers.length > 0 && (
                <div className="surface space-y-3 p-3 md:p-4">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="min-w-0 flex-1">
                            <SearchBar
                                key={searchKey}
                                onSearch={setSearchQuery}
                                placeholder="Cari nama atau no. HP customer..."
                            />
                        </div>
                        <div className="w-full shrink-0 md:w-56">
                            <SelectBox
                                options={SORT_OPTIONS}
                                value={sortBy}
                                onChange={(value) => setSortBy(value as SortKey)}
                                searchable={false}
                                placeholder="Urutkan"
                                ariaLabel="Urutkan customer"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterPills
                            options={tierFilterOptions}
                            value={tierFilter}
                            onChange={setTierFilter}
                            size="sm"
                            ariaLabel="Filter tier customer"
                        />
                        <span className="ml-auto text-xs text-slate-500">
                            Menampilkan <span className="font-semibold text-slate-700">{visibleCustomers.length}</span> dari {customers.length}
                        </span>
                    </div>
                </div>
            )}

            {/* Daftar Customer - Responsif */}
            {customers.length === 0 ? (
                <div className="surface">
                    <EmptyState
                        icon={<DefaultEmptyIcon />}
                        title="Belum ada customer"
                        description="Tambahkan customer pertama Anda untuk mulai mengelola data"
                        action={
                            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                                <Icon.Plus className="w-4 h-4" />
                                Tambah Customer
                            </button>
                        }
                    />
                </div>
            ) : visibleCustomers.length === 0 ? (
                <div className="surface">
                    <EmptyState
                        icon={<DefaultEmptyIcon />}
                        title="Tidak ada customer yang cocok"
                        description="Coba ubah kata kunci pencarian atau filter tier yang dipilih."
                        action={
                            hasActiveFilter ? (
                                <button onClick={resetFilters} className="btn-secondary">
                                    Reset Filter
                                </button>
                            ) : undefined
                        }
                    />
                </div>
            ) : isMobile ? (
                // Mobile: Card Layout
                <div className="space-y-3">
                    {visibleCustomers.map((customer) => {
                        const tier = getCustomerTier(customer.order_count)
                        return (
                            <div
                                key={customer.id}
                                className="surface surface-hover p-4"
                            >
                                {/* Header: Avatar, Name, Tier Badge */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-11 h-11 rounded-full bg-brand-gradient flex items-center justify-center text-base font-bold text-white flex-shrink-0">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => setSelectedCustomer(customer)}
                                            className="font-semibold text-slate-900 hover:text-brand-600 transition-colors block truncate text-left"
                                        >
                                            {customer.name}
                                        </button>
                                        <span className={`badge ${toneToBadge[tier.tone]} mt-1.5`}>
                                            {tier.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Icon.Phone className="w-4 h-4 text-slate-400" />
                                        {customer.phone}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Icon.ShoppingBag className="w-4 h-4 text-slate-400" />
                                        {customer.order_count} orders
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                                        <span className="text-mono text-slate-900 font-medium">{customer.total_quantity} pcs</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-mono font-semibold text-emerald-600">{formatCurrency(customer.total_revenue)}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => setSelectedCustomer(customer)}
                                        className="flex-1 btn-secondary"
                                    >
                                        Lihat Detail
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(customer.id)}
                                        className="btn-icon btn-ghost text-red-600 hover:bg-red-50"
                                        title="Hapus"
                                        aria-label="Hapus customer"
                                    >
                                        <Icon.Trash className="w-4 h-4" />
                                    </button>
                                    <a
                                        href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-icon bg-emerald-500 hover:bg-emerald-600 text-white"
                                        title="Chat WhatsApp"
                                        aria-label="Chat WhatsApp"
                                    >
                                        <Icon.Whatsapp className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                // Desktop: Table Layout
                <div className="surface overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Customer</th>
                                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No. HP</th>
                                    <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Orders</th>
                                    <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Qty</th>
                                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Revenue</th>
                                    <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Status</th>
                                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleCustomers.map((customer) => {
                                    const tier = getCustomerTier(customer.order_count)
                                    return (
                                        <tr
                                            key={customer.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <button onClick={() => setSelectedCustomer(customer)} className="flex items-center gap-3 group text-left">
                                                    <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-bold text-white">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                                                        {customer.name}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-mono text-sm">{customer.phone}</td>
                                            <td className="px-4 py-3 text-center font-medium text-slate-900 text-mono">{customer.order_count}</td>
                                            <td className="px-4 py-3 text-center text-slate-600 text-mono">{customer.total_quantity} pcs</td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600 text-mono">
                                                {formatCurrency(customer.total_revenue)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`badge ${toneToBadge[tier.tone]}`}>
                                                    {tier.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setSelectedCustomer(customer)}
                                                        className="btn-icon btn-ghost"
                                                        title="Lihat Detail"
                                                        aria-label="Lihat detail"
                                                    >
                                                        <Icon.Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingCustomer(customer)}
                                                        className="btn-icon btn-ghost"
                                                        title="Edit Customer"
                                                        aria-label="Edit customer"
                                                    >
                                                        <Icon.Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(customer.id)}
                                                        className="btn-icon btn-ghost text-red-600 hover:!bg-red-50"
                                                        title="Hapus Customer"
                                                        aria-label="Hapus customer"
                                                    >
                                                        <Icon.Trash className="w-4 h-4" />
                                                    </button>
                                                    <a
                                                        href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn-icon bg-emerald-500 hover:bg-emerald-600 text-white"
                                                        title="Chat WhatsApp"
                                                        aria-label="Chat WhatsApp"
                                                    >
                                                        <Icon.Whatsapp className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Customer Modal */}
            <AddCustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCustomerCreated={handleCustomerCreated}
            />

            {/* Customer Detail Modal */}
            <CustomerDetailModal
                customer={selectedCustomer}
                isOpen={selectedCustomer !== null}
                onClose={() => setSelectedCustomer(null)}
            />

            {/* Edit Customer Modal */}
            <EditCustomerModal
                customer={editingCustomer}
                isOpen={editingCustomer !== null}
                onClose={() => setEditingCustomer(null)}
                onCustomerUpdated={handleCustomerUpdated}
            />

            {/* Konfirmasi Hapus */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => { if (deleteConfirmId) handleDeleteCustomer(deleteConfirmId) }}
                title="Hapus Customer?"
                description="Customer yang memiliki order tidak bisa dihapus. Pastikan tidak ada order terkait."
                confirmText="Hapus"
                tone="danger"
                loading={deleting}
                icon={<Icon.Trash className="w-6 h-6" />}
            />
        </div>
    )
}
