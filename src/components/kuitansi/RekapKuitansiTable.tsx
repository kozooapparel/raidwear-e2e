'use client'

import Link from 'next/link'
import { useState } from 'react'
import { KuitansiWithInvoice } from '@/types/database'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { DEFAULT_DATE_RANGE, DateRangeValue, formatRangeLabel, isDateInRange } from '@/lib/utils/date-range'
import { DateRangeFilter } from '@/components/ui'

interface RekapKuitansiTableProps {
    kuitansiList: KuitansiWithInvoice[]
}

export default function RekapKuitansiTable({ kuitansiList }: RekapKuitansiTableProps) {
    const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)

    const filteredList = kuitansiList.filter(k => isDateInRange(k.tanggal, dateRange))

    // Total penerimaan pada rentang tanggal terpilih
    const totalPembayaran = filteredList.reduce((sum, k) => sum + k.jumlah, 0)

    return (
        <div className="space-y-6">
            {/* Filter rentang tanggal */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                    Periode: <span className="font-medium text-slate-700">{formatRangeLabel(dateRange)}</span>
                </p>
                <DateRangeFilter
                    value={dateRange}
                    onChange={setDateRange}
                    accent="emerald"
                    align="right"
                />
            </div>

            {/* Ringkasan */}
            <div className="surface flex flex-col gap-1 bg-gradient-to-r from-brand-600 to-brand-700 p-5 text-white md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm text-brand-50/90">Total Penerimaan</p>
                    <p className="text-mono text-3xl font-bold">{formatCurrency(totalPembayaran)}</p>
                </div>
                <p className="text-sm text-brand-50/90">{filteredList.length} transaksi</p>
            </div>

            {/* Tabel */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Tanggal</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No Invoice</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Customer</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Jumlah</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                                        Tidak ada kuitansi pada rentang tanggal ini
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((k, index) => (
                                    <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-slate-500 text-mono">{index + 1}</td>
                                        <td className="px-4 py-3 text-slate-600">{formatDateShort(k.tanggal)}</td>
                                        <td className="px-4 py-3 font-medium text-brand-600 text-mono">
                                            <Link href={`/invoices/${k.invoice?.id}`} className="hover:underline">
                                                {k.invoice?.no_invoice}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{k.invoice?.customer?.name}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 text-mono">{formatCurrency(k.jumlah)}</td>
                                        <td className="px-4 py-3 text-slate-600">{k.keterangan}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {filteredList.length > 0 && (
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-900">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600 text-mono">{formatCurrency(totalPembayaran)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}