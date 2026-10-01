'use client'

import { useMemo, useState } from 'react'
import { KuitansiWithInvoice } from '@/types/database'
import { deleteKuitansi } from '@/lib/actions/kuitansi'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { DEFAULT_DATE_RANGE, DateRangeValue, isDateInRange } from '@/lib/utils/date-range'
import { DateRangeFilter, SearchBar, SelectBox, ConfirmDialog, FilterPills } from '@/components/ui'
import type { SelectOption, FilterPillOption, FilterTone } from '@/components/ui'
import KuitansiDownloadButton from './KuitansiDownloadButton'
import KuitansiPreviewButton from './KuitansiPreviewButton'
import { toast } from 'sonner'

interface BrandItem {
    id: string
    code: string
    name: string
}

interface KuitansiListProps {
    kuitansiList: KuitansiWithInvoice[]
    brands: BrandItem[]
}

type StatusFilter = 'all' | 'BELUM_LUNAS' | 'SUDAH_LUNAS'

/** Ikon inline mengikuti konvensi repo */
const Icon = {
    Trash: (p: { className?: string }) => (
        <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
    ),
}

const STATUS_FILTERS: { value: StatusFilter; label: string; tone: FilterTone }[] = [
    { value: 'all', label: 'Semua', tone: 'neutral' },
    { value: 'BELUM_LUNAS', label: 'Inv. Belum Lunas', tone: 'warning' },
    { value: 'SUDAH_LUNAS', label: 'Inv. Lunas', tone: 'success' },
]

const ITEMS_PER_PAGE = 20

export default function KuitansiList({ kuitansiList: initialKuitansi, brands }: KuitansiListProps) {
    const [kuitansiList, setKuitansiList] = useState<KuitansiWithInvoice[]>(initialKuitansi)
    const [search, setSearch] = useState('')
    // Dipakai untuk mereset SearchBar (komponen uncontrolled)
    const [searchKey, setSearchKey] = useState(0)
    const [brandFilter, setBrandFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
    const [currentPage, setCurrentPage] = useState(1)

    // Konfirmasi hapus
    const [deleteTarget, setDeleteTarget] = useState<KuitansiWithInvoice | null>(null)
    const [deleting, setDeleting] = useState(false)

    const brandOptions = useMemo<SelectOption[]>(
        () => brands.map((brand) => ({ value: brand.id, label: brand.name, meta: brand.code })),
        [brands]
    )

    // Daftar setelah filter selain status — dipakai untuk hitung jumlah per pill
    const baseList = useMemo(() => {
        const q = search.trim().toLowerCase()
        return kuitansiList.filter((k) => {
            const matchSearch = q === '' ||
                (k.invoice?.no_invoice ?? '').toLowerCase().includes(q) ||
                (k.invoice?.customer?.name ?? '').toLowerCase().includes(q)
            const matchBrand = brandFilter === '' || k.invoice?.brand?.id === brandFilter
            return matchSearch && matchBrand && isDateInRange(k.tanggal, dateRange)
        })
    }, [kuitansiList, search, brandFilter, dateRange])

    const filteredList = useMemo(
        () => baseList.filter((k) => statusFilter === 'all' || k.invoice?.status_pembayaran === statusFilter),
        [baseList, statusFilter]
    )

    const statusFilterOptions = useMemo<FilterPillOption<StatusFilter>[]>(() => {
        const counts: Record<StatusFilter, number> = {
            all: baseList.length,
            BELUM_LUNAS: baseList.filter((k) => k.invoice?.status_pembayaran === 'BELUM_LUNAS').length,
            SUDAH_LUNAS: baseList.filter((k) => k.invoice?.status_pembayaran === 'SUDAH_LUNAS').length,
        }
        return STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))
    }, [baseList])

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE)
    const paginatedList = filteredList.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    const handleSearchChange = (value: string) => {
        setSearch(value)
        setCurrentPage(1)
    }
    const handleBrandChange = (value: string) => {
        setBrandFilter(value)
        setCurrentPage(1)
    }
    const handleStatusChange = (value: StatusFilter) => {
        setStatusFilter(value)
        setCurrentPage(1)
    }
    const handleDateRangeChange = (range: DateRangeValue) => {
        setDateRange(range)
        setCurrentPage(1)
    }

    const hasActiveFilter = search.trim() !== '' || statusFilter !== 'all' || brandFilter !== '' || dateRange !== DEFAULT_DATE_RANGE

    const resetFilters = () => {
        setSearch('')
        setStatusFilter('all')
        setBrandFilter('')
        setDateRange(DEFAULT_DATE_RANGE)
        setCurrentPage(1)
        setSearchKey((key) => key + 1)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const target = deleteTarget
        setDeleting(true)
        try {
            await deleteKuitansi(target.id)
            setKuitansiList((current) => current.filter((k) => k.id !== target.id))
            toast.success('Kuitansi berhasil dihapus')
            setDeleteTarget(null)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal menghapus kuitansi')
        } finally {
            setDeleting(false)
        }
    }

    // Total pembayaran sesuai filter yang sedang aktif
    const totalPembayaran = filteredList.reduce((sum, k) => sum + k.jumlah, 0)

    return (
        <div className="space-y-6">
            {/* Ringkasan */}
            <div className="surface flex flex-col gap-1 bg-gradient-to-r from-brand-600 to-brand-700 p-5 text-white md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm text-brand-50/90">Total Pembayaran</p>
                    <p className="text-mono text-3xl font-bold">{formatCurrency(totalPembayaran)}</p>
                </div>
                <p className="text-sm text-brand-50/90">{filteredList.length} kuitansi</p>
            </div>

            {/* Toolbar: pencarian, filter status, brand, rentang tanggal */}
            <div className="surface space-y-3 p-3 md:p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                    <div className="min-w-0 flex-1">
                        <SearchBar
                            key={searchKey}
                            onSearch={handleSearchChange}
                            placeholder="Cari no invoice atau customer..."
                        />
                    </div>
                    <div className="w-full shrink-0 md:w-60">
                        <SelectBox
                            options={brandOptions}
                            value={brandFilter}
                            onChange={handleBrandChange}
                            clearable
                            clearLabel="Semua Brand"
                            placeholder="Semua Brand"
                            ariaLabel="Filter brand"
                        />
                    </div>
                    <DateRangeFilter
                        value={dateRange}
                        onChange={handleDateRangeChange}
                        accent="emerald"
                        align="right"
                        className="shrink-0"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <FilterPills
                        options={statusFilterOptions}
                        value={statusFilter}
                        onChange={handleStatusChange}
                        size="sm"
                        ariaLabel="Filter status invoice"
                    />
                    <span className="ml-auto text-xs text-slate-500">
                        Menampilkan <span className="font-semibold text-slate-700">{filteredList.length}</span> dari {kuitansiList.length} kuitansi
                    </span>
                </div>
            </div>

            {/* Tabel */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Tanggal</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No Invoice</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Customer</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Jumlah</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Keterangan</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <p className="text-sm text-slate-500">Tidak ada kuitansi ditemukan</p>
                                        {hasActiveFilter && (
                                            <button type="button" onClick={resetFilters} className="btn btn-secondary btn-sm mt-3">
                                                Reset Filter
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                paginatedList.map((kuitansi, index) => (
                                    <tr key={kuitansi.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-500 text-mono">
                                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {formatDateShort(kuitansi.tanggal)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900 text-mono">
                                            {kuitansi.invoice?.no_invoice || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <span>{kuitansi.invoice?.customer?.name || '-'}</span>
                                                {kuitansi.invoice?.brand?.code && (
                                                    <span className="badge badge-neutral text-mono">
                                                        {kuitansi.invoice.brand.code}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600 text-mono">
                                            {formatCurrency(kuitansi.jumlah)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                            {kuitansi.keterangan}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <KuitansiPreviewButton kuitansiId={kuitansi.id} />
                                                <KuitansiDownloadButton kuitansiId={kuitansi.id} variant="icon" />
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(kuitansi)}
                                                    className="btn-icon btn-ghost text-red-600 hover:!bg-red-50"
                                                    title="Hapus"
                                                    aria-label="Hapus kuitansi"
                                                >
                                                    <Icon.Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)} dari {filteredList.length} kuitansi
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            ← Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                type="button"
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === currentPage
                                    ? 'bg-emerald-600 text-white font-semibold'
                                    : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Konfirmasi hapus */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Hapus Kuitansi"
                description="Yakin ingin menghapus kuitansi ini? Status pembayaran invoice akan diperbarui dan tindakan ini tidak bisa dibatalkan."
                confirmText="Hapus Kuitansi"
                tone="danger"
                loading={deleting}
                icon={<Icon.Trash className="w-6 h-6" />}
            />
        </div>
    )
}