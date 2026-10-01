'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { InvoiceWithCustomer } from '@/types/database'
import { deleteInvoice } from '@/lib/actions/invoices'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { DEFAULT_DATE_RANGE, DateRangeValue, isDateInRange } from '@/lib/utils/date-range'
import { DateRangeFilter, SearchBar, SelectBox, ConfirmDialog, FilterPills } from '@/components/ui'
import type { SelectOption, FilterPillOption, FilterTone } from '@/components/ui'
import { StatCard } from '@/components/ui/ds'
import InvoiceDownloadButton from './InvoiceDownloadButton'
import InvoicePreviewButton from './InvoicePreviewButton'
import { toast } from 'sonner'

interface BrandItem {
    id: string
    code: string
    name: string
}

/** Invoice yang dikirim halaman sudah dilengkapi relasi brand (opsional) */
type InvoiceRow = InvoiceWithCustomer & { brand?: BrandItem | null }

/** Ambil relasi brand yang menempel pada invoice (bila ada) */
const brandOf = (invoice: InvoiceWithCustomer): BrandItem | null =>
    (invoice as InvoiceRow).brand ?? null

interface InvoiceListProps {
    invoices: InvoiceWithCustomer[]
    brands: BrandItem[]
}

type StatusFilter = 'all' | 'BELUM_LUNAS' | 'SUDAH_LUNAS'

/** Ikon inline mengikuti konvensi repo */
const Icon = {
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
}

const STATUS_FILTERS: { value: StatusFilter; label: string; tone: FilterTone }[] = [
    { value: 'all', label: 'Semua', tone: 'neutral' },
    { value: 'BELUM_LUNAS', label: 'Belum Lunas', tone: 'warning' },
    { value: 'SUDAH_LUNAS', label: 'Lunas', tone: 'success' },
]

const ITEMS_PER_PAGE = 20

export default function InvoiceList({ invoices: initialInvoices, brands }: InvoiceListProps) {
    const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>(initialInvoices)
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [search, setSearch] = useState('')
    // Dipakai untuk mereset SearchBar (komponen uncontrolled)
    const [searchKey, setSearchKey] = useState(0)
    const [brandFilter, setBrandFilter] = useState<string>('')
    const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
    const [currentPage, setCurrentPage] = useState(1)

    // Konfirmasi hapus
    const [deleteTarget, setDeleteTarget] = useState<InvoiceWithCustomer | null>(null)
    const [deleting, setDeleting] = useState(false)

    const brandOptions = useMemo<SelectOption[]>(
        () => brands.map((brand) => ({ value: brand.id, label: brand.name, meta: brand.code })),
        [brands]
    )

    // Daftar setelah filter selain status — dipakai untuk hitung jumlah per pill
    const baseInvoices = useMemo(() => {
        const q = search.trim().toLowerCase()
        return invoices.filter((inv) => {
            const matchSearch = q === '' ||
                inv.no_invoice.toLowerCase().includes(q) ||
                (inv.customer?.name ?? '').toLowerCase().includes(q)
            const matchBrand = brandFilter === '' || brandOf(inv)?.id === brandFilter
            return matchSearch && matchBrand && isDateInRange(inv.tanggal, dateRange)
        })
    }, [invoices, search, brandFilter, dateRange])

    const filteredInvoices = useMemo(
        () => baseInvoices.filter((inv) => filter === 'all' || inv.status_pembayaran === filter),
        [baseInvoices, filter]
    )

    const statusFilterOptions = useMemo<FilterPillOption<StatusFilter>[]>(() => {
        const counts: Record<StatusFilter, number> = {
            all: baseInvoices.length,
            BELUM_LUNAS: baseInvoices.filter((inv) => inv.status_pembayaran === 'BELUM_LUNAS').length,
            SUDAH_LUNAS: baseInvoices.filter((inv) => inv.status_pembayaran === 'SUDAH_LUNAS').length,
        }
        return STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))
    }, [baseInvoices])

    const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset halaman saat filter berubah
    const handleFilterChange = (newFilter: StatusFilter) => {
        setFilter(newFilter)
        setCurrentPage(1)
    }
    const handleSearchChange = (value: string) => {
        setSearch(value)
        setCurrentPage(1)
    }
    const handleBrandChange = (value: string) => {
        setBrandFilter(value)
        setCurrentPage(1)
    }
    const handleDateRangeChange = (range: DateRangeValue) => {
        setDateRange(range)
        setCurrentPage(1)
    }

    const hasActiveFilter = search.trim() !== '' || filter !== 'all' || brandFilter !== '' || dateRange !== DEFAULT_DATE_RANGE

    const resetFilters = () => {
        setSearch('')
        setFilter('all')
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
            await deleteInvoice(target.id)
            setInvoices((current) => current.filter((inv) => inv.id !== target.id))
            toast.success(`Invoice ${target.no_invoice} berhasil dihapus`)
            setDeleteTarget(null)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal menghapus invoice')
        } finally {
            setDeleting(false)
        }
    }

    // Ringkasan sesuai filter yang sedang aktif
    const totalInvoice = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalDibayar = filteredInvoices.reduce((sum, inv) => sum + inv.total_dibayar, 0)
    const totalSisa = filteredInvoices.reduce((sum, inv) => sum + inv.sisa_tagihan, 0)

    return (
        <div className="space-y-6">
            {/* Ringkasan */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                <StatCard label="Total Invoice" value={formatCurrency(totalInvoice)} tone="default" />
                <StatCard label="Total Dibayar" value={formatCurrency(totalDibayar)} tone="success" />
                <StatCard label="Sisa Tagihan" value={formatCurrency(totalSisa)} tone="warning" />
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
                        accent="orange"
                        align="right"
                        className="shrink-0"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <FilterPills
                        options={statusFilterOptions}
                        value={filter}
                        onChange={handleFilterChange}
                        size="sm"
                        ariaLabel="Filter status pembayaran"
                    />
                    <span className="ml-auto text-xs text-slate-500">
                        Menampilkan <span className="font-semibold text-slate-700">{filteredInvoices.length}</span> dari {invoices.length} invoice
                    </span>
                </div>
            </div>

            {/* Tabel */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No Invoice</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Tanggal</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Customer</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Total</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Dibayar</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Sisa</th>
                                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Status</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <p className="text-sm text-slate-500">Tidak ada invoice ditemukan</p>
                                        {hasActiveFilter && (
                                            <button type="button" onClick={resetFilters} className="btn btn-secondary btn-sm mt-3">
                                                Reset Filter
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                            <Link href={`/invoices/${invoice.id}`} className="hover:text-brand-600 transition-colors text-mono">
                                                {invoice.no_invoice}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {formatDateShort(invoice.tanggal)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <span>{invoice.customer?.name || '-'}</span>
                                                {brandOf(invoice)?.code && (
                                                    <span className="badge badge-neutral text-mono">
                                                        {brandOf(invoice)?.code}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 text-mono">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-emerald-600 text-mono">
                                            {formatCurrency(invoice.total_dibayar)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-amber-600 text-mono">
                                            {formatCurrency(invoice.sisa_tagihan)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`badge ${invoice.status_pembayaran === 'SUDAH_LUNAS' ? 'badge-success' : 'badge-warning'}`}>
                                                {invoice.status_pembayaran === 'SUDAH_LUNAS' ? 'Lunas' : 'Belum Lunas'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <InvoicePreviewButton invoiceId={invoice.id} />
                                                <InvoiceDownloadButton invoiceId={invoice.id} variant="icon" />
                                                <Link
                                                    href={`/invoices/${invoice.id}`}
                                                    className="btn-icon btn-ghost"
                                                    title="Lihat/Edit"
                                                    aria-label={`Lihat atau edit invoice ${invoice.no_invoice}`}
                                                >
                                                    <Icon.Pencil className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(invoice)}
                                                    className="btn-icon btn-ghost text-red-600 hover:!bg-red-50"
                                                    title="Hapus"
                                                    aria-label={`Hapus invoice ${invoice.no_invoice}`}
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
                        Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} dari {filteredInvoices.length} invoice
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
                                    ? 'bg-brand-600 text-white font-semibold'
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
                title="Hapus Invoice"
                description={deleteTarget ? `Yakin ingin menghapus invoice ${deleteTarget.no_invoice}? Semua data terkait akan dihapus dan tindakan ini tidak bisa dibatalkan.` : ''}
                confirmText="Hapus Invoice"
                tone="danger"
                loading={deleting}
                icon={<Icon.Trash className="w-6 h-6" />}
            />
        </div>
    )
}