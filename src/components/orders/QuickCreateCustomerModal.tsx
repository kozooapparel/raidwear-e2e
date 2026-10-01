'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'
import { toast } from 'sonner'
import { Modal, ModalFooter } from '@/components/ui'

interface QuickCreateCustomerModalProps {
    isOpen: boolean
    onClose: () => void
    /** Nama yang sudah diketik di picker, langsung dipakai sebagai nilai awal */
    initialName?: string
    /** Customer siap dipakai (baru dibuat, atau data lama jika No. HP sudah terdaftar) */
    onSaved: (customer: Customer) => void
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

/**
 * Form singkat untuk membuat customer baru langsung dari alur order,
 * tanpa berpindah halaman.
 */
export default function QuickCreateCustomerModal({
    isOpen,
    onClose,
    initialName = '',
    onSaved,
}: QuickCreateCustomerModalProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [alamat, setAlamat] = useState('')
    const [saving, setSaving] = useState(false)

    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        if (!isOpen) return
        setName(initialName)
        setPhone('')
        setAlamat('')
        setSaving(false)
    }, [isOpen, initialName])

    const handleSave = async () => {
        const namaCustomer = name.trim()
        const noHp = phone.trim()

        if (!namaCustomer) {
            toast.warning('Nama customer harus diisi')
            return
        }
        if (!noHp) {
            toast.warning('No. HP harus diisi')
            return
        }

        setSaving(true)
        try {
            // No. HP dipakai sebagai identitas: kalau sudah terdaftar, langsung pakai data lama
            const { data: existing } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', noHp)
                .maybeSingle()

            if (existing) {
                toast.info(`Customer sudah terdaftar: ${existing.name}`)
                onSaved(existing as Customer)
                onClose()
                return
            }

            const { data: inserted, error } = await supabase
                .from('customers')
                .insert({
                    name: namaCustomer,
                    phone: noHp,
                    alamat: alamat.trim() || null,
                })
                .select('*')
                .single()

            if (error) {
                console.error('Error creating customer:', error)
                toast.error(`Gagal menyimpan: ${error.message}`)
                return
            }

            toast.success('Customer baru berhasil disimpan')
            onSaved(inserted as Customer)
            onClose()
        } catch (error) {
            console.error('Error creating customer:', error)
            toast.error('Gagal menyimpan customer')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Customer Baru" size="md">
            <div
                className="space-y-4 p-5"
                onKeyDown={(e) => {
                    const isTextarea = (e.target as HTMLElement).tagName === 'TEXTAREA'
                    if (e.key === 'Enter' && !e.shiftKey && !isTextarea) {
                        e.preventDefault()
                        handleSave()
                    }
                }}
            >
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Nama Customer <span className="text-brand-600">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: PT Maju Jaya"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        No. HP <span className="text-brand-600">*</span>
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Alamat <span className="font-normal text-slate-400">(opsional)</span>
                    </label>
                    <textarea
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value)}
                        placeholder="Jl. Raya No. 123, Kota Bandung"
                        rows={3}
                        className={`${inputClass} resize-none`}
                    />
                </div>

                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                    Customer ini akan otomatis dipilih pada order yang sedang dibuat.
                </p>
            </div>

            <div className="px-5 pb-5">
                <ModalFooter
                    type="button"
                    onCancel={onClose}
                    onSubmit={handleSave}
                    submitText="Simpan & Pakai"
                    loading={saving}
                />
            </div>
        </Modal>
    )
}
