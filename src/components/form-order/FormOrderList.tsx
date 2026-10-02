'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    Image: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {filteredOrders.length === 0 ? (
                    <div className="surface sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-6">
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
                            <article
                                key={order.id}
                                className={`surface surface-hover group flex flex-col overflow-hidden ${!order.spk_number ? '!border-amber-200/70' : ''}`}
                            >
                                {/* Thumbnail desain ukuran sedang — cukup jelas untuk mengenali jersey */}
                                <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-100 bg-slate-100">
                                    {order.mockup_url ? (
                                        <Image
                                            src={order.mockup_url}
                                            alt={`Desain ${order.spk_number || order.nama_po || order.customer?.name || 'order'}`}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 17vw"
                                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300">
                                            <Icon.Image className="h-7 w-7" />
                                            <span className="text-xs font-medium text-slate-400">Belum ada desain</span>
                                        </div>
                                    )}

                                    {/* Brand & status ditempel di atas thumbnail supaya kartu tetap ringkas */}
                                    {order.brand?.code && (
                                        <span className="badge badge-neutral text-mono absolute left-2 top-2 shadow-sm">
                                            {order.brand.code}
                                        </span>
                                    )}
                                    <span className="badge badge-info absolute right-2 top-2 shadow-sm">
                                        {STAGE_LABELS[order.stage]}
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col gap-2 p-3">
                                    {/* Identitas: nomor SPK, customer, dan PO */}
                                    <div className="min-w-0">
                                        {order.spk_number ? (
                                            <p className="text-mono truncate text-sm font-bold leading-tight text-red-600">
                                                {order.spk_number}
                                            </p>
                                        ) : (
                                            <span className="badge badge-warning">Draft</span>
                                        )}
                                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                                            {order.customer?.name || '-'}
                                        </p>
                                        {order.nama_po && (
                                            <p className="mt-0.5 truncate text-xs text-slate-500">PO: {order.nama_po}</p>
                                        )}
                                    </div>

                                    {/* Spesifikasi singkat */}
                                    {specs && (specs.jenis_produk || specs.jenis_bahan || specs.model_kerah) && (
                                        <div className="flex flex-wrap gap-1">
                                            {[specs.jenis_produk, specs.jenis_bahan, specs.model_kerah, specs.model_lengan]
                                                .filter(Boolean)
                                                .map((val, idx) => (
                                                    <span key={idx} className="badge badge-info">
                                                        {val}
                                                    </span>
                                                ))}
                                        </div>
                                    )}

                                    {/* Metrik kunci: quantity dan deadline */}
                                    <div className="mt-auto flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                                        <div className="min-w-0">
                                            <p className="text-caption text-slate-400">Qty</p>
                                            <p className="text-mono truncate text-xs font-semibold text-slate-800">{qty} pcs</p>
                                        </div>
                                        <div className="min-w-0 text-right">
                                            <p className="text-caption text-slate-400">Deadline</p>
                                            <p className="truncate text-xs font-semibold text-slate-800">
                                                {formatTanggal(getDeadlineProduksi(order.created_at))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Aksi */}
                                    <div className="flex items-center justify-end gap-0.5 border-t border-slate-100 pt-2">
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
                            </article>
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
