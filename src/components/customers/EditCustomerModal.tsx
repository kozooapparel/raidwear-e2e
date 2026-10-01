'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Modal, ModalFooter, FormField } from '@/components/ui'

interface CustomerWithStats {
    id: string
    name: string
    phone: string
    alamat?: string | null
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
    const [alamat, setAlamat] = useState('')

    const supabase = createClient()

    // Populate form when customer changes
    useEffect(() => {
        if (customer) {
            setName(customer.name || '')
            setPhone(customer.phone || '')
            setAlamat(customer.alamat || '')
        }
    }, [customer])

    if (!customer) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !phone.trim()) {
            toast.warning('Nama dan No. HP wajib diisi')
            return
        }

        setLoading(true)
        try {
            // Check if phone already exists (exclude current customer)
            const { data: existing } = await supabase
                .from('customers')
                .select('id, name')
                .eq('phone', phone.trim())
                .neq('id', customer.id)
                .single()

            if (existing) {
                toast.warning(`No. HP ini sudah digunakan customer lain: ${existing.name}`)
                setLoading(false)
                return
            }

            const { data: updated, error } = await supabase
                .from('customers')
                .update({
                    name: name.trim(),
                    phone: phone.trim(),
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
                alamat: updated.alamat,
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
                    required
                    hint="Gunakan format tanpa spasi atau tanda hubung"
                >
                    <input
                        id="edit-customer-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className="input"
                        required
                    />
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
