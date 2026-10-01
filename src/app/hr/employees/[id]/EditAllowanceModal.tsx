'use client'

import { useState } from 'react'
import { updateAllowance } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CurrencyInput, SelectBox } from '@/components/ui'

interface Allowance {
    id: string
    allowance_type: string
    amount: number
    calculation_method: string
}

interface EditAllowanceModalProps {
    allowance: Allowance
    employeeId: string
    onClose: () => void
}

export default function EditAllowanceModal({ allowance, employeeId, onClose }: EditAllowanceModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    // Nilai SelectBox (tidak ikut FormData, dikirim via hidden input)
    const [allowanceType, setAllowanceType] = useState(allowance.allowance_type)
    const [calculationMethod, setCalculationMethod] = useState(allowance.calculation_method)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await updateAllowance(allowance.id, employeeId, formData)

        if (result.success) {
            toast.success('Tunjangan berhasil diupdate!')
            onClose()
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal update tunjangan')
        }

        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Edit Tunjangan</h2>
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
                            Jenis Tunjangan <span className="text-red-500">*</span>
                        </label>
                        {/* Nilai SelectBox dikirim lewat hidden input agar tetap ikut FormData */}
                        <SelectBox
                            options={[
                                { value: 'transport', label: 'Transport' },
                                { value: 'meal', label: 'Makan' },
                                { value: 'position', label: 'Jabatan' },
                                { value: 'other', label: 'Lainnya' },
                            ]}
                            value={allowanceType}
                            onChange={setAllowanceType}
                            searchable={false}
                            ariaLabel="Jenis tunjangan"
                        />
                        <input type="hidden" name="type" value={allowanceType} />
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
                            defaultValue={allowance.amount}
                            className="!px-3 !py-2.5 !rounded-xl !bg-white !border-slate-200 focus:!border-brand-500 focus:!ring-2 focus:!ring-brand-500/15"
                        />
                    </div>

                    {/* Calculation Method */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Metode Hitung <span className="text-red-500">*</span>
                        </label>
                        <SelectBox
                            options={[
                                { value: 'per_day', label: 'Per Hari' },
                                { value: 'per_month', label: 'Per Bulan' },
                            ]}
                            value={calculationMethod}
                            onChange={setCalculationMethod}
                            searchable={false}
                            ariaLabel="Metode hitung"
                        />
                        <input type="hidden" name="calculation_method" value={calculationMethod} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
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
        </div>
    )
}
