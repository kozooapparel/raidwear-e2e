'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InvoiceWithCustomer, Brand } from '@/types/database'
import { createKuitansi } from '@/lib/actions/kuitansi'
import { formatCurrency, formatDateInput, formatDate } from '@/lib/utils/format'
import { terbilang } from '@/lib/utils/terbilang'
import { toast } from 'sonner'
import { CurrencyInput, SelectBox } from '@/components/ui'

interface KuitansiFormProps {
    unpaidInvoices: (InvoiceWithCustomer & { brand?: Brand | null })[]
    prefilledInvoiceId?: string
}

export default function KuitansiForm({ unpaidInvoices, prefilledInvoiceId }: KuitansiFormProps) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [invoiceId, setInvoiceId] = useState(prefilledInvoiceId || '')
    const [tanggal, setTanggal] = useState(formatDateInput(new Date()))
    const [jumlah, setJumlah] = useState('')
    const [lokasi, setLokasi] = useState('Bandung')

    // Get selected invoice details
    const selectedInvoice = unpaidInvoices.find(inv => inv.id === invoiceId)

    const invoiceOptions = unpaidInvoices.map(inv => ({
        value: inv.id,
        label: `${inv.no_invoice} - ${inv.customer?.name ?? 'Tanpa nama'}`,
    }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!invoiceId) {
            toast.warning('Pilih invoice terlebih dahulu')
            return
        }

        const jumlahNum = parseFloat(jumlah)
        if (!jumlahNum || jumlahNum <= 0) {
            toast.warning('Masukkan jumlah pembayaran yang valid')
            return
        }

        if (selectedInvoice && jumlahNum > selectedInvoice.sisa_tagihan) {
            toast.warning(`Jumlah pembayaran melebihi sisa tagihan (${formatCurrency(selectedInvoice.sisa_tagihan)})`)
            return
        }

        setLoading(true)

        try {
            await createKuitansi({
                invoice_id: invoiceId,
                tanggal,
                jumlah: jumlahNum,
                lokasi
            })

            router.push('/kuitansi')
        } catch (error) {
            console.error('Error creating kuitansi:', error)
            toast.error(error instanceof Error ? error.message : 'Gagal membuat kuitansi')
        } finally {
            setLoading(false)
        }
    }

    // Quick fill full amount
    const fillFullAmount = () => {
        if (selectedInvoice) {
            setJumlah(selectedInvoice.sisa_tagihan.toString())
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-700 text-white p-4 rounded-xl">
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-white text-brand-700 hover:bg-brand-50 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setInvoiceId('')
                        setJumlah('')
                        setTanggal(formatDateInput(new Date()))
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                >
                    Buat Baru
                </button>
            </div>

            {/* Kuitansi Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header with Brand Info */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-wide">KUITANSI</h1>
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/20">
                                    DRAFT
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-300 w-24">No. Kuitansi</span>
                                    <span className="font-mono font-medium">(Auto-generate)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-300 w-16">Tanggal</span>
                                    <input
                                        type="date"
                                        value={tanggal}
                                        onChange={(e) => setTanggal(e.target.value)}
                                        className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Brand Info - Show when invoice is selected */}
                        <div className="text-right flex flex-col items-end">
                            {selectedInvoice?.brand?.logo_url && (
                                <img
                                    src={selectedInvoice.brand.logo_url}
                                    alt={selectedInvoice.brand.company_name}
                                    className="w-14 h-14 object-contain mb-2 rounded-lg bg-white/10 p-1"
                                />
                            )}
                            <h2 className="text-lg font-bold text-brand-400">
                                {selectedInvoice?.brand?.company_name || 'RAIDWEAR'}
                            </h2>
                            {selectedInvoice?.brand?.address && (
                                <p className="text-xs text-slate-300 max-w-[180px] mt-1">
                                    {selectedInvoice.brand.address}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Invoice Selection Bar */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-slate-500">Referensi Invoice:</span>
                    </div>
                    <SelectBox
                        className="w-72 shrink-0"
                        options={invoiceOptions}
                        value={invoiceId}
                        onChange={setInvoiceId}
                        placeholder="Pilih Invoice"
                        emptyText="Tidak ada invoice belum lunas"
                        ariaLabel="Pilih invoice"
                    />
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Sudah diterima dari */}
                    <div className="flex items-start gap-4">
                        <div className="w-48 text-sm text-slate-500">
                            <p className="font-medium text-slate-700">Sudah diterima dari</p>
                            <p className="text-xs italic">Received from</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-lg font-medium text-slate-900">
                                : {selectedInvoice?.customer?.name || '...'}
                            </p>
                        </div>
                    </div>

                    {/* Jumlah Kuitansi */}
                    <div className="flex items-start gap-4">
                        <div className="w-48 text-sm text-slate-500">
                            <p className="font-medium text-slate-700">Jumlah Kuitansi</p>
                            <p className="text-xs italic">Receipt Amount</p>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium">: Rp.</span>
                                <div className="flex items-center gap-2">
                                    <CurrencyInput
                                        value={jumlah}
                                        onChange={(v) => setJumlah(v > 0 ? String(v) : '')}
                                        showPrefix={false}
                                        className="!w-48 !px-4 !py-2 !border-2 !rounded-lg !text-xl !font-bold !bg-white !border-slate-300 focus:!ring-brand-500/40"
                                        placeholder="0"
                                        min={0}
                                        max={selectedInvoice?.sisa_tagihan}
                                    />
                                    {selectedInvoice && (
                                        <button
                                            type="button"
                                            onClick={fillFullAmount}
                                            className="px-3 py-2 bg-brand-50 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-100 transition-colors"
                                        >
                                            Penuh ({formatCurrency(selectedInvoice.sisa_tagihan)})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terbilang */}
                    <div className="flex items-start gap-4">
                        <div className="w-48 text-sm text-slate-500">
                            <p className="font-medium text-brand-600">Terbilang</p>
                            <p className="text-xs italic">Amount in words</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-brand-600 font-medium">
                                : {jumlah && parseFloat(jumlah) > 0 ? terbilang(parseFloat(jumlah)) : '...'}
                            </p>
                        </div>
                    </div>

                    {/* Untuk Pembayaran */}
                    <div className="flex items-start gap-4">
                        <div className="w-48 text-sm text-slate-500">
                            <p className="font-medium text-brand-600">Untuk Pembayaran</p>
                            <p className="text-xs italic">In Payment of</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-brand-600 font-medium">
                                : Pembayaran invoice no: {selectedInvoice?.no_invoice || '...'}
                            </p>
                        </div>
                    </div>

                    {/* Invoice Details (if selected) */}
                    {selectedInvoice && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Detail Invoice</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500">Total Invoice:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(selectedInvoice.total)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Sudah Dibayar:</span>
                                    <span className="ml-2 font-medium text-emerald-600">{formatCurrency(selectedInvoice.total_dibayar)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Sisa Tagihan:</span>
                                    <span className="ml-2 font-bold text-brand-600">{formatCurrency(selectedInvoice.sisa_tagihan)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Tanggal Invoice:</span>
                                    <span className="ml-2 font-medium">{formatDate(selectedInvoice.tanggal)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Signature Area */}
                    <div className="flex justify-end pt-6">
                        <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="text"
                                    value={lokasi}
                                    onChange={(e) => setLokasi(e.target.value)}
                                    className="px-2 py-1 border-b border-slate-300 bg-transparent focus:outline-none focus:border-brand-500"
                                />
                                <span>, {formatDate(tanggal ? new Date(tanggal) : new Date())}</span>
                            </div>
                            <div className="w-48 h-24 border-b border-slate-300 mb-2"></div>
                            <p className="text-sm text-slate-500">(Penerima)</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-800 text-white p-4 text-sm">
                    <p>Kuitansi ini berlaku sah, setelah uang diterima.</p>
                    <p className="text-slate-400 text-xs italic">This payment will be legal, if the cheque has been accepted by the bank</p>
                </div>
            </div>
        </form>
    )
}
