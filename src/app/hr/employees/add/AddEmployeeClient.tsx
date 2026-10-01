'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee } from '../actions'
import { toast } from 'sonner'
import { CurrencyInput, SelectBox } from '@/components/ui'
import { PageHeader } from '@/components/ui/ds'

const DEPARTMENT_OPTIONS = [
    { value: 'Produksi', label: 'Produksi' },
    { value: 'QC', label: 'QC' },
    { value: 'Packing', label: 'Packing' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Sales', label: 'Sales' },
]

export default function AddEmployeePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [department, setDepartment] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // SelectBox tidak memakai atribut `required`, jadi validasi di sini
        if (!department) {
            toast.error('Semua field wajib diisi')
            return
        }

        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await createEmployee(formData)

        if (result.success) {
            toast.success('Karyawan berhasil ditambahkan!')
            router.push('/hr/employees')
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal menambahkan karyawan')
        }

        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tambah Karyawan Baru"
                description="Isi data karyawan untuk sistem absensi dan penggajian"
            />

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                {/* NIK */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        NIK (Nomor Induk Karyawan) <span className="text-brand-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="nik"
                        required
                        placeholder="EMP001"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">NIK akan digunakan untuk mapping fingerprint</p>
                </div>

                {/* Full Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nama Lengkap <span className="text-brand-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="full_name"
                        required
                        placeholder="Budi Santoso"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                </div>

                {/* Department */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Departemen <span className="text-brand-500">*</span>
                    </label>
                    <SelectBox
                        options={DEPARTMENT_OPTIONS}
                        value={department}
                        onChange={setDepartment}
                        placeholder="Pilih Departemen"
                        searchable={false}
                        ariaLabel="Departemen"
                    />
                    {/* SelectBox tidak ikut terkirim lewat FormData, nilainya dikirim via hidden input */}
                    <input type="hidden" name="department" value={department} />
                </div>

                {/* Position */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Posisi/Jabatan <span className="text-brand-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="position"
                        required
                        placeholder="Operator Jahit"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                </div>

                {/* Daily Rate */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Gaji Harian (Rp) <span className="text-brand-500">*</span>
                    </label>
                    <CurrencyInput
                        name="daily_rate"
                        required
                        min={0}
                        placeholder="150.000"
                        className="!px-4 !py-2.5 !rounded-lg !bg-white !border-slate-300 focus:!border-brand-500 focus:!ring-2 focus:!ring-brand-500/15"
                    />
                    <p className="text-xs text-slate-500 mt-1">Gaji per hari kerja (bukan bulanan)</p>
                </div>

                {/* Join Date */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tanggal Bergabung <span className="text-brand-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="join_date"
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                </div>

                {/* Bank Account */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nomor Rekening Bank (Opsional)
                    </label>
                    <input
                        type="text"
                        name="bank_account"
                        placeholder="1234567890 (BCA)"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">Untuk slip gaji</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
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
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Simpan Karyawan
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
