'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Modal, ModalFooter, FormField } from '@/components/ui'

interface CustomerWithStats {
    id: string
    name: string
    phone: string
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
    const [alamat, setAlamat] = useState('')

    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !phone.trim()) {
            toast.warning('Nama dan No. HP wajib diisi')
            return
        }

        setLoading(true)
        try {
            // Check if phone already exists
            const { data: existing } = await supabase
                .from('customers')
                .select('id, name')
                .eq('phone', phone.trim())
                .single()

            if (existing) {
                toast.warning(`Customer dengan No. HP ini sudah terdaftar: ${existing.name}`)
                return
            }

            const { data: inserted, error } = await supabase
                .from('customers')
                .insert({
                    name: name.trim(),
                    phone: phone.trim(),
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
                    required
                    hint="Gunakan format tanpa spasi atau tanda hubung"
                >
                    <input
                        id="customer-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className="input"
                        required
                    />
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
