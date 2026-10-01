'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchBar, SelectBox } from '@/components/ui'
import { EmptyState, DefaultEmptyIcon } from '@/components/ui/ds'

interface Employee {
    id: string
    nik: string
    full_name: string
    department: string
    position: string
    daily_rate: number
    join_date: string
    status: string
}

interface EmployeeListClientProps {
    employees: Employee[]
}

export default function EmployeeListClient({ employees }: EmployeeListClientProps) {
    const [search, setSearch] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')

    // Get unique departments
    const departments = [...new Set(employees.map(e => e.department))].sort()

    const filteredEmployees = employees.filter(e => {
        const matchSearch = search === '' ||
            e.full_name.toLowerCase().includes(search.toLowerCase()) ||
            e.nik.toLowerCase().includes(search.toLowerCase()) ||
            e.position.toLowerCase().includes(search.toLowerCase())
        const matchDept = departmentFilter === 'all' || e.department === departmentFilter
        return matchSearch && matchDept
    })

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
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Daftar Karyawan</h2>

            {/* Pencarian & Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                <div className="flex-1">
                    <SearchBar
                        onSearch={setSearch}
                        placeholder="Cari nama, NIK, atau posisi..."
                    />
                </div>
                <SelectBox
                    options={[
                        { value: 'all', label: 'Semua Department' },
                        ...departments.map(dept => ({ value: dept, label: dept })),
                    ]}
                    value={departmentFilter}
                    onChange={setDepartmentFilter}
                    searchable={false}
                    size="sm"
                    className="w-full sm:w-56"
                    ariaLabel="Filter department"
                />
            </div>

            {/* Results count */}
            <p className="text-sm text-slate-500 mb-3">
                {filteredEmployees.length} karyawan ditemukan
            </p>

            {filteredEmployees.length > 0 ? (
                <div className="space-y-3">
                    {filteredEmployees.map((employee) => (
                        <Link
                            key={employee.id}
                            href={`/hr/employees/${employee.id}`}
                            className="block p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                                        {employee.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                                                {employee.full_name}
                                            </p>
                                            <span className="badge badge-neutral">
                                                {employee.nik}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {employee.position} • {employee.department}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Bergabung {formatDate(employee.join_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Gaji Harian</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        {formatCurrency(employee.daily_rate)}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<DefaultEmptyIcon />}
                    title="Tidak ada karyawan ditemukan"
                    description="Coba ubah kata kunci pencarian"
                />
            )}
        </div>
    )
}
