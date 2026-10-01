import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import EmployeeListClient from '@/components/hr/EmployeeListClient'
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
    created_at: string
}

export default async function EmployeesPage() {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch employees
    const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching employees:', error)
    }

    const activeEmployees = employees?.filter(e => e.status === 'active') || []
    const inactiveEmployees = employees?.filter(e => e.status === 'inactive') || []

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

    return (
        <DashboardLayout user={profile}>
            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    title="Kelola Karyawan"
                    description="Manage employee data, salary & allowances"
                    actions={
                        <Link
                            href="/hr/employees/add"
                            className="btn-primary"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Tambah Karyawan
                        </Link>
                    }
                />

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-emerald-100">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Karyawan Aktif</p>
                                <p className="text-2xl font-bold text-slate-900">{activeEmployees.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-brand-50">
                                <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Payroll/Bulan (Est.)</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {formatCurrency(activeEmployees.reduce((sum, e) => sum + (e.daily_rate * 26), 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-amber-100">
                                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Karyawan Inactive</p>
                                <p className="text-2xl font-bold text-slate-900">{inactiveEmployees.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee List with Search & Filter */}
                <EmployeeListClient employees={activeEmployees} />

                {/* Inactive Employees */}
                {inactiveEmployees.length > 0 && (
                    <details className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <summary className="text-lg font-semibold text-slate-700 cursor-pointer">
                            Karyawan Inactive ({inactiveEmployees.length})
                        </summary>
                        <div className="mt-4 space-y-2">
                            {inactiveEmployees.map((employee: Employee) => (
                                <div key={employee.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 opacity-60">
                                    <p className="font-medium text-slate-700">{employee.full_name}</p>
                                    <p className="text-sm text-slate-500">{employee.nik} • {employee.position}</p>
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </DashboardLayout>
    )
}
