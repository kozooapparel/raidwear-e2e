'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { generatePayroll, submitPayrollForApproval, approvePayroll } from './actions'
import { toast } from 'sonner'
import { ConfirmDialog, SelectBox } from '@/components/ui'
import { PageHeader, EmptyState, DefaultEmptyIcon } from '@/components/ui/ds'

interface PayrollPeriod {
    id: string
    period_name: string
    start_date: string
    end_date: string
    payment_date: string
    status: string
    generated_at: string
    approved_by: string | null
    approved_at: string | null
    payroll_entries: Array<{ count: number }>
    total_gross?: number
    total_net?: number
}

export default function PayrollListClient({
    periods: initialPeriods,
    isOwner
}: {
    periods: PayrollPeriod[]
    isOwner: boolean
}) {
    const [periods, setPeriods] = useState<PayrollPeriod[]>(initialPeriods)
    const [showGenerateForm, setShowGenerateForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedYear, setSelectedYear] = useState<string>('all')
    // Aksi payroll yang menunggu konfirmasi (submit / approve)
    const [pendingAction, setPendingAction] = useState<{ id: string; kind: 'submit' | 'approve' } | null>(null)
    const [processing, setProcessing] = useState(false)

    // Get unique years from periods
    const availableYears = useMemo(() => {
        const years = new Set<number>()
        periods.forEach(p => {
            years.add(new Date(p.start_date).getFullYear())
        })
        return Array.from(years).sort((a, b) => b - a)
    }, [periods])

    // Filter periods by year
    const filteredPeriods = useMemo(() => {
        if (selectedYear === 'all') return periods
        return periods.filter(p =>
            new Date(p.start_date).getFullYear() === parseInt(selectedYear)
        )
    }, [periods, selectedYear])

    // Quick generate current month
    const handleQuickGenerate = async () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()

        const startDate = new Date(year, month, 1).toISOString().split('T')[0]
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

        setLoading(true)
        const result = await generatePayroll(startDate, endDate)

        if (result.success) {
            toast.success('Payroll bulan ini berhasil di-generate!')
            if (result.period) {
                setPeriods((current) => [result.period!, ...current])
            }
        } else {
            toast.error(result.error || 'Gagal generate payroll')
        }
        setLoading(false)
    }

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const startDate = formData.get('start_date') as string
        const endDate = formData.get('end_date') as string

        const result = await generatePayroll(startDate, endDate)

        if (result.success) {
            toast.success('Payroll berhasil di-generate!')
            setShowGenerateForm(false)
            if (result.period) {
                setPeriods((current) => [result.period!, ...current])
            }
        } else {
            toast.error(result.error || 'Gagal generate payroll')
        }

        setLoading(false)
    }

    const runPendingAction = async () => {
        if (!pendingAction) return
        const { id, kind } = pendingAction
        setProcessing(true)

        if (kind === 'submit') {
            const result = await submitPayrollForApproval(id)

            if (result.success) {
                toast.success('Payroll telah disubmit untuk approval!')
                setPeriods((current) =>
                    current.map((p) => (p.id === id ? { ...p, status: 'pending_approval' } : p))
                )
            } else {
                toast.error(result.error || 'Gagal submit payroll')
            }
        } else {
            const result = await approvePayroll(id)

            if (result.success) {
                toast.success('Payroll telah diapprove!')
                setPeriods((current) =>
                    current.map((p) =>
                        p.id === id
                            ? { ...p, status: 'approved', approved_at: new Date().toISOString() }
                            : p
                    )
                )
            } else {
                toast.error(result.error || 'Gagal approve payroll')
            }
        }

        setProcessing(false)
        setPendingAction(null)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
            pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Approval' },
            approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
            paid: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid' }
        }
        const badge = badges[status as keyof typeof badges] || badges.draft
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Payroll System"
                description="Kelola periode penggajian karyawan"
                actions={
                    <>
                        <button
                            onClick={handleQuickGenerate}
                            disabled={loading}
                            className="btn-secondary"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="hidden sm:inline">Bulan Ini</span>
                            <span className="sm:hidden">Quick</span>
                        </button>
                        <button
                            onClick={() => setShowGenerateForm(!showGenerateForm)}
                            className="btn-primary"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="hidden sm:inline">Generate Payroll</span>
                            <span className="sm:hidden">Generate</span>
                        </button>
                    </>
                }
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-brand-50">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">Total</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">{periods.length}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-emerald-100">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">Approved</p>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                                {periods.filter(p => p.status === 'approved' || p.status === 'paid').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-amber-100">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">Pending</p>
                            <p className="text-xl sm:text-2xl font-bold text-amber-600">
                                {periods.filter(p => p.status === 'pending_approval').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-slate-100">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">Draft</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-600">
                                {periods.filter(p => p.status === 'draft').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Form */}
            {showGenerateForm && (
                <form onSubmit={handleGenerate} className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Generate Payroll Baru</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Mulai</label>
                            <input
                                type="date"
                                name="start_date"
                                required
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Akhir</label>
                            <input
                                type="date"
                                name="end_date"
                                required
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">
                        Sistem akan menghitung gaji berdasarkan absensi, tunjangan, lembur, dan potongan kasbon untuk periode ini.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => setShowGenerateForm(false)}
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
                            {loading ? 'Generating...' : 'Generate Payroll'}
                        </button>
                    </div>
                </form>
            )}

            {/* Periods List */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Daftar Periode Payroll</h2>

                    {/* Year Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-500">Tahun:</label>
                        <SelectBox
                            className="w-32"
                            options={[
                                { value: 'all', label: 'Semua' },
                                ...availableYears.map(year => ({ value: String(year), label: String(year) })),
                            ]}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            searchable={false}
                            size="sm"
                            ariaLabel="Filter tahun"
                        />
                    </div>
                </div>

                {filteredPeriods.length > 0 ? (
                    <div className="space-y-3">
                        {filteredPeriods.map(period => {
                            const employeeCount = period.payroll_entries?.[0]?.count || 0

                            return (
                                <div
                                    key={period.id}
                                    className="p-3 sm:p-4 rounded-xl bg-slate-50 border-2 border-slate-200 hover:border-brand-300 transition-all"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{period.period_name}</h3>
                                                {getStatusBadge(period.status)}
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-500">
                                                <span className="block sm:inline">
                                                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                                                </span>
                                                <span className="hidden sm:inline"> | </span>
                                                <span className="block sm:inline">
                                                    {employeeCount} karyawan
                                                </span>
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/hr/payroll/${period.id}`}
                                                className="btn-secondary btn-sm"
                                            >
                                                Detail
                                            </Link>

                                            {period.status === 'draft' && (
                                                <button
                                                    onClick={() => setPendingAction({ id: period.id, kind: 'submit' })}
                                                    className="btn-primary btn-sm"
                                                >
                                                    <span className="hidden sm:inline">Submit Approval</span>
                                                    <span className="sm:hidden">Submit</span>
                                                </button>
                                            )}

                                            {period.status === 'pending_approval' && isOwner && (
                                                <button
                                                    onClick={() => setPendingAction({ id: period.id, kind: 'approve' })}
                                                    className="btn-primary btn-sm"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<DefaultEmptyIcon />}
                        title="Belum ada payroll"
                        description='Klik "Generate Payroll" untuk mulai'
                    />
                )}
            </div>

            {/* Konfirmasi submit / approve payroll */}
            <ConfirmDialog
                isOpen={pendingAction !== null}
                onClose={() => { if (!processing) setPendingAction(null) }}
                onConfirm={runPendingAction}
                title={pendingAction?.kind === 'approve' ? 'Approve payroll ini?' : 'Submit payroll untuk approval owner?'}
                description={pendingAction?.kind === 'approve' ? 'Kasbon akan otomatis terpotong.' : 'Payroll akan dikirim ke owner untuk disetujui.'}
                confirmText={pendingAction?.kind === 'approve' ? 'Approve' : 'Submit'}
                tone="brand"
                loading={processing}
            />
        </div>
    )
}
