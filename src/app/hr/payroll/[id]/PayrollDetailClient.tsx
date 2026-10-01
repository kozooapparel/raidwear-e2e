'use client'

import { SlipGajiPrint, PrintAllSlips } from './SlipGajiPrint'

interface PayrollEntry {
    id: string
    employee_id: string
    base_salary: number
    total_work_days: number
    total_allowances: number
    total_overtime: number
    total_bonuses: number
    total_deductions: number
    gross_salary: number
    net_salary: number
    employees: {
        nik: string
        full_name: string
        department: string
        position: string
    }
}

interface PayrollPeriod {
    id: string
    period_name: string
    start_date: string
    end_date: string
    payment_date: string
    status: string
    payroll_entries: PayrollEntry[]
}

export default function PayrollDetailClient({
    period,
    isOwner
}: {
    period: PayrollPeriod
    isOwner: boolean
}) {
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
            month: 'long',
            year: 'numeric'
        })
    }

    const totalGross = period.payroll_entries?.reduce((sum, entry) => sum + entry.gross_salary, 0) || 0
    const totalDeductions = period.payroll_entries?.reduce((sum, entry) => sum + entry.total_deductions, 0) || 0
    const totalNet = period.payroll_entries?.reduce((sum, entry) => sum + entry.net_salary, 0) || 0

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
            pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Approval' },
            approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
            paid: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid' }
        }
        const badge = badges[status] || badges.draft
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{period.period_name}</h1>
                            {getStatusBadge(period.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            <span className="block sm:inline">
                                {formatDate(period.start_date)} - {formatDate(period.end_date)}
                            </span>
                            <span className="hidden sm:inline"> | </span>
                            <span className="block sm:inline">
                                Pembayaran: {formatDate(period.payment_date)}
                            </span>
                        </p>
                    </div>

                    {/* Print All Button */}
                    {period.payroll_entries?.length > 0 && (
                        <PrintAllSlips
                            entries={period.payroll_entries}
                            period={{
                                period_name: period.period_name,
                                start_date: period.start_date,
                                end_date: period.end_date,
                                payment_date: period.payment_date
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs sm:text-sm text-slate-500">Total Karyawan</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">{period.payroll_entries?.length || 0}</p>
                </div>
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs sm:text-sm text-slate-500">Total Gross</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">{formatCurrency(totalGross)}</p>
                </div>
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs sm:text-sm text-slate-500">Total Potongan</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">-{formatCurrency(totalDeductions)}</p>
                </div>
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs sm:text-sm text-slate-500">Total Net</p>
                    <p className="text-lg sm:text-2xl font-bold text-brand-600 truncate">{formatCurrency(totalNet)}</p>
                </div>
            </div>

            {/* Payroll Entries - Mobile Cards */}
            <div className="block md:hidden space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Detail Slip Gaji</h2>
                {period.payroll_entries?.map((entry) => (
                    <div key={entry.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-semibold text-slate-900">{entry.employees.full_name}</p>
                                <p className="text-xs text-slate-500">{entry.employees.nik} • {entry.employees.department}</p>
                            </div>
                            <SlipGajiPrint
                                entry={entry}
                                period={{
                                    period_name: period.period_name,
                                    start_date: period.start_date,
                                    end_date: period.end_date,
                                    payment_date: period.payment_date
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-slate-500">Gaji Pokok</p>
                                <p className="font-medium">{formatCurrency(entry.base_salary)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Hari Kerja</p>
                                <p className="font-medium">{entry.total_work_days} hari</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Tunjangan</p>
                                <p className="font-medium text-emerald-600">+{formatCurrency(entry.total_allowances)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Lembur</p>
                                <p className="font-medium text-blue-600">+{formatCurrency(entry.total_overtime)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Bonus</p>
                                <p className="font-medium text-brand-600">+{formatCurrency(entry.total_bonuses)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Potongan</p>
                                <p className="font-medium text-red-600">-{formatCurrency(entry.total_deductions)}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="font-semibold text-slate-900">Gaji Bersih</span>
                            <span className="text-lg font-bold text-brand-600">{formatCurrency(entry.net_salary)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Payroll Entries - Desktop Table */}
            <div className="hidden md:block p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Detail Slip Gaji</h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Karyawan</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Hari Kerja</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Gaji Pokok</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Tunjangan</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Lembur</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Bonus</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Potongan</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Gaji Bersih</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Print</th>
                            </tr>
                        </thead>
                        <tbody>
                            {period.payroll_entries?.map((entry) => (
                                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{entry.employees.full_name}</p>
                                            <p className="text-xs text-slate-500">{entry.employees.nik} • {entry.employees.department}</p>
                                        </div>
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-slate-700">
                                        {entry.total_work_days} hari
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-slate-900 font-medium">
                                        {formatCurrency(entry.base_salary)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-emerald-600">
                                        +{formatCurrency(entry.total_allowances)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-blue-600">
                                        +{formatCurrency(entry.total_overtime)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-brand-600">
                                        +{formatCurrency(entry.total_bonuses)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-red-600">
                                        -{formatCurrency(entry.total_deductions)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-base font-bold text-slate-900">
                                        {formatCurrency(entry.net_salary)}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <SlipGajiPrint
                                            entry={entry}
                                            period={{
                                                period_name: period.period_name,
                                                start_date: period.start_date,
                                                end_date: period.end_date,
                                                payment_date: period.payment_date
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-300 bg-slate-50">
                                <td className="py-4 px-4 font-bold text-slate-900" colSpan={2}>TOTAL</td>
                                <td className="text-right py-4 px-4 font-bold text-slate-900">
                                    {formatCurrency(period.payroll_entries?.reduce((s, e) => s + e.base_salary, 0) || 0)}
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-emerald-600">
                                    {formatCurrency(period.payroll_entries?.reduce((s, e) => s + e.total_allowances, 0) || 0)}
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-blue-600">
                                    {formatCurrency(period.payroll_entries?.reduce((s, e) => s + e.total_overtime, 0) || 0)}
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-brand-600">
                                    {formatCurrency(period.payroll_entries?.reduce((s, e) => s + e.total_bonuses, 0) || 0)}
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-red-600">
                                    -{formatCurrency(totalDeductions)}
                                </td>
                                <td className="text-right py-4 px-4 text-lg font-bold text-brand-700">
                                    {formatCurrency(totalNet)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Info Messages */}
            {period.status === 'draft' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800">
                        💡 <strong>Status: Draft</strong> - Payroll masih bisa diedit. Klik &ldquo;Submit untuk Approval&rdquo; di halaman list untuk mengirim ke Owner.
                    </p>
                </div>
            )}

            {period.status === 'pending_approval' && isOwner && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800">
                        👑 <strong>Menunggu Approval Anda</strong> - Silakan review slip gaji di atas. Jika sudah benar, klik &ldquo;Approve Payroll&rdquo; di halaman list.
                    </p>
                </div>
            )}

            {period.status === 'approved' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm text-emerald-800">
                        ✅ <strong>Payroll Approved</strong> - Kasbon sudah otomatis terpotong. Slip gaji siap dicetak.
                    </p>
                </div>
            )}
        </div>
    )
}
