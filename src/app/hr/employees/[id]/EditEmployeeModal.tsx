'use client'

import { useState } from 'react'
import { updateEmployee } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CurrencyInput, SelectBox, ConfirmDialog } from '@/components/ui'

// Kelas input seragam mengikuti design system
const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15'

interface Employee {
    id: string
    nik: string
    full_name: string
    department: string
    position: string
    daily_rate: number
    join_date: string
    bank_account: string | null
    status: string
}

interface EditEmployeeModalProps {
    employee: Employee
    onClose: () => void
}

export default function EditEmployeeModal({ employee, onClose }: EditEmployeeModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    // Nilai SelectBox (tidak ikut FormData, dikirim via hidden input)
    const [department, setDepartment] = useState(employee.department)
    // Konfirmasi nonaktifkan karyawan
    const [confirmDeactivate, setConfirmDeactivate] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await updateEmployee(employee.id, formData)

        if (result.success) {
            toast.success('Data karyawan berhasil diupdate!')
            onClose()
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal update karyawan')
        }

        setLoading(false)
    }

    const handleDeactivate = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.set('full_name', employee.full_name)
        formData.set('department', employee.department)
        formData.set('position', employee.position)
        formData.set('daily_rate', employee.daily_rate.toString())
        formData.set('join_date', employee.join_date)
        formData.set('bank_account', employee.bank_account || '')
        formData.set('status', 'inactive')

        const result = await updateEmployee(employee.id, formData)

        if (result.success) {
            toast.success('Karyawan telah dinonaktifkan!')
            onClose()
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal nonaktifkan karyawan')
        }

        setLoading(false)
        setConfirmDeactivate(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Edit Data Karyawan</h2>
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
                    {/* NIK (readonly) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            NIK (Tidak bisa diubah)
                        </label>
                        <input
                            type="text"
                            value={employee.nik}
                            disabled
                            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">NIK terhubung dengan fingerprint, tidak bisa diubah</p>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="full_name"
                            required
                            defaultValue={employee.full_name}
                            className={inputClass}
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Departemen <span className="text-red-500">*</span>
                        </label>
                        {/* Nilai SelectBox dikirim lewat hidden input agar tetap ikut FormData */}
                        <SelectBox
                            options={[
                                { value: 'Produksi', label: 'Produksi' },
                                { value: 'QC', label: 'QC' },
                                { value: 'Packing', label: 'Packing' },
                                { value: 'Admin', label: 'Admin' },
                                { value: 'Sales', label: 'Sales' },
                            ]}
                            value={department}
                            onChange={setDepartment}
                            searchable={false}
                            ariaLabel="Departemen"
                        />
                        <input type="hidden" name="department" value={department} />
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Posisi/Jabatan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="position"
                            required
                            defaultValue={employee.position}
                            className={inputClass}
                        />
                    </div>

                    {/* Daily Rate */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Gaji Harian (Rp) <span className="text-red-500">*</span>
                        </label>
                        <CurrencyInput
                            name="daily_rate"
                            required
                            min={0}
                            defaultValue={employee.daily_rate}
                            className="!px-3 !py-2.5 !rounded-xl !bg-white !border-slate-200 focus:!border-brand-500 focus:!ring-2 focus:!ring-brand-500/15"
                        />
                    </div>

                    {/* Join Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Tanggal Bergabung <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="join_date"
                            required
                            defaultValue={employee.join_date}
                            className={inputClass}
                        />
                    </div>

                    {/* Bank Account */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nomor Rekening Bank
                        </label>
                        <input
                            type="text"
                            name="bank_account"
                            defaultValue={employee.bank_account || ''}
                            className={inputClass}
                        />
                    </div>

                    {/* Status */}
                    <input type="hidden" name="status" value={employee.status} />

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        {employee.status === 'active' && (
                            <button
                                type="button"
                                onClick={() => setConfirmDeactivate(true)}
                                disabled={loading}
                                className="btn-danger"
                            >
                                Nonaktifkan Karyawan
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
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Konfirmasi nonaktifkan karyawan */}
            <ConfirmDialog
                isOpen={confirmDeactivate}
                onClose={() => { if (!loading) setConfirmDeactivate(false) }}
                onConfirm={handleDeactivate}
                title="Nonaktifkan karyawan ini?"
                description="Mereka tidak akan muncul di payroll."
                confirmText="Nonaktifkan"
                tone="danger"
                loading={loading}
            />
        </div>
    )
}
