'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Barang, BarangWithTiers, Brand } from '@/types/database'
import { getBarangList, createBarang, updateBarang, deleteBarang, getBarangById } from '@/lib/actions/barang'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'
import CurrencyInput from '@/components/ui/CurrencyInput'
import NumberInput from '@/components/ui/NumberInput'
import { Modal, ModalFooter, FormField, SelectBox, ConfirmDialog, SearchBar } from '@/components/ui'
import type { SelectOption } from '@/components/ui'
import { StatCard, EmptyState, DefaultEmptyIcon } from '@/components/ui/ds'

interface HargaTierInput {
    id: string
    min_qty: number
    max_qty: number | null
    harga: number
}

const Icon = {
    Plus: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 5v14M5 12h14" />
        </svg>
    ),
    Pencil: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    ),
    Trash: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    ),
    Calculator: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 19h8" />
        </svg>
    ),
    Cube: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
    ),
    Tag: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <circle cx="7" cy="7" r="1.5" fill="currentColor" />
        </svg>
    ),
    Money: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" />
        </svg>
    ),
}

interface BarangListProps {
    brands: Brand[]
}

export default function BarangList({ brands }: BarangListProps) {
    const [activeBrandId, setActiveBrandId] = useState<string>(brands[0]?.id || '')
    const [barangList, setBarangList] = useState<Barang[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingBarang, setEditingBarang] = useState<BarangWithTiers | null>(null)
    const [saving, setSaving] = useState(false)

    // Konfirmasi hapus
    const [deleteTarget, setDeleteTarget] = useState<Barang | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Pencarian produk pada brand aktif
    const [searchQuery, setSearchQuery] = useState('')
    // Bump key untuk mereset SearchBar (komponen uncontrolled) saat pindah brand
    const [searchKey, setSearchKey] = useState(0)

    // Form state
    const [formBrandId, setFormBrandId] = useState('')
    const [namaBarang, setNamaBarang] = useState('')
    const [satuan, setSatuan] = useState('PCS')
    const [hargaSatuan, setHargaSatuan] = useState(0)
    const [kategori, setKategori] = useState('')
    const [hargaTiers, setHargaTiers] = useState<HargaTierInput[]>([])

    const activeBrand = brands.find(b => b.id === activeBrandId)

    const brandOptions: SelectOption[] = useMemo(
        () => brands.map(b => ({ value: b.id, label: b.name })),
        [brands]
    )

    const loadBarang = useCallback(async () => {
        if (!activeBrandId) {
            setBarangList([])
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const data = await getBarangList(activeBrandId)
            setBarangList(data)
        } catch (error) {
            console.error('Error loading barang:', error)
        } finally {
            setLoading(false)
        }
    }, [activeBrandId])

    // Load barang list per brand aktif
    useEffect(() => {
        loadBarang()
    }, [loadBarang])

    // Pindah brand sekaligus reset pencarian agar daftar tidak tampak kosong
    const handleSelectBrand = (brandId: string) => {
        setActiveBrandId(brandId)
        setSearchQuery('')
        setSearchKey((k) => k + 1)
    }

    // Open modal for create
    const openCreateModal = () => {
        setEditingBarang(null)
        setFormBrandId(activeBrandId)
        setNamaBarang('')
        setSatuan('PCS')
        setHargaSatuan(0)
        setKategori('')
        setHargaTiers([])
        setShowModal(true)
    }

    // Open modal for edit
    const openEditModal = async (id: string) => {
        const barang = await getBarangById(id)
        if (barang) {
            setEditingBarang(barang)
            setFormBrandId(barang.brand_id)
            setNamaBarang(barang.nama_barang)
            setSatuan(barang.satuan)
            setHargaSatuan(barang.harga_satuan)
            setKategori(barang.kategori || '')
            setHargaTiers(barang.harga_tiers.map((t, i) => ({
                id: `tier-${i}`,
                min_qty: t.min_qty,
                max_qty: t.max_qty,
                harga: t.harga
            })))
            setShowModal(true)
        }
    }

    // Close modal
    const closeModal = () => {
        setShowModal(false)
        setEditingBarang(null)
    }

    // Add tier row
    const addTierRow = () => {
        setHargaTiers([...hargaTiers, {
            id: `tier-${Date.now()}`,
            min_qty: 1,
            max_qty: null,
            harga: 0
        }])
    }

    // Remove tier row
    const removeTierRow = (index: number) => {
        setHargaTiers(hargaTiers.filter((_, i) => i !== index))
    }

    // Update tier
    const updateTier = (index: number, field: keyof HargaTierInput, value: number | null) => {
        const newTiers = [...hargaTiers]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setHargaTiers(newTiers)
    }

    // Save barang
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!namaBarang) {
            toast.warning('Nama barang harus diisi')
            return
        }

        if (!formBrandId) {
            toast.warning('Pilih brand terlebih dahulu')
            return
        }

        setSaving(true)
        try {
            const tierData = hargaTiers.map(t => ({
                min_qty: t.min_qty,
                max_qty: t.max_qty,
                harga: t.harga
            }))

            if (editingBarang) {
                await updateBarang(editingBarang.id, {
                    brand_id: formBrandId,
                    nama_barang: namaBarang,
                    satuan,
                    harga_satuan: hargaSatuan,
                    kategori: kategori || null
                }, tierData)
                toast.success('Barang berhasil diperbarui')
            } else {
                await createBarang({
                    brand_id: formBrandId,
                    nama_barang: namaBarang,
                    satuan,
                    harga_satuan: hargaSatuan,
                    kategori: kategori || null
                }, tierData)
                toast.success('Barang berhasil ditambahkan')
            }

            closeModal()
            loadBarang()
        } catch (error) {
            console.error('Error saving barang:', error)
            toast.error('Gagal menyimpan barang')
        } finally {
            setSaving(false)
        }
    }

    // Delete barang
    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await deleteBarang(deleteTarget.id)
            toast.success('Barang berhasil dihapus')
            setDeleteTarget(null)
            loadBarang()
        } catch (error) {
            console.error('Error deleting barang:', error)
            toast.error('Gagal menghapus barang')
        } finally {
            setDeleting(false)
        }
    }

    // Hasil filter pencarian
    const filteredBarang = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return barangList
        return barangList.filter(b =>
            b.nama_barang.toLowerCase().includes(q) ||
            (b.kategori || '').toLowerCase().includes(q)
        )
    }, [barangList, searchQuery])

    // Stats
    const stats = {
        total: barangList.length,
        withCategories: barangList.filter(b => b.kategori).length,
        avgPrice: barangList.length > 0
            ? barangList.reduce((sum, b) => sum + b.harga_satuan, 0) / barangList.length
            : 0,
    }

    return (
        <>
            {/* Brand tabs */}
            <div className="surface p-2 flex flex-wrap gap-2">
                {brands.map(brand => {
                    const isActive = brand.id === activeBrandId
                    return (
                        <button
                            key={brand.id}
                            onClick={() => handleSelectBrand(brand.id)}
                            aria-pressed={isActive}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-ring ${isActive
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {brand.name}
                        </button>
                    )
                })}
                {brands.length === 0 && (
                    <p className="text-caption px-2 py-1">Belum ada brand aktif. Tambahkan brand dulu di menu Brands.</p>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                    label="Total Produk"
                    value={<span className="text-mono">{stats.total}</span>}
                    icon={<Icon.Cube className="w-4 h-4" />}
                    tone="brand"
                    helper={activeBrand ? `produk ${activeBrand.name}` : 'produk aktif'}
                />
                <StatCard
                    label="Terkategori"
                    value={<span className="text-mono">{stats.withCategories}</span>}
                    icon={<Icon.Tag className="w-4 h-4" />}
                    tone="info"
                    helper="memiliki kategori"
                />
                <StatCard
                    label="Rata-rata Harga"
                    value={<span className="text-mono">{formatCurrency(stats.avgPrice)}</span>}
                    icon={<Icon.Money className="w-4 h-4" />}
                    tone="success"
                    helper="harga satuan"
                />
            </div>

            {/* Action bar */}
            <div className="surface flex flex-col gap-3 p-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                    <SearchBar
                        key={searchKey}
                        onSearch={setSearchQuery}
                        placeholder="Cari nama barang atau kategori..."
                    />
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                    <p className="text-caption whitespace-nowrap">
                        {filteredBarang.length}
                        {searchQuery.trim() && ` / ${barangList.length}`} produk
                    </p>
                    <button
                        onClick={openCreateModal}
                        disabled={brands.length === 0}
                        className="btn-primary disabled:opacity-50"
                    >
                        <Icon.Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Tambah Barang</span>
                        <span className="sm:hidden">Tambah</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/80 border-b border-slate-200/70">
                            <tr>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Nama Barang</th>
                                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Satuan</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Harga Satuan</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Kategori</th>
                                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-caption">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : barangList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <EmptyState
                                            icon={<DefaultEmptyIcon />}
                                            title="Belum ada produk"
                                            description={activeBrand
                                                ? `Belum ada produk untuk brand ${activeBrand.name}. Tambahkan produk pertama untuk brand ini.`
                                                : 'Tambahkan produk pertama Anda untuk mulai membuat invoice dan SPK.'}
                                            action={
                                                <button onClick={openCreateModal} className="btn-primary">
                                                    <Icon.Plus className="w-4 h-4" />
                                                    Tambah Barang
                                                </button>
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : filteredBarang.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <EmptyState
                                            icon={<DefaultEmptyIcon />}
                                            title="Tidak ada produk yang cocok"
                                            description="Coba ubah kata kunci pencarian Anda."
                                            action={
                                                <button onClick={() => setSearchQuery('')} className="btn-secondary">
                                                    Reset Pencarian
                                                </button>
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredBarang.map((barang) => (
                                    <tr key={barang.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{barang.nama_barang}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 text-center">
                                            <span className="badge badge-neutral">{barang.satuan}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold text-mono">
                                            {formatCurrency(barang.harga_satuan)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {barang.kategori ? (
                                                <span className="badge badge-info">{barang.kategori}</span>
                                            ) : (
                                                <span className="text-caption">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(barang.id)}
                                                    className="btn-icon"
                                                    title="Edit"
                                                    aria-label={`Edit ${barang.nama_barang}`}
                                                >
                                                    <Icon.Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(barang)}
                                                    className="btn-icon text-red-500 hover:bg-red-50"
                                                    title="Hapus"
                                                    aria-label={`Hapus ${barang.nama_barang}`}
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

            {/* Modal tambah/edit barang */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingBarang ? 'Edit Barang' : 'Tambah Barang'}
                size="2xl"
            >
                <form onSubmit={handleSave} className="flex max-h-[calc(100vh-10rem)] flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin">
                        <p className="text-caption -mt-1">
                            {editingBarang ? 'Perbarui data produk' : 'Tambahkan produk baru ke master barang'}
                        </p>

                        <FormField
                            label="Brand"
                            required
                            hint="Harga produk ini hanya berlaku untuk brand tersebut."
                        >
                            <SelectBox
                                options={brandOptions}
                                value={formBrandId}
                                onChange={setFormBrandId}
                                placeholder="Pilih Brand"
                                ariaLabel="Pilih brand"
                            />
                        </FormField>

                        <FormField label="Nama Barang" htmlFor="barang-nama" required>
                            <input
                                id="barang-nama"
                                type="text"
                                value={namaBarang}
                                onChange={(e) => setNamaBarang(e.target.value)}
                                className="input"
                                placeholder="Contoh: Jersey Fullprint Premium 160/170 GMS"
                            />
                        </FormField>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Satuan" htmlFor="barang-satuan">
                                <input
                                    id="barang-satuan"
                                    type="text"
                                    value={satuan}
                                    onChange={(e) => setSatuan(e.target.value)}
                                    className="input"
                                    placeholder="PCS"
                                />
                            </FormField>
                            <FormField label="Harga Satuan Default">
                                <CurrencyInput
                                    value={hargaSatuan}
                                    onChange={setHargaSatuan}
                                    placeholder="0"
                                />
                            </FormField>
                        </div>

                        <FormField label="Kategori" htmlFor="barang-kategori" aside={<span className="text-xs text-slate-400">Opsional</span>}>
                            <input
                                id="barang-kategori"
                                type="text"
                                value={kategori}
                                onChange={(e) => setKategori(e.target.value)}
                                className="input"
                                placeholder="Contoh: Jersey, Kaos, Hoodie"
                            />
                        </FormField>

                        {/* Harga Tier */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="label !mb-0">Harga Tier (berdasarkan quantity)</label>
                                <button
                                    type="button"
                                    onClick={addTierRow}
                                    className="btn-secondary btn-sm"
                                >
                                    <Icon.Plus className="w-4 h-4" />
                                    Tambah Tier
                                </button>
                            </div>

                            {hargaTiers.length === 0 ? (
                                <div className="text-center py-8 surface">
                                    <Icon.Calculator className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">Belum ada tier harga</p>
                                    <p className="text-xs text-slate-400 mt-1">Harga default akan digunakan untuk semua quantity</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {hargaTiers.map((tier, index) => (
                                        <div key={tier.id} className="flex flex-wrap items-center gap-2 p-3 surface hover:border-brand-200 transition-colors">
                                            {/* Tier Number */}
                                            <span className="w-6 h-6 bg-brand-50 text-brand-600 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                {index + 1}
                                            </span>

                                            {/* Range: Min - Max pcs */}
                                            <div className="flex items-center gap-1.5">
                                                <NumberInput
                                                    value={tier.min_qty}
                                                    onChange={(val) => updateTier(index, 'min_qty', val)}
                                                    placeholder="1"
                                                    className="!w-16 !py-1.5 !px-2 text-center text-sm"
                                                />
                                                <span className="text-slate-400 font-medium">-</span>
                                                <NumberInput
                                                    value={tier.max_qty || 0}
                                                    onChange={(val) => updateTier(index, 'max_qty', val === 0 ? null : val)}
                                                    placeholder="∞"
                                                    allowEmpty
                                                    className="!w-16 !py-1.5 !px-2 text-center text-sm"
                                                />
                                                <span className="text-sm text-slate-500 font-medium">pcs</span>
                                            </div>

                                            {/* Equals Sign */}
                                            <span className="text-brand-500 font-bold text-lg">=</span>

                                            {/* Price */}
                                            <div className="flex items-center gap-1 flex-1 min-w-[8rem]">
                                                <span className="text-sm text-slate-500 font-medium">Rp</span>
                                                <CurrencyInput
                                                    value={tier.harga}
                                                    onChange={(val) => updateTier(index, 'harga', val)}
                                                    placeholder="0"
                                                    showPrefix={false}
                                                    className="!py-1.5 !px-2 text-sm font-semibold"
                                                />
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                onClick={() => removeTierRow(index)}
                                                className="btn-icon text-slate-400 hover:text-red-500"
                                                aria-label="Hapus tier"
                                            >
                                                <Icon.Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-200/70 p-6 pt-4">
                        <ModalFooter
                            onCancel={closeModal}
                            loading={saving}
                            submitText={editingBarang ? 'Simpan Perubahan' : 'Simpan'}
                            variant="primary"
                        />
                    </div>
                </form>
            </Modal>

            {/* Konfirmasi hapus */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Hapus Barang?"
                description={deleteTarget
                    ? `Barang "${deleteTarget.nama_barang}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
                    : undefined}
                confirmText="Hapus"
                tone="danger"
                loading={deleting}
            />
        </>
    )
}
