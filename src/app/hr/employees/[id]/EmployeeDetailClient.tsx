'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addAllowance, deleteAllowance, addKasbon, deleteDeduction } from '../actions'
import { toast } from 'sonner'
import BonusModal from './BonusModal'
import EditEmployeeModal from './EditEmployeeModal'
import EditAllowanceModal from './EditAllowanceModal'
import { CurrencyInput, SelectBox, ConfirmDialog } from '@/components/ui'
import { PageHeader } from '@/components/ui/ds'

interface Employee {
    id: string
    nik: string
    full_name: string
    department: string
    position: string
    daily_rate: number
    join_date: string
    status: string
    bank_account: string | null
    allowances: Allowance[]
    deductions: Deduction[]
    bonuses?: Bonus[]
}

interface Allowance {
    id: string
    allowance_type: string
    amount: number
    calculation_method: string
    is_active: boolean
}

interface Deduction {
    id: string
    deduction_type: string
    total_amount: number
    remaining_amount: number
    installment_per_period: number
    status: string
    notes: string | null
}

interface Bonus {
    id: string
    bonus_type: string
    amount: number
    period_month: number
    period_year: number
    reason: string | null
    status: string
}

interface AttendanceSummary {
    totalDays: number
    totalDeficitHours: number
    totalOvertimeHours: number
}

const ALLOWANCE_TYPE_OPTIONS = [
    { value: 'transport', label: 'Transport' },
    { value: 'meal', label: 'Makan' },
    { value: 'position', label: 'Jabatan' },
    { value: 'other', label: 'Lainnya' },
]

const CALCULATION_METHOD_OPTIONS = [
    { value: 'per_day', label: 'Per Hari' },
    { value: 'per_month', label: 'Per Bulan' },
]

export default function EmployeeDetailClient({
    employee,
    attendanceSummary
}: {
    employee: Employee
    attendanceSummary: AttendanceSummary
}) {
    const router = useRouter()
    const [showAllowanceForm, setShowAllowanceForm] = useState(false)
    const [showKasbonForm, setShowKasbonForm] = useState(false)
    const [loading, setLoading] = useState(false)

    // Nilai form tunjangan (SelectBox tidak ikut terkirim lewat FormData)
    const [allowanceType, setAllowanceType] = useState('transport')
    const [calculationMethod, setCalculationMethod] = useState('per_day')

    // Konfirmasi hapus: satu state untuk tunjangan & kasbon
    const [pendingDelete, setPendingDelete] = useState<{ id: string; type: 'allowance' | 'kasbon' } | null>(null)
    const [processing, setProcessing] = useState(false)

    // New modal states
    const [showBonusModal, setShowBonusModal] = useState(false)
    const [editingBonus, setEditingBonus] = useState<Bonus | undefined>(undefined)
    const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false)
    const [editingAllowance, setEditingAllowance] = useState<Allowance | undefined>(undefined)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const handleAddAllowance = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await addAllowance(employee.id, formData)

        if (result.success) {
            toast.success('Tunjangan berhasil ditambahkan!')
            setShowAllowanceForm(false)
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal menambahkan tunjangan')
        }

        setLoading(false)
    }

    const runDelete = async () => {
        if (!pendingDelete) return
        setProcessing(true)

        if (pendingDelete.type === 'allowance') {
            const result = await deleteAllowance(pendingDelete.id, employee.id)

            if (result.success) {
                toast.success('Tunjangan berhasil dihapus!')
                router.refresh()
            } else {
                toast.error(result.error || 'Gagal menghapus tunjangan')
            }
        } else {
            const result = await deleteDeduction(pendingDelete.id, employee.id)

            if (result.success) {
                toast.success('Kasbon berhasil dihapus!')
                router.refresh()
            } else {
                toast.error(result.error || 'Gagal menghapus kasbon')
            }
        }

        setProcessing(false)
        setPendingDelete(null)
    }

    const handleAddKasbon = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await addKasbon(employee.id, formData)

        if (result.success) {
            toast.success('Kasbon berhasil ditambahkan!')
            setShowKasbonForm(false)
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal menambahkan kasbon')
        }

        setLoading(false)
    }

    const activeAllowances = employee.allowances?.filter(a => a.is_active) || []
    const activeDeductions = employee.deductions?.filter(d => d.status === 'active') || []
    const bonuses = employee.bonuses || []
    const pendingBonuses = bonuses.filter(b => b.status === 'pending')
    const approvedBonuses = bonuses.filter(b => b.status === 'approved')

    return (
        <>
            {/* Modals */}
            {showBonusModal && (
                <BonusModal
                    employeeId={employee.id}
                    bonus={editingBonus}
                    onClose={() => {
                        setShowBonusModal(false)
                        setEditingBonus(undefined)
                    }}
                />
            )}
            {showEditEmployeeModal && (
                <EditEmployeeModal
                    employee={employee}
                    onClose={() => setShowEditEmployeeModal(false)}
                />
            )}
            {editingAllowance && (
                <EditAllowanceModal
                    allowance={editingAllowance}
                    employeeId={employee.id}
                    onClose={() => setEditingAllowance(undefined)}
                />
            )}
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <Link
                            href="/hr/employees"
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali ke Daftar Karyawan
                        </Link>
                        <PageHeader
                            title={employee.full_name}
                            description={`${employee.nik} • ${employee.position} • ${employee.department}`}
                            actions={
                                <button
                                    onClick={() => setShowEditEmployeeModal(true)}
                                    className="btn-primary"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Karyawan
                                </button>
                            }
                        />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <p className="text-sm text-slate-500">Gaji Harian</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(employee.daily_rate)}</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <p className="text-sm text-slate-500">Hadir (30 hari terakhir)</p>
                            <p className="text-2xl font-bold text-slate-900">{attendanceSummary.totalDays} hari</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <p className="text-sm text-slate-500">Kurang Jam (30 hari)</p>
                            <p className="text-2xl font-bold text-amber-600">{attendanceSummary.totalDeficitHours.toFixed(1)} jam</p>
                        </div>
                    </div>

                    {/* Employee Info */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Informasi Karyawan</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">NIK</p>
                                <p className="font-medium text-slate-900">{employee.nik}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Bergabung</p>
                                <p className="font-medium text-slate-900">{formatDate(employee.join_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${employee.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-700'
                                    }`}>
                                    {employee.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Rekening</p>
                                <p className="font-medium text-slate-900">{employee.bank_account || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bonuses */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-900">Bonus</h2>
                            <button
                                onClick={() => {
                                    setEditingBonus(undefined)
                                    setShowBonusModal(true)
                                }}
                                className="btn-primary btn-sm"
                            >
                                + Tambah Bonus
                            </button>
                        </div>

                        {bonuses.length > 0 ? (
                            <div className="space-y-3">
                                {pendingBonuses.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-amber-600 mb-2">🕐 Pending Approval</p>
                                        {pendingBonuses.map(bonus => (
                                            <div key={bonus.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-slate-900 capitalize">{bonus.bonus_type}</p>
                                                        <p className="text-sm text-slate-500">
                                                            {formatCurrency(bonus.amount)} • {new Date(bonus.period_year, bonus.period_month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                                        </p>
                                                        {bonus.reason && <p className="text-xs text-slate-400 mt-1">{bonus.reason}</p>}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setEditingBonus(bonus)
                                                            setShowBonusModal(true)
                                                        }}
                                                        className="btn-icon btn-ghost text-brand-600 hover:bg-brand-50"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {approvedBonuses.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-emerald-600 mb-2">✅ Approved</p>
                                        {approvedBonuses.map(bonus => (
                                            <div key={bonus.id} className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-slate-900 capitalize">{bonus.bonus_type}</p>
                                                        <p className="text-sm text-slate-500">
                                                            {formatCurrency(bonus.amount)} • {new Date(bonus.period_year, bonus.period_month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-emerald-600 font-medium">Masuk Payroll</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">Belum ada bonus</p>
                        )}
                    </div>

                    {/* Allowances */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-900">Tunjangan</h2>
                            <button
                                onClick={() => setShowAllowanceForm(!showAllowanceForm)}
                                className="btn-primary btn-sm"
                            >
                                {showAllowanceForm ? 'Tutup' : '+ Tambah Tunjangan'}
                            </button>
                        </div>

                        {showAllowanceForm && (
                            <form onSubmit={handleAddAllowance} className="mb-4 p-4 rounded-lg bg-brand-50 border border-brand-200 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <SelectBox
                                        options={ALLOWANCE_TYPE_OPTIONS}
                                        value={allowanceType}
                                        onChange={setAllowanceType}
                                        searchable={false}
                                        size="sm"
                                        ariaLabel="Jenis tunjangan"
                                    />
                                    {/* SelectBox tidak ikut terkirim lewat FormData, nilainya dikirim via hidden input */}
                                    <input type="hidden" name="type" value={allowanceType} />
                                    <CurrencyInput
                                        name="amount"
                                        required
                                        min={0}
                                        placeholder="Nominal (Rp)"
                                        className="!px-3 !py-2 !rounded-lg !bg-white !border-slate-300 focus:!border-brand-500 focus:!ring-2 focus:!ring-brand-500/15"
                                    />
                                    <SelectBox
                                        options={CALCULATION_METHOD_OPTIONS}
                                        value={calculationMethod}
                                        onChange={setCalculationMethod}
                                        searchable={false}
                                        size="sm"
                                        ariaLabel="Metode perhitungan"
                                    />
                                    <input type="hidden" name="calculation_method" value={calculationMethod} />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-primary"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan Tunjangan'}
                                </button>
                            </form>
                        )}

                        {activeAllowances.length > 0 ? (
                            <div className="space-y-2">
                                {activeAllowances.map(allowance => (
                                    <div key={allowance.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                                        <div>
                                            <p className="font-medium text-slate-900 capitalize">{allowance.allowance_type}</p>
                                            <p className="text-sm text-slate-500">
                                                {formatCurrency(allowance.amount)} / {allowance.calculation_method === 'per_day' ? 'Hari' : 'Bulan'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingAllowance(allowance)}
                                                className="btn-icon btn-ghost text-brand-600 hover:bg-brand-50"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setPendingDelete({ id: allowance.id, type: 'allowance' })}
                                                className="btn-icon btn-ghost text-red-600 hover:bg-red-50"
                                                title="Hapus"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">Belum ada tunjangan</p>
                        )}
                    </div>

                    {/* Kasbon */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-900">Kasbon</h2>
                            <button
                                onClick={() => setShowKasbonForm(!showKasbonForm)}
                                className="btn-primary btn-sm"
                            >
                                {showKasbonForm ? 'Tutup' : '+ Tambah Kasbon'}
                            </button>
                        </div>

                        {showKasbonForm && (
                            <form onSubmit={handleAddKasbon} className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Kasbon</label>
                                        <CurrencyInput
                                            name="total_amount"
                                            required
                                            min={0}
                                            placeholder="Rp 1.000.000"
                                            className="!w-full !px-3 !py-2 !rounded-lg !bg-white !border-slate-300 focus:!border-amber-500 focus:!ring-2 focus:!ring-amber-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Cicilan per Bulan</label>
                                        <CurrencyInput
                                            name="installment_per_period"
                                            required
                                            min={0}
                                            placeholder="Rp 200.000"
                                            className="!w-full !px-3 !py-2 !rounded-lg !bg-white !border-slate-300 focus:!border-amber-500 focus:!ring-2 focus:!ring-amber-200"
                                        />
                                    </div>
                                </div>
                                <textarea
                                    name="notes"
                                    placeholder="Catatan (opsional)"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-primary"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan Kasbon'}
                                </button>
                            </form>
                        )}

                        {activeDeductions.length > 0 ? (
                            <div className="space-y-2">
                                {activeDeductions.map(deduction => {
                                    const progress = ((deduction.total_amount - deduction.remaining_amount) / deduction.total_amount) * 100
                                    const canDelete = deduction.remaining_amount === deduction.total_amount
                                    return (
                                        <div key={deduction.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-900">
                                                        {formatCurrency(deduction.total_amount)}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        Cicilan: {formatCurrency(deduction.installment_per_period)}/bulan
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-amber-600">
                                                            Sisa: {formatCurrency(deduction.remaining_amount)}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{progress.toFixed(0)}% terbayar</p>
                                                    </div>
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => setPendingDelete({ id: deduction.id, type: 'kasbon' })}
                                                            className="btn-icon btn-ghost text-red-600 hover:bg-red-50"
                                                            title="Hapus kasbon (belum terpotong)"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-amber-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            {deduction.notes && (
                                                <p className="text-xs text-slate-500 mt-2">Note: {deduction.notes}</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">Tidak ada kasbon aktif</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Konfirmasi hapus tunjangan / kasbon */}
            <ConfirmDialog
                isOpen={pendingDelete !== null}
                onClose={() => { if (!processing) setPendingDelete(null) }}
                onConfirm={runDelete}
                title={pendingDelete?.type === 'kasbon' ? 'Hapus kasbon ini?' : 'Hapus tunjangan ini?'}
                description={pendingDelete?.type === 'kasbon'
                    ? 'Hanya bisa dihapus jika belum terpotong.'
                    : 'Tindakan ini tidak bisa dibatalkan.'}
                confirmText="Hapus"
                tone="danger"
                loading={processing}
            />
        </>
    )
}
