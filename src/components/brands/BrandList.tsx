'use client'

import { useMemo, useState } from 'react'
import { Brand } from '@/types/database'
import { deleteBrand, setDefaultBrand } from '@/lib/actions/brands'
import { ConfirmDialog, SearchBar } from '@/components/ui'
import { toast } from 'sonner'
import BrandFormModal from './BrandFormModal'

interface BrandListProps {
    brands: Brand[]
    onBrandUpdated: (brand: Brand) => void
    onSetDefault: (id: string) => void
    onDelete: (id: string) => void
}

const IconTrash = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const IconPhone = () => (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h2.6a1 1 0 01.95.68l1.1 3.3a1 1 0 01-.24 1.03l-1.4 1.4a16 16 0 006.58 6.58l1.4-1.4a1 1 0 011.03-.24l3.3 1.1a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
    </svg>
)

export default function BrandList({ brands, onBrandUpdated, onSetDefault, onDelete }: BrandListProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchKey, setSearchKey] = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
    const [deleting, setDeleting] = useState(false)

    const filteredBrands = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return brands
        return brands.filter((brand) =>
            brand.name.toLowerCase().includes(q) ||
            brand.code.toLowerCase().includes(q) ||
            (brand.company_name ?? '').toLowerCase().includes(q)
        )
    }, [brands, searchQuery])

    const handleSetDefault = async (id: string) => {
        setLoading(id)
        try {
            await setDefaultBrand(id)
            onSetDefault(id)
            toast.success('Brand default berhasil diubah')
        } catch (error) {
            console.error('Error setting default brand:', error)
            toast.error('Gagal mengubah brand default')
        } finally {
            setLoading(null)
        }
    }

    const handleBrandUpdated = (brand: Brand) => {
        onBrandUpdated(brand)
        setEditingBrand(null)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await deleteBrand(deleteTarget.id)
            onDelete(deleteTarget.id)
            toast.success(`Brand "${deleteTarget.name}" berhasil dihapus`)
            setDeleteTarget(null)
        } catch (error) {
            console.error('Error deleting brand:', error)
            toast.error(error instanceof Error ? error.message : 'Gagal menghapus brand')
        } finally {
            setDeleting(false)
        }
    }

    const resetSearch = () => {
        setSearchQuery('')
        setSearchKey((key) => key + 1)
    }

    if (brands.length === 0) {
        return (
            <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">Belum ada brand</p>
                <p className="mt-1 text-sm text-slate-500">Klik tombol &ldquo;Tambah Brand&rdquo; untuk menambahkan.</p>
            </div>
        )
    }

    return (
        <>
            {/* Toolbar pencarian */}
            <div className="surface mb-5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="sm:max-w-xs sm:flex-1">
                        <SearchBar
                            key={searchKey}
                            onSearch={setSearchQuery}
                            placeholder="Cari nama, kode, atau perusahaan..."
                        />
                    </div>
                    <p className="text-xs text-slate-500 sm:ml-auto">
                        Menampilkan <span className="font-semibold text-slate-700">{filteredBrands.length}</span> dari {brands.length} brand
                    </p>
                </div>
            </div>

            {filteredBrands.length === 0 ? (
                <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
                    <p className="text-sm font-medium text-slate-700">Tidak ada brand yang cocok</p>
                    <p className="mt-1 text-sm text-slate-500">Coba kata kunci lain atau reset pencarian.</p>
                    <button type="button" onClick={resetSearch} className="btn btn-secondary btn-sm mt-4">
                        Reset Pencarian
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredBrands.map((brand) => (
                        <div
                            key={brand.id}
                            className={`surface surface-hover flex flex-col p-5 ${brand.is_default ? 'ring-2 ring-brand-500/40' : ''}`}
                        >
                            {/* Header logo + nama */}
                            <div className="mb-4 flex items-start gap-4">
                                {brand.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={brand.logo_url}
                                        alt={brand.name}
                                        className="h-16 w-16 rounded-lg bg-slate-50 object-contain p-1"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                                        <span className="text-2xl font-bold text-slate-400">{brand.code}</span>
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="truncate text-lg font-bold text-slate-900">{brand.name}</h3>
                                        {brand.is_default && <span className="badge badge-brand">Default</span>}
                                    </div>
                                    <p className="text-sm text-slate-500">Kode: {brand.code}</p>
                                </div>
                            </div>

                            {/* Prefix dokumen */}
                            <div className="mb-4 flex flex-wrap gap-2">
                                <span className="badge badge-info text-mono">INV: {brand.invoice_prefix}</span>
                                <span className="badge badge-brand text-mono">KWT: {brand.kuitansi_prefix}</span>
                                <span className="badge badge-neutral text-mono">SPK: {brand.spk_prefix}</span>
                            </div>

                            {/* Info perusahaan */}
                            <div className="mb-4 space-y-1 text-sm text-slate-600">
                                <p className="font-medium">{brand.company_name}</p>
                                {brand.address && (
                                    <p className="line-clamp-2 text-xs text-slate-400">{brand.address}</p>
                                )}
                                {brand.phone && (
                                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <IconPhone />
                                        {brand.phone}
                                    </p>
                                )}
                            </div>

                            {/* Info bank */}
                            {brand.bank_name && (
                                <div className="mb-4 rounded-xl bg-slate-50 p-3">
                                    <p className="mb-1 text-xs text-slate-500">Info Bank</p>
                                    <p className="text-sm font-medium">{brand.bank_name}</p>
                                    <p className="text-xs text-slate-600">{brand.account_name}</p>
                                    <p className="text-xs text-slate-600">{brand.account_number}</p>
                                </div>
                            )}

                            {/* Counter dokumen */}
                            <div className="mb-4 flex gap-4 border-t border-slate-100 pt-4 text-xs text-slate-400 text-mono">
                                <span>Invoice: #{brand.invoice_counter}</span>
                                <span>Kuitansi: #{brand.kuitansi_counter}</span>
                                <span>SPK: #{brand.spk_counter}</span>
                            </div>

                            {/* Aksi */}
                            <div className="mt-auto flex gap-2">
                                {!brand.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefault(brand.id)}
                                        disabled={loading === brand.id}
                                        className="btn btn-secondary btn-sm flex-1"
                                    >
                                        {loading === brand.id ? 'Memproses...' : 'Set Default'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setEditingBrand(brand)}
                                    className="btn btn-secondary btn-sm flex-1"
                                >
                                    Edit
                                </button>
                                {!brand.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(brand)}
                                        disabled={loading === brand.id}
                                        aria-label={`Hapus brand ${brand.name}`}
                                        className="btn btn-ghost btn-sm px-2.5 text-red-600 hover:bg-red-50"
                                    >
                                        <IconTrash />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal edit */}
            <BrandFormModal
                isOpen={editingBrand !== null}
                onClose={() => setEditingBrand(null)}
                brand={editingBrand || undefined}
                onBrandUpdated={handleBrandUpdated}
            />

            {/* Konfirmasi hapus */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Hapus Brand"
                description={
                    deleteTarget
                        ? `Yakin ingin menghapus brand "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`
                        : ''
                }
                confirmText="Hapus Brand"
                loading={deleting}
                tone="danger"
                icon={<IconTrash />}
            />
        </>
    )
}
