'use client'

import Link from 'next/link'
import { useState } from 'react'
import { InvoiceWithCustomer } from '@/types/database'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { DEFAULT_DATE_RANGE, DateRangeValue, formatRangeLabel, isDateInRange } from '@/lib/utils/date-range'
import { DateRangeFilter } from '@/components/ui'
import { StatCard } from '@/components/ui/ds'

interface RekapInvoiceTableProps {
    invoices: InvoiceWithCustomer[]
}

export default function RekapInvoiceTable({ invoices }: RekapInvoiceTableProps) {
    const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)

    const filteredInvoices = invoices.filter(inv => isDateInRange(inv.tanggal, dateRange))

    // Ringkasan
    const totalInvoice = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalDibayar = filteredInvoices.reduce((sum, inv) => sum + inv.total_dibayar, 0)
    const totalSisa = filteredInvoices.reduce((sum, inv) => sum + inv.sisa_tagihan, 0)
    const countLunas = filteredInvoices.filter(inv => inv.status_pembayaran === 'SUDAH_LUNAS').length
    const countBelum = filteredInvoices.filter(inv => inv.status_pembayaran === 'BELUM_LUNAS').length

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
                    accent="orange"
                    align="right"
                />
            </div>

            {/* Ringkasan */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
                <StatCard label="Total Invoice" value={filteredInvoices.length} tone="default" />
                <StatCard label="Nilai Invoice" value={formatCurrency(totalInvoice)} tone="default" />
                <StatCard label="Total Dibayar" value={formatCurrency(totalDibayar)} tone="success" />
                <StatCard label="Sisa Tagihan" value={formatCurrency(totalSisa)} tone="warning" />
                <StatCard
                    label="Status"
                    tone="default"
                    value={
                        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                            <span className="badge badge-success">{countLunas} Lunas</span>
                            <span className="badge badge-warning">{countBelum} Belum</span>
                        </span>
                    }
                />
            </div>

            {/* Tabel */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No Invoice</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Tgl Invoice</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Termin</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Jatuh Tempo</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">No PO</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Customer</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Alamat</th>
                                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Telpon</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Sub Total</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Pajak</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Total</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Pembayaran</th>
                                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Sisa</th>
                                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-4 py-12 text-center text-sm text-slate-500">
                                        Tidak ada invoice pada rentang tanggal ini
                                    </td>
                                </tr>
                            ) : filteredInvoices.map((inv) => {
                                // Hitung jatuh tempo dari termin pembayaran
                                const jatuhTempo = new Date(inv.tanggal)
                                jatuhTempo.setDate(jatuhTempo.getDate() + (inv.termin_pembayaran || 0))

                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 font-medium text-brand-600 text-mono">
                                            <Link href={`/invoices/${inv.id}`} className="hover:underline">
                                                {inv.no_invoice}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{formatDateShort(inv.tanggal)}</td>
                                        <td className="px-4 py-3 text-slate-600">{inv.termin_pembayaran} hari</td>
                                        <td className="px-4 py-3 text-slate-600">{formatDateShort(jatuhTempo)}</td>
                                        <td className="px-4 py-3 text-slate-600">{inv.no_po || '-'}</td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{inv.customer?.name}</td>
                                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{inv.customer?.alamat || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-mono">{inv.customer?.phone}</td>
                                        <td className="px-4 py-3 text-right text-slate-600 text-mono">{formatCurrency(inv.sub_total)}</td>
                                        <td className="px-4 py-3 text-right text-slate-600 text-mono">{formatCurrency(inv.ppn_amount)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-900 text-mono">{formatCurrency(inv.total)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 text-mono">{formatCurrency(inv.total_dibayar)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-amber-600 text-mono">{formatCurrency(inv.sisa_tagihan)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`badge ${inv.status_pembayaran === 'SUDAH_LUNAS' ? 'badge-success' : 'badge-warning'}`}>
                                                {inv.status_pembayaran === 'SUDAH_LUNAS' ? 'Lunas' : 'Belum'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}