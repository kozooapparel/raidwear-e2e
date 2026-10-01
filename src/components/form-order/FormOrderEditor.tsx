'use client'

import { useState } from 'react'
import { Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { ProductionSpecs, OrderWithCustomer } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { ImageDropzone, NumberInput } from '@/components/ui'
import { getDeadlineProduksi, formatTanggal, PRODUKSI_DURATION_DAYS } from '@/lib/form-order'

interface FormOrderEditorProps {
    order: OrderWithCustomer
    onSave: (data: { production_specs: ProductionSpecs }) => Promise<void>
    isLoading?: boolean
}

const EMPTY_SPECS: ProductionSpecs = {
    jenis_produk: '',
    jenis_bahan: '',
    pola_desain: '',
    model_kerah: '',
    model_lengan: '',
    jumlah_produksi: 0,
    kebutuhan_bahan_meter: 0,
    kebutuhan_bahan_kg: 0,
    mockup_image_url: '',
    list_order_image_urls: [],
    kerah_image_url: '',
}

interface ImageSlotProps {
    title: string
    url?: string | null
    slot: 'collar' | 'mockup'
    active: boolean
    uploading: boolean
    onSelectTarget: (slot: 'collar' | 'mockup') => void
    onPreview: (url: string) => void
    onRemove: () => void
    onFile: (file: File, slot: 'collar' | 'mockup') => void
    className?: string
}

// Didefinisikan di level modul (bukan di dalam FormOrderEditor) supaya tidak
// di-unmount/remount saat state berubah — jika tidak, dialog file dibatalkan.
function ImageSlot({
    title,
    url,
    slot,
    active,
    uploading,
    onSelectTarget,
    onPreview,
    onRemove,
    onFile,
    className,
}: ImageSlotProps) {
    return (
        <div
            onClick={() => onSelectTarget(slot)}
            className={`rounded-xl border overflow-hidden transition-colors ${active ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200'
                } ${className || ''}`}
        >
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{title}</p>
                {url && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemove()
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus gambar"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            <div className="p-3">
                {url ? (
                    <button
                        type="button"
                        className="block w-full"
                        onClick={() => onPreview(url)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt={title}
                            className="w-full h-44 object-contain rounded-lg bg-slate-50 border border-slate-200"
                        />
                    </button>
                ) : (
                    <ImageDropzone
                        label={uploading ? 'Mengupload...' : `Klik kolom ini lalu Ctrl+V, atau upload ${title}`}
                        onFileSelect={file => onFile(file, slot)}
                        disabled={uploading}
                        enablePaste={active}
                    />
                )}
            </div>
        </div>
    )
}

export default function FormOrderEditor({ order, onSave, isLoading = false }: FormOrderEditorProps) {
    const [specs, setSpecs] = useState<ProductionSpecs>(() => ({
        ...EMPTY_SPECS,
        ...(order.production_specs || {}),
    }))
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    // Ctrl+V hanya boleh masuk ke satu kolom, jika tidak satu gambar terpaste ke semua kolom.
    const [pasteTarget, setPasteTarget] = useState<'collar' | 'mockup' | 'list'>('list')

    const supabase = createClient()

    // Kolom gambar berisi data lama agar tidak hilang
    const collarImages = specs.kerah_image_url
        ? [specs.kerah_image_url]
        : []
    const mockupImages = specs.mockup_image_url
        ? [specs.mockup_image_url]
        : []
    const listOrderImages = specs.list_order_image_urls || []

    const setField = (key: keyof ProductionSpecs, value: unknown) => {
        setSpecs(prev => ({ ...prev, [key]: value }))
    }

    const uploadImage = async (file: File, type: 'collar' | 'mockup' | 'list') => {
        setUploading(type)
        try {
            const fileExt = (file.name.split('.').pop() || 'png').toLowerCase()
            const fileName = `${order.id}/${type}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('order-assets')
                .upload(fileName, file, { contentType: file.type })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                toast.error(`Gagal upload: ${uploadError.message}`)
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('order-assets')
                .getPublicUrl(fileName)

            if (type === 'collar') {
                setField('kerah_image_url', publicUrl)
                toast.success('Gambar kerah berhasil diupload')
            } else if (type === 'mockup') {
                setField('mockup_image_url', publicUrl)
                toast.success('Gambar mockup berhasil diupload')
            } else {
                setField('list_order_image_urls', [...listOrderImages, publicUrl])
                toast.success('Gambar list order berhasil diupload')
            }
        } catch (err) {
            console.error('Upload failed:', err)
            toast.error('Upload gagal: terjadi kesalahan')
        } finally {
            setUploading(null)
        }
    }

    const removeImage = (type: 'collar' | 'mockup' | 'list', url?: string) => {
        if (type === 'collar') {
            setField('kerah_image_url', '')
        } else if (type === 'mockup') {
            setField('mockup_image_url', '')
        } else if (url) {
            setField('list_order_image_urls', listOrderImages.filter(u => u !== url))
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave({ production_specs: specs })
        } finally {
            setSaving(false)
        }
    }

    const fieldInput = 'input w-full'
    const fieldLabel = 'block text-xs font-semibold text-slate-600 mb-1'

    return (
        <div className="space-y-5">
            {/* Header: Logo brand + FORM ORDER PRODUKSI (otomatis) */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-brand-600 to-brand-700 flex items-center gap-4">
                    {order.brand?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={order.brand.logo_url}
                            alt={order.brand.name || 'Logo brand'}
                            className="w-12 h-12 object-contain bg-white rounded-lg p-1"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                            {(order.brand?.name || 'R')?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">FORM ORDER PRODUKSI</h2>
                        <p className="text-brand-100 text-xs">
                            {order.brand?.name || ''}{order.brand?.name ? ' · ' : ''}
                            {order.nama_po || order.spk_number || 'Order Produksi'}
                        </p>
                    </div>
                </div>

                {/* Data customer (otomatis) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                    <div className="p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Customer</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{order.customer?.name || '-'}</p>
                    </div>
                    <div className="p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tanggal Order</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{formatTanggal(order.created_at)}</p>
                    </div>
                    <div className="p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Deadline Produksi</p>
                        <p className="text-sm font-semibold text-brand-700 mt-1">
                            {formatTanggal(getDeadlineProduksi(order.created_at))}
                            <span className="block text-[10px] font-normal text-slate-400">
                                {PRODUKSI_DURATION_DAYS} hari sejak order dibuat
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Layout 2 kolom: kanan atas = list order, kiri atas = form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Kiri: kolom form (detail produk + kebutuhan produksi) */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Detail Produk */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800">Detail Produk</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={fieldLabel}>Jenis Produk</label>
                                <input
                                    type="text"
                                    className={fieldInput}
                                    placeholder="Contoh: Jersey / Polo / Kaos"
                                    value={specs.jenis_produk || ''}
                                    onChange={e => setField('jenis_produk', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Jenis Bahan</label>
                                <input
                                    type="text"
                                    className={fieldInput}
                                    placeholder="Contoh: Milano Premium / Drifit"
                                    value={specs.jenis_bahan || ''}
                                    onChange={e => setField('jenis_bahan', e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={fieldLabel}>Pola Baju / Desain</label>
                                <input
                                    type="text"
                                    className={fieldInput}
                                    placeholder="Contoh: Polos / Kombinasi / Rib"
                                    value={specs.pola_desain || ''}
                                    onChange={e => setField('pola_desain', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Model Kerah</label>
                                <input
                                    type="text"
                                    className={fieldInput}
                                    placeholder="Contoh: O-Neck / V-Neck / Polo"
                                    value={specs.model_kerah || ''}
                                    onChange={e => setField('model_kerah', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Model Lengan</label>
                                <input
                                    type="text"
                                    className={fieldInput}
                                    placeholder="Contoh: Pendek / Panjang / Tanpa Lengan"
                                    value={specs.model_lengan || ''}
                                    onChange={e => setField('model_lengan', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Jumlah Produksi (pcs)</label>
                                <NumberInput
                                    min={0}
                                    className={fieldInput}
                                    placeholder="0"
                                    value={specs.jumlah_produksi ?? 0}
                                    onChange={v => setField('jumlah_produksi', v)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kebutuhan Produksi */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800">Kebutuhan Produksi</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={fieldLabel}>Kebutuhan Bahan (meter)</label>
                                <NumberInput
                                    min={0}
                                    decimal
                                    className={fieldInput}
                                    placeholder="0"
                                    value={specs.kebutuhan_bahan_meter ?? 0}
                                    onChange={v => setField('kebutuhan_bahan_meter', v)}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Kebutuhan Bahan (kg)</label>
                                <NumberInput
                                    min={0}
                                    decimal
                                    className={fieldInput}
                                    placeholder="0"
                                    value={specs.kebutuhan_bahan_kg ?? 0}
                                    onChange={v => setField('kebutuhan_bahan_kg', v)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kerah (kiri bawah) + Mockup (kanan bawah) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ImageSlot
                            title="Kerah"
                            url={collarImages[0]}
                            slot="collar"
                            active={pasteTarget === 'collar'}
                            uploading={uploading !== null}
                            onSelectTarget={setPasteTarget}
                            onPreview={setPreviewImage}
                            onRemove={() => removeImage('collar')}
                            onFile={uploadImage}
                        />
                        <ImageSlot
                            title="Mockup"
                            url={mockupImages[0]}
                            slot="mockup"
                            active={pasteTarget === 'mockup'}
                            uploading={uploading !== null}
                            onSelectTarget={setPasteTarget}
                            onPreview={setPreviewImage}
                            onRemove={() => removeImage('mockup')}
                            onFile={uploadImage}
                        />
                    </div>
                </div>

                {/* Kanan atas: List Order — memanjang ke bawah */}
                <div
                    onClick={() => setPasteTarget('list')}
                    className={`rounded-xl border overflow-hidden h-fit transition-colors ${pasteTarget === 'list' ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200'
                        }`}
                >
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800">List Order</h3>
                    </div>
                    <div className="p-3 space-y-3">
                        <ImageDropzone
                            label={uploading === 'list' ? 'Mengupload...' : 'Klik kolom ini lalu Ctrl+V, atau upload List Order'}
                            onFileSelect={file => uploadImage(file, 'list')}
                            disabled={uploading !== null}
                            enablePaste={pasteTarget === 'list'}
                        />
                        {listOrderImages.length > 0 && (
                            <div className="space-y-3">
                                {listOrderImages.map((url, idx) => (
                                    <div key={url} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                        <button
                                            type="button"
                                            className="block w-full"
                                            onClick={() => setPreviewImage(url)}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`List order ${idx + 1}`}
                                                className="w-full object-contain max-h-64"
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeImage('list', url)}
                                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/90 shadow text-slate-500 hover:text-red-500 transition-colors"
                                            title="Hapus gambar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || isLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                    <Upload className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Form Order'}
                </button>
            </div>

            {/* Lightbox preview */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="w-full max-h-[85vh] object-contain rounded-lg bg-white"
                        />
                        <button
                            type="button"
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-3 -right-3 p-2 rounded-full bg-white shadow-lg text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
