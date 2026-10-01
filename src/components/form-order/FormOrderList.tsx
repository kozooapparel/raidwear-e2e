'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ProductionSpecs, STAGE_LABELS, STAGES_ORDER, OrderStage, OrderWithCustomer } from '@/types/database'
import { deleteOrder } from '@/lib/actions/orders'
import { toast } from 'sonner'
import FormOrderDownloadButton from './FormOrderDownloadButton'
import FormOrderPreviewButton from './FormOrderPreviewButton'
import { EmptyState, DefaultEmptyIcon, StatCard } from '@/components/ui/ds'
import { ConfirmDialog, FilterPills, SearchBar, SelectBox } from '@/components/ui'
import type { FilterPillOption, FilterTone, SelectOption } from '@/components/ui'
import { getDeadlineProduksi, formatTanggal } from '@/lib/form-order'

interface BrandItem {
    id: string
    code: string
    name: string
}

interface FormOrderListProps {
    orders: OrderWithCustomer[]
    brands: BrandItem[]
}

/** Filter 'all' = tampilkan semua stage */
type StageFilter = 'all' | OrderStage

const PRODUCTION_STAGES: OrderStage[] = STAGES_ORDER

/** Warna pil aktif per stage agar tahapan mudah dibedakan */
const STAGE_TONES: Record<OrderStage, FilterTone> = {
    customer_dp_desain: 'warning',
    proses_desain: 'info',
    proses_layout: 'info',
    dp_produksi: 'info',
    antrean_produksi: 'info',
    print_press: 'brand',
    cutting_jahit: 'brand',
    packing: 'warning',
    pelunasan: 'warning',
    pengiriman: 'success',
}

const Icon = {
    Pencil: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    ),
    Trash: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    ),
}

export default function FormOrderList({ orders: initialOrders, brands }: FormOrderListProps) {
    const [orders, setOrders] = useState<OrderWithCustomer[]>(initialOrders)
    const [stageFilter, setStageFilter] = useState<StageFilter>('all')
    const [search, setSearch] = useState('')
    // Dipakai untuk mereset input SearchBar (komponen uncontrolled)
    const [searchKey, setSearchKey] = useState(0)
    const [brandFilter, setBrandFilter] = useState<string>('')
    const [deleteTarget, setDeleteTarget] = useState<OrderWithCustomer | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Filter pencarian + brand (dasar untuk hitungan pil stage)
    const baseOrders = useMemo(() => {
        const query = search.toLowerCase()
        return orders.filter(order => {
            if (brandFilter && order.brand_id !== brandFilter) return false
            if (!query) return true
            return Boolean(
                order.spk_number?.toLowerCase().includes(query) ||
                order.nama_po?.toLowerCase().includes(query) ||
                order.customer?.name?.toLowerCase().includes(query)
            )
        })
    }, [orders, brandFilter, search])

    const filteredOrders = useMemo(
        () => (stageFilter === 'all' ? baseOrders : baseOrders.filter(order => order.stage === stageFilter)),
        [baseOrders, stageFilter]
    )

    const stageOptions = useMemo<FilterPillOption<StageFilter>[]>(() => {
        const countOf = (stage: OrderStage) => baseOrders.filter(order => order.stage === stage).length
        return [
            { value: 'all', label: 'Semua', tone: 'neutral', count: baseOrders.length },
            ...PRODUCTION_STAGES.map<FilterPillOption<StageFilter>>(stage => ({
                value: stage,
                label: STAGE_LABELS[stage],
                tone: STAGE_TONES[stage],
                count: countOf(stage),
            })),
        ]
    }, [baseOrders])

    const brandOptions = useMemo<SelectOption[]>(
        () => brands.map(brand => ({ value: brand.id, label: brand.name, meta: brand.code })),
        [brands]
    )

    const totalQty = filteredOrders.reduce((sum, o) => {
        const specs = o.production_specs as ProductionSpecs | null
        return sum + (specs?.jumlah_produksi || o.total_quantity || 0)
    }, 0)
    const draftCount = filteredOrders.filter(o => !o.spk_number).length

    const hasActiveFilter = search !== '' || brandFilter !== '' || stageFilter !== 'all'

    const resetFilters = () => {
        setSearch('')
        setSearchKey(key => key + 1)
        setBrandFilter('')
        setStageFilter('all')
    }

    const deleteLabel = deleteTarget
        ? deleteTarget.spk_number || deleteTarget.nama_po || deleteTarget.customer?.name || 'form order ini'
        : ''

    const handleDelete = async () => {
        const target = deleteTarget
        if (!target) return

        setDeleting(true)
        try {
            const result = await deleteOrder(target.id)
            if (!result.success) {
                toast.error(result.message)
                return
            }
            setOrders(current => current.filter(o => o.id !== target.id))
            toast.success(result.message)
            setDeleteTarget(null)
        } catch (err) {
            console.error('Delete form order error:', err)
            toast.error('Gagal menghapus form order')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <StatCard label="Total Form Order" value={filteredOrders.length} tone="brand" />
                <StatCard label="Total Quantity" value={`${totalQty.toLocaleString('id-ID')} pcs`} tone="info" />
                <StatCard label="Draft" value={draftCount} tone="warning" />
            </div>

            {/* Toolbar */}
            <div className="surface space-y-3 p-3 md:p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                        <SearchBar
                            key={searchKey}
                            onSearch={setSearch}
                            placeholder="Cari nomor SPK, PO, atau customer..."
                        />
                    </div>
                    <SelectBox
                        className="sm:w-56"
                        options={brandOptions}
                        value={brandFilter}
                        onChange={setBrandFilter}
                        clearable
                        clearLabel="Semua Brand"
                        placeholder="Semua Brand"
                        ariaLabel="Filter brand"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
                    <FilterPills
                        options={stageOptions}
                        value={stageFilter}
                        onChange={setStageFilter}
                        size="sm"
                        ariaLabel="Filter stage produksi"
                    />
                    {hasActiveFilter && (
                        <button type="button" onClick={resetFilters} className="btn-ghost btn-sm text-slate-600">
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Cards */}
            <div className="grid gap-3">
                {filteredOrders.length === 0 ? (
                    <div className="surface">
                        <EmptyState
                            icon={<DefaultEmptyIcon />}
                            title={hasActiveFilter ? 'Tidak ada form order ditemukan' : 'Belum ada form order'}
                            description={hasActiveFilter
                                ? 'Coba ubah filter atau kata kunci pencarian'
                                : 'Form order yang dibuat akan muncul di sini'}
                            action={hasActiveFilter ? (
                                <button type="button" onClick={resetFilters} className="btn-secondary">
                                    Reset Filter
                                </button>
                            ) : undefined}
                        />
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const specs = order.production_specs as ProductionSpecs | null
                        const qty = specs?.jumlah_produksi || order.total_quantity || 0

                        return (
                            <div
                                key={order.id}
                                className={`surface surface-hover p-4 ${!order.spk_number ? '!border-amber-200/70' : ''}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {order.spk_number ? (
                                                <span className="text-mono font-bold text-red-600">{order.spk_number}</span>
                                            ) : (
                                                <span className="badge badge-warning">Draft</span>
                                            )}
                                            {order.nama_po && (
                                                <span className="text-sm text-slate-600">• PO: {order.nama_po}</span>
                                            )}
                                            <span className="badge badge-info">{STAGE_LABELS[order.stage]}</span>
                                            {order.brand?.code && (
                                                <span className="badge badge-neutral text-mono">{order.brand.code}</span>
                                            )}
                                        </div>
                                        <p className="text-slate-900 font-medium truncate">{order.customer?.name}</p>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 flex-wrap">
                                            <span className="text-mono">{qty} pcs</span>
                                            <span className="text-slate-300">•</span>
                                            <span>Order: {formatTanggal(order.created_at)}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>Deadline: {formatTanggal(getDeadlineProduksi(order.created_at))}</span>
                                        </div>
                                        {specs && (specs.jenis_produk || specs.jenis_bahan || specs.model_kerah) && (
                                            <div className="flex gap-1.5 mt-2 flex-wrap">
                                                {[specs.jenis_produk, specs.jenis_bahan, specs.model_kerah, specs.model_lengan]
                                                    .filter(Boolean)
                                                    .map((val, idx) => (
                                                        <span key={idx} className="badge badge-info">
                                                            {val}
                                                        </span>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <FormOrderPreviewButton order={order} />
                                        <FormOrderDownloadButton order={order} variant="icon" />
                                        <Link
                                            href={`/form-order/${order.id}`}
                                            className="btn-icon btn-ghost"
                                            title="Lihat/Edit"
                                            aria-label="Lihat atau edit form order"
                                        >
                                            <Icon.Pencil className="h-4 w-4" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(order)}
                                            className="btn-icon btn-ghost text-red-600 hover:!bg-red-50"
                                            title="Hapus"
                                            aria-label="Hapus form order"
                                        >
                                            <Icon.Trash className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <p className="text-sm text-slate-500 text-center">
                Menampilkan {filteredOrders.length} dari {orders.length} form order
            </p>

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => { if (!deleting) setDeleteTarget(null) }}
                onConfirm={handleDelete}
                title="Hapus Form Order"
                description={`Hapus ${deleteLabel}? Invoice, kuitansi, pembayaran, dan file yang terkait akan ikut terhapus permanen.`}
                confirmText="Hapus"
                loading={deleting}
                icon={<Icon.Trash className="h-5 w-5" />}
            />
        </div>
    )
}
