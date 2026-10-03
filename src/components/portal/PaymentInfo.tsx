'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, Check, Wallet } from 'lucide-react'
import type { PortalOrder } from '@/lib/portal/types'
import { getPaymentSummary } from '@/lib/portal/stages'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface PaymentInfoProps {
    order: PortalOrder
}

const TONE_CLASS: Record<string, string> = {
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info',
    success: 'badge-success',
}

/**
 * Ringkasan pembayaran customer: status, rincian termin, dan info rekening.
 */
export function PaymentInfo({ order }: PaymentInfoProps) {
    const [copied, setCopied] = useState(false)
    const { payment, brand } = order
    const invoice = payment.invoice
    const summary = getPaymentSummary(order)

    const terms = [
        { label: 'Deposit Desain', amount: payment.dpDesainAmount, verified: payment.dpDesainVerified },
        { label: 'DP Produksi (50%)', amount: payment.dpProduksiAmount, verified: payment.dpProduksiVerified },
        { label: 'Pelunasan', amount: payment.pelunasanAmount, verified: payment.pelunasanVerified },
    ]

    async function handleCopy() {
        if (!brand.accountNumber) return
        try {
            await navigator.clipboard.writeText(brand.accountNumber)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard tidak tersedia — abaikan, nomor tetap terlihat.
        }
    }

    return (
        <section className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Pembayaran</h2>
                <span className={`badge ${TONE_CLASS[summary.tone]}`}>{summary.label}</span>
            </div>

            <ul className="space-y-3">
                {terms.map((term) => (
                    <li key={term.label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                    term.verified
                                        ? 'border-brand-600 bg-brand-600 text-white'
                                        : 'border-slate-200 bg-white text-slate-300'
                                }`}
                            >
                                {term.verified && <Check className="h-3 w-3" />}
                            </span>
                            <span className="text-sm text-slate-700">{term.label}</span>
                        </div>
                        <span
                            className={`text-sm font-semibold ${
                                term.verified ? 'text-slate-900' : 'text-slate-400'
                            }`}
                        >
                            {term.amount > 0 ? formatCurrency(term.amount) : '—'}
                        </span>
                    </li>
                ))}
            </ul>

            {invoice && (
                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5" />
                            {invoice.noInvoice}
                        </span>
                        <span>{formatDate(invoice.tanggal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(invoice.subTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>PPN {invoice.ppnPersen}%</span>
                        <span>{formatCurrency(invoice.ppnAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Sudah dibayar</span>
                        <span>{formatCurrency(invoice.totalDibayar)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-danger-600">
                        <span>Sisa tagihan</span>
                        <span>{formatCurrency(invoice.sisaTagihan)}</span>
                    </div>
                </div>
            )}

            {brand.bankName && brand.accountNumber && (
                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Rekening Pembayaran
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{brand.bankName}</p>
                            <p className="text-sm text-slate-600">
                                {brand.accountNumber} • a/n {brand.accountName}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={handleCopy}
                            aria-label="Salin nomor rekening"
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Tersalin' : 'Salin'}
                        </button>
                    </div>
                </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
                Setelah transfer, kirim bukti pembayaran melalui WhatsApp agar segera diverifikasi.
            </p>
        </section>
    )
}
