'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Modal, ModalFooter, FormField, CountryCodePicker } from '@/components/ui'
import {
    DEFAULT_COUNTRY_CODE,
    DEFAULT_COUNTRY_ISO,
    getDialByIso,
    getIsoByDial,
} from '@/lib/data/country-codes'
import { normalizePhone, formatPhoneInput } from '@/lib/utils/phone'

interface CustomerWithStats {
    id: string
    name: string
    phone: string | null
    country_code: string | null
    alamat?: string | null
    status: 'pending' | 'active'
    phone_normalized: string | null
    portal_token: string | null
    created_at: string
    order_count: number
    total_quantity: number
    total_revenue: number
}

interface EditCustomerModalProps {
    customer: CustomerWithStats | null
    isOpen: boolean
    onClose: () => void
    onCustomerUpdated: (customer: CustomerWithStats) => void
}

export default function EditCustomerModal({ customer, isOpen, onClose, onCustomerUpdated }: EditCustomerModalProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
    const [alamat, setAlamat] = useState('')

    const supabase = createClient()

    // Populate form when customer changes
    useEffect(() => {
        if (customer) {
            setName(customer.name || '')
            // Tampilkan nomor nasional saja (tanpa awalan + / kode negara).
            const cc = (customer.country_code || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE
            setPhone(
                customer.phone_normalized?.startsWith(cc)
                    ? customer.phone_normalized.slice(cc.length)
                    : (customer.phone || ''),
            )
            setCountryIso(getIsoByDial(customer.country_code || DEFAULT_COUNTRY_ISO))
            setAlamat(customer.alamat || '')
        }
    }, [customer])

    if (!customer) return null

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

            // Check if phone already exists (exclude current customer)
            if (normalized) {
                const { data: existing } = await supabase
                    .from('customers')
                    .select('id, name')
                    .eq('phone_normalized', normalized)
                    .neq('id', customer.id)
                    .maybeSingle()

                if (existing) {
                    toast.warning(`No. HP ini sudah digunakan customer lain: ${existing.name}`)
                    setLoading(false)
                    return
                }
            }

            const { data: updated, error } = await supabase
                .from('customers')
                .update({
                    name: name.trim(),
                    phone: phoneTrim || null,
                    country_code: getDialByIso(countryIso),
                    alamat: alamat.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', customer.id)
                .select('*')
                .single()

            if (error) {
                console.error('Error:', error)
                toast.error(`Gagal menyimpan: ${error.message}`)
                return
            }

            onCustomerUpdated({
                ...customer,
                name: updated.name,
                phone: updated.phone,
                country_code: updated.country_code ?? null,
                alamat: updated.alamat,
                status: updated.status ?? 'active',
                phone_normalized: updated.phone_normalized ?? null,
                portal_token: updated.portal_token ?? null,
            })
            onClose()
            toast.success('Data customer berhasil diperbarui!')
        } catch (err) {
            console.error('Error:', err)
            toast.error('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Customer">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Name */}
                <FormField label="Nama Customer" htmlFor="edit-customer-name" required>
                    <input
                        id="edit-customer-name"
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
                    htmlFor="edit-customer-phone"
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
                            id="edit-customer-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(formatPhoneInput(e.target.value, getDialByIso(countryIso)))}
                            placeholder="81234567890"
                            className="input flex-1"
                        />
                    </div>
                </FormField>

                {/* Alamat */}
                <FormField label="Alamat Lengkap" htmlFor="edit-customer-alamat" aside={<span className="text-xs text-slate-400">Opsional</span>}>
                    <textarea
                        id="edit-customer-alamat"
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value)}
                        placeholder="Jl. Raya No. 123, Sukasari"
                        rows={2}
                        className="input resize-none"
                    />
                </FormField>

                <ModalFooter
                    onCancel={onClose}
                    loading={loading}
                    submitText="Simpan Perubahan"
                    variant="primary"
                />
            </form>
        </Modal>
    )
}
