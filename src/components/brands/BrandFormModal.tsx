'use client'

import { useMemo, useRef, useState } from 'react'
import { Brand, BrandInsert } from '@/types/database'
import { createBrand, updateBrand } from '@/lib/actions/brands'
import { createClient } from '@/lib/supabase/client'
import { resizeImageToSquare } from '@/lib/utils/image'
import { toast } from 'sonner'
import { Modal, ModalFooter, FormField, SelectBox } from '@/components/ui'
import type { SelectOption } from '@/components/ui'

interface BrandFormModalProps {
    isOpen: boolean
    onClose: () => void
    brand?: Brand  // Jika diisi berarti sedang mengedit
    onBrandCreated?: (brand: Brand) => void
    onBrandUpdated?: (brand: Brand) => void
}

const INVOICE_TEMPLATES: SelectOption[] = [
    { value: 'invoice_01', label: 'Modern — header berwarna' },
    { value: 'invoice_02', label: 'Minimal — bersih dan hemat tinta' },
    { value: 'invoice_03', label: 'Bold — identitas brand dominan' },
]

const KUITANSI_TEMPLATES: SelectOption[] = [
    { value: 'receipt_01', label: 'Formal — pembayaran jelas' },
    { value: 'receipt_02', label: 'Minimal — sederhana' },
    { value: 'receipt_03', label: 'Compact — hemat ruang' },
]

/**
 * Pembungkus tipis: hanya merender form saat modal terbuka.
 * `key` memastikan state form ter-reset setiap kali brand yang diedit berganti,
 * sehingga tidak perlu menyinkronkan state lewat effect.
 */
export default function BrandFormModal(props: BrandFormModalProps) {
    if (!props.isOpen) return null
    return (
        <BrandForm
            key={props.brand?.id ?? 'new'}
            brand={props.brand}
            onClose={props.onClose}
            onBrandCreated={props.onBrandCreated}
            onBrandUpdated={props.onBrandUpdated}
        />
    )
}

type BrandFormProps = Omit<BrandFormModalProps, 'isOpen'>

function BrandForm({ onClose, brand, onBrandCreated, onBrandUpdated }: BrandFormProps) {
    const isEditing = !!brand
    const supabase = useMemo(() => createClient(), [])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState(() => ({
        code: brand?.code || '',
        name: brand?.name || '',
        company_name: brand?.company_name || '',
        address: brand?.address || '',
        phone: brand?.phone || '',
        email: brand?.email || '',
        logo_url: brand?.logo_url || '',
        bank_name: brand?.bank_name || '',
        account_name: brand?.account_name || '',
        account_number: brand?.account_number || '',
        invoice_prefix: brand?.invoice_prefix || '',
        kuitansi_prefix: brand?.kuitansi_prefix || '',
        spk_prefix: brand?.spk_prefix || '',
        primary_color: brand?.primary_color || '#1e293b',
        accent_color: brand?.accent_color || '#f97316',
        default_invoice_template_id: brand?.default_invoice_template_id || 'invoice_01',
        default_kuitansi_template_id: brand?.default_kuitansi_template_id || 'receipt_01',
    }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Upload logo: resize ke 180x180 (ringan), lalu simpan ke Supabase Storage
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('File harus berupa gambar')
            return
        }

        setUploading(true)
        setError(null)
        try {
            const resized = await resizeImageToSquare(file, 180)
            const fileName = `logo-${Date.now()}.png`

            const { error: uploadError } = await supabase.storage
                .from('brand-logos')
                .upload(fileName, resized, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('brand-logos')
                .getPublicUrl(fileName)

            setFormData(prev => ({ ...prev, logo_url: publicUrl }))
        } catch (err) {
            setError(err instanceof Error ? `Gagal upload logo: ${err.message}` : 'Gagal upload logo')
        } finally {
            setUploading(false)
            // Biarkan file yang sama bisa dipilih ulang
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Prefix otomatis dari kode brand bila dikosongkan
            const data = {
                ...formData,
                invoice_prefix: formData.invoice_prefix || formData.code.toUpperCase(),
                kuitansi_prefix: formData.kuitansi_prefix || formData.code.toUpperCase(),
                spk_prefix: formData.spk_prefix || `SPK-${formData.code.toUpperCase()}`,
            }

            if (isEditing && brand) {
                const updated = await updateBrand(brand.id, data)
                onBrandUpdated?.(updated)
                toast.success('Pengaturan brand dan tampilan dokumen berhasil disimpan')
            } else {
                const created = await createBrand(data as BrandInsert)
                onBrandCreated?.(created)
                toast.success('Brand berhasil dibuat')
            }

            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={isEditing ? 'Edit Brand' : 'Tambah Brand Baru'}
            size="2xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6 scrollbar-thin">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* 1. Informasi Dasar */}
                    <section className="space-y-4">
                        <SectionTitle step={1} title="Informasi Dasar" />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                label="Kode Brand"
                                htmlFor="brand-code"
                                required
                                hint="Max 5 karakter, huruf kapital"
                            >
                                <input
                                    id="brand-code"
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                    maxLength={5}
                                    placeholder="KZO"
                                    className="input uppercase"
                                />
                            </FormField>
                            <FormField label="Nama Brand" htmlFor="brand-name" required>
                                <input
                                    id="brand-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Raidwear Apparel"
                                    className="input"
                                />
                            </FormField>
                        </div>

                        <FormField
                            label="Logo"
                            htmlFor="brand-logo"
                            hint="Upload otomatis di-resize ke 180×180 px agar ringan"
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    id="brand-logo"
                                    type="url"
                                    name="logo_url"
                                    value={formData.logo_url}
                                    onChange={handleChange}
                                    placeholder="https://example.com/logo.png"
                                    className="input flex-1"
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="btn btn-secondary shrink-0"
                                >
                                    {uploading ? 'Mengunggah...' : 'Upload'}
                                </button>
                            </div>
                            {formData.logo_url && (
                                <div className="mt-2 inline-block rounded-lg bg-slate-50 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={formData.logo_url}
                                        alt="Pratinjau logo"
                                        className="h-12 object-contain"
                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                    />
                                </div>
                            )}
                        </FormField>
                    </section>

                    {/* 2. Informasi Perusahaan */}
                    <section className="space-y-4">
                        <SectionTitle step={2} title="Informasi Perusahaan" />

                        <FormField label="Nama Perusahaan" htmlFor="brand-company" required>
                            <input
                                id="brand-company"
                                type="text"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                required
                                placeholder="PT. Raidwear Indonesia"
                                className="input"
                            />
                        </FormField>

                        <FormField label="Alamat" htmlFor="brand-address">
                            <textarea
                                id="brand-address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                                className="input resize-none"
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Telepon" htmlFor="brand-phone">
                                <input
                                    id="brand-phone"
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="0812-3456-7890"
                                    className="input"
                                />
                            </FormField>
                            <FormField label="Email" htmlFor="brand-email">
                                <input
                                    id="brand-email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="info@example.com"
                                    className="input"
                                />
                            </FormField>
                        </div>
                    </section>

                    {/* 3. Informasi Bank */}
                    <section className="space-y-4">
                        <SectionTitle step={3} title="Informasi Bank" />

                        <div className="grid grid-cols-3 gap-4">
                            <FormField label="Nama Bank" htmlFor="brand-bank-name">
                                <input
                                    id="brand-bank-name"
                                    type="text"
                                    name="bank_name"
                                    value={formData.bank_name}
                                    onChange={handleChange}
                                    placeholder="BCA"
                                    className="input"
                                />
                            </FormField>
                            <FormField label="Atas Nama" htmlFor="brand-account-name">
                                <input
                                    id="brand-account-name"
                                    type="text"
                                    name="account_name"
                                    value={formData.account_name}
                                    onChange={handleChange}
                                    placeholder="Nama Akun"
                                    className="input"
                                />
                            </FormField>
                            <FormField label="No. Rekening" htmlFor="brand-account-number">
                                <input
                                    id="brand-account-number"
                                    type="text"
                                    name="account_number"
                                    value={formData.account_number}
                                    onChange={handleChange}
                                    placeholder="1234567890"
                                    className="input"
                                />
                            </FormField>
                        </div>
                    </section>

                    {/* 4. Prefix Dokumen */}
                    <section className="space-y-4">
                        <SectionTitle step={4} title="Prefix Dokumen" />
                        <p className="text-xs text-slate-500">Kosongkan untuk menggunakan kode brand sebagai prefix</p>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                label="Invoice Prefix"
                                htmlFor="brand-invoice-prefix"
                                hint={`Contoh: ${formData.invoice_prefix || formData.code.toUpperCase() || 'KZO'}/260121/CUST`}
                            >
                                <input
                                    id="brand-invoice-prefix"
                                    type="text"
                                    name="invoice_prefix"
                                    value={formData.invoice_prefix}
                                    onChange={handleChange}
                                    placeholder={formData.code.toUpperCase() || 'KZO'}
                                    className="input uppercase"
                                />
                            </FormField>
                            <FormField
                                label="Kuitansi Prefix"
                                htmlFor="brand-kuitansi-prefix"
                                hint={`Contoh: ${formData.kuitansi_prefix || formData.code.toUpperCase() || 'KZO'}-001`}
                            >
                                <input
                                    id="brand-kuitansi-prefix"
                                    type="text"
                                    name="kuitansi_prefix"
                                    value={formData.kuitansi_prefix}
                                    onChange={handleChange}
                                    placeholder={formData.code.toUpperCase() || 'KZO'}
                                    className="input uppercase"
                                />
                            </FormField>
                            <FormField
                                label="SPK Prefix"
                                htmlFor="brand-spk-prefix"
                                hint={`Contoh: ${formData.spk_prefix || `SPK-${formData.code.toUpperCase()}` || 'SPK-KZO'}-001`}
                            >
                                <input
                                    id="brand-spk-prefix"
                                    type="text"
                                    name="spk_prefix"
                                    value={formData.spk_prefix}
                                    onChange={handleChange}
                                    placeholder={`SPK-${formData.code.toUpperCase()}`}
                                    className="input uppercase"
                                />
                            </FormField>
                        </div>
                    </section>

                    {/* 5. Tampilan Dokumen */}
                    <section className="space-y-4">
                        <SectionTitle step={5} title="Tampilan Dokumen" />
                        <p className="text-xs text-slate-500">Pilih layout yang akan digunakan saat PDF dibuat untuk brand ini.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Layout Invoice">
                                <SelectBox
                                    options={INVOICE_TEMPLATES}
                                    value={formData.default_invoice_template_id}
                                    onChange={(value) => setFormData(prev => ({ ...prev, default_invoice_template_id: value }))}
                                    searchable={false}
                                    ariaLabel="Layout invoice"
                                />
                            </FormField>
                            <FormField label="Layout Kuitansi">
                                <SelectBox
                                    options={KUITANSI_TEMPLATES}
                                    value={formData.default_kuitansi_template_id}
                                    onChange={(value) => setFormData(prev => ({ ...prev, default_kuitansi_template_id: value }))}
                                    searchable={false}
                                    ariaLabel="Layout kuitansi"
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Warna Utama" htmlFor="brand-primary-color">
                                <input
                                    id="brand-primary-color"
                                    type="color"
                                    name="primary_color"
                                    value={formData.primary_color}
                                    onChange={handleChange}
                                    className="input h-10 p-1"
                                />
                            </FormField>
                            <FormField label="Warna Aksen" htmlFor="brand-accent-color">
                                <input
                                    id="brand-accent-color"
                                    type="color"
                                    name="accent_color"
                                    value={formData.accent_color}
                                    onChange={handleChange}
                                    className="input h-10 p-1"
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="border-t border-slate-200 px-6 py-4">
                    <ModalFooter
                        onCancel={onClose}
                        loading={loading}
                        submitText={isEditing ? 'Simpan Perubahan' : 'Tambah Brand'}
                    />
                </div>
            </form>
        </Modal>
    )
}

function SectionTitle({ step, title }: { step: number; title: string }) {
    return (
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {step}
            </span>
            {title}
        </h3>
    )
}
