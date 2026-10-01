'use client'

import { useState } from 'react'
import { addBonus, updateBonus, deleteBonus } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CurrencyInput, NumberInput, SelectBox, ConfirmDialog } from '@/components/ui'

// Kelas input seragam mengikuti design system
const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15'

interface Bonus {
    id: string
    bonus_type: string
    amount: number
    period_month: number
    period_year: number
    reason: string | null
    status: string
}

interface BonusModalProps {
    employeeId: string
    bonus?: Bonus
    onClose: () => void
}

export default function BonusModal({ employeeId, bonus, onClose }: BonusModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const isEdit = !!bonus

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    // Nilai pilihan SelectBox (tidak ikut FormData, dikirim via hidden input)
    const [bonusType, setBonusType] = useState(bonus?.bonus_type || '')
    const [periodMonth, setPeriodMonth] = useState(String(bonus?.period_month || currentMonth))
    // Konfirmasi hapus bonus
    const [confirmDelete, setConfirmDelete] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Validasi manual karena nilai SelectBox dikirim lewat hidden input
        if (!bonusType) {
            toast.error('Pilih jenis bonus terlebih dahulu')
            return
        }

        setLoading(true)

        const formData = new FormData(e.currentTarget)

        const result = isEdit
            ? await updateBonus(bonus.id, employeeId, formData)
            : await addBonus(employeeId, formData)

        if (result.success) {
            toast.success(isEdit ? 'Bonus berhasil diupdate!' : 'Bonus berhasil ditambahkan!')
            onClose()
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal menyimpan bonus')
        }

        setLoading(false)
    }

    const handleDelete = async () => {
        if (!bonus) return

        setLoading(true)
        const result = await deleteBonus(bonus.id, employeeId)

        if (result.success) {
            toast.success('Bonus berhasil dihapus!')
            onClose()
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal menghapus bonus')
        }

        setLoading(false)
        setConfirmDelete(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isEdit ? 'Edit Bonus' : 'Tambah Bonus'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn-icon btn-ghost"
                        aria-label="Tutup"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Jenis Bonus <span className="text-red-500">*</span>
                        </label>
                        {/* Nilai SelectBox dikirim lewat hidden input agar tetap ikut FormData */}
                        <SelectBox
                            options={[
                                { value: '', label: 'Pilih Jenis' },
                                { value: 'performance', label: 'Performa' },
                                { value: 'target', label: 'Target' },
                                { value: 'holiday', label: 'THR' },
                                { value: 'other', label: 'Lainnya' },
                            ]}
                            value={bonusType}
                            onChange={setBonusType}
                            searchable={false}
                            ariaLabel="Jenis bonus"
                        />
                        <input type="hidden" name="bonus_type" value={bonusType} />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nominal (Rp) <span className="text-red-500">*</span>
                        </label>
                        <CurrencyInput
                            name="amount"
                            required
                            min={0}
                            defaultValue={bonus?.amount || ''}
                            className="!px-3 !py-2.5 !rounded-xl !bg-white !border-slate-200 focus:!border-brand-500 focus:!ring-2 focus:!ring-brand-500/15"
                        />
                    </div>

                    {/* Period */}
                    {!isEdit && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Bulan <span className="text-red-500">*</span>
                                </label>
                                <SelectBox
                                    options={[...Array(12)].map((_, i) => ({
                                        value: String(i + 1),
                                        label: new Date(2000, i).toLocaleDateString('id-ID', { month: 'long' }),
                                    }))}
                                    value={periodMonth}
                                    onChange={setPeriodMonth}
                                    searchable={false}
                                    ariaLabel="Bulan periode"
                                />
                                <input type="hidden" name="period_month" value={periodMonth} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tahun <span className="text-red-500">*</span>
                                </label>
                                <NumberInput
                                    name="period_year"
                                    required
                                    groupThousands={false}
                                    defaultValue={currentYear}
                                    min={currentYear - 1}
                                    max={currentYear + 1}
                                    className="!px-3 !py-2.5 !rounded-xl !bg-white !border-slate-200 focus:!border-brand-500 focus:!ring-2 focus:!ring-brand-500/15"
                                />
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Keterangan
                        </label>
                        <textarea
                            name="reason"
                            rows={2}
                            defaultValue={bonus?.reason || ''}
                            placeholder="Bonus performa Q4, dll"
                            className={inputClass}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {isEdit && bonus?.status === 'pending' && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                disabled={loading}
                                className="btn-danger"
                            >
                                Hapus
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 btn-secondary"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-primary"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Konfirmasi hapus bonus */}
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => { if (!loading) setConfirmDelete(false) }}
                onConfirm={handleDelete}
                title="Hapus bonus ini?"
                description="Tindakan ini tidak bisa dibatalkan."
                confirmText="Hapus"
                tone="danger"
                loading={loading}
            />
        </div>
    )
}
