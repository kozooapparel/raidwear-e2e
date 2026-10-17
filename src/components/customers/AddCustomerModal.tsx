'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Modal, ModalFooter, FormField, CountryCodePicker } from '@/components/ui'
import { DEFAULT_COUNTRY_ISO, getDialByIso } from '@/lib/data/country-codes'
import { normalizePhone, formatPhoneInput } from '@/lib/utils/phone'

interface CustomerWithStats {
    id: string
    name: string
    phone: string | null
    country_code: string | null
    status: 'pending' | 'active'
    phone_normalized: string | null
    portal_token: string | null
    created_at: string
    order_count: number
    total_quantity: number
    total_revenue: number
}

interface AddCustomerModalProps {
    isOpen: boolean
    onClose: () => void
    onCustomerCreated?: (customer: CustomerWithStats) => void
}

export default function AddCustomerModal({ isOpen, onClose, onCustomerCreated }: AddCustomerModalProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
    const [alamat, setAlamat] = useState('')

    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.warning('Nama wajib diisi')
            return
        }

        setLoading(true)
        try {
            const phoneTrim = phone.trim()
            const normalized = normalizePhone(phoneTrim, getDialByIso(countryIso))

            // Check if phone already exists (berdasarkan nomor ternormalisasi)
            if (normalized) {
                const { data: existing } = await supabase
                    .from('customers')
                    .select('id, name')
                    .eq('phone_normalized', normalized)
                    .maybeSingle()

                if (existing) {
                    toast.warning(`Customer dengan No. HP ini sudah terdaftar: ${existing.name}`)
                    return
                }
            }

            const { data: inserted, error } = await supabase
                .from('customers')
                .insert({
                    name: name.trim(),
                    phone: phoneTrim || null,
                    country_code: getDialByIso(countryIso),
                    alamat: alamat.trim() || null,
                })
                .select('*')
                .single()

            if (error) {
                console.error('Error:', error)
                toast.error(`Gagal menyimpan: ${error.message}`)
                return
            }

            // Reset form
            setName('')
            setPhone('')
            setAlamat('')
            onCustomerCreated?.({
                id: inserted.id,
                name: inserted.name,
                phone: inserted.phone,
                country_code: inserted.country_code ?? null,
                status: inserted.status ?? 'active',
                phone_normalized: inserted.phone_normalized ?? null,
                portal_token: inserted.portal_token ?? null,
                created_at: inserted.created_at,
                order_count: 0,
                total_quantity: 0,
                total_revenue: 0,
            })
            onClose()
            toast.success('Customer berhasil ditambahkan!')
        } catch (err) {
            console.error('Error:', err)
            toast.error('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Customer Baru">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Name */}
                <FormField label="Nama Customer" htmlFor="customer-name" required>
                    <input
                        id="customer-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="PT Maju Jaya"
                        className="input"
                        required
                    />
                </FormField>

                {/* Phone */}
                <FormField
                    label="No. HP"
                    htmlFor="customer-phone"
                    aside={<span className="text-xs text-slate-400">Opsional</span>}
                >
                    <div className="flex gap-2">
                        <div className="w-32 shrink-0">
                            <CountryCodePicker
                                value={countryIso}
                                onChange={setCountryIso}
                                ariaLabel="Pilih kode negara"
                            />
                        </div>
                        <input
                            id="customer-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(formatPhoneInput(e.target.value, getDialByIso(countryIso)))}
                            placeholder="81234567890"
                            className="input flex-1"
                        />
                    </div>
                </FormField>

                {/* Alamat */}
                <FormField label="Alamat Lengkap" htmlFor="customer-alamat" aside={<span className="text-xs text-slate-400">Opsional</span>}>
                    <textarea
                        id="customer-alamat"
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value)}
                        placeholder="Jl. Raya No. 123, Kota Bandung"
                        rows={3}
                        className="input resize-none"
                    />
                </FormField>

                <ModalFooter
                    onCancel={onClose}
                    loading={loading}
                    submitText="Simpan"
                    variant="primary"
                />
            </form>
        </Modal>
    )
}
