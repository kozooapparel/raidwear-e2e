'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { getInvoiceById } from '@/lib/actions/invoices'
import { getBankInfo, getCompanyInfo } from '@/lib/actions/settings'
import { toast } from 'sonner'
import { PdfPreviewModal } from '@/components/ui'
import { InvoicePDFDocument } from './InvoicePDF'

export default function InvoicePreviewButton({
    invoiceId,
    label,
    className,
}: {
    invoiceId: string
    /** Teks opsional di samping ikon mata (mis. "Lihat" pada kartu Invoice di OrderDetailModal). */
    label?: string
    /**
     * Gaya tombol opsional. Bila diisi, seluruh class tombol digantikan nilai ini
     * (kecuali `disabled:opacity-50` yang selalu ditambahkan).
     * Bila kosong, tampilan default ikon mata di menu Invoice tetap dipakai.
     */
    className?: string
}) {
    const [loading, setLoading] = useState(false)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)

    const handlePreview = async () => {
        setLoading(true)
        try {
            const invoice = await getInvoiceById(invoiceId)
            if (!invoice) {
                toast.error('Invoice tidak ditemukan')
                return
            }

            const [bankInfo, companyInfo] = invoice.brand
                ? [{
                    bank_name: invoice.brand.bank_name || '',
                    account_name: invoice.brand.account_name || '',
                    account_number: invoice.brand.account_number || ''
                }, {
                    name: invoice.brand.company_name,
                    address: invoice.brand.address || '',
                    phone: invoice.brand.phone || ''
                }]
                : await Promise.all([getBankInfo(), getCompanyInfo()])

            const blob = await pdf(
                <InvoicePDFDocument
                    invoice={invoice}
                    bankInfo={bankInfo || undefined}
                    companyInfo={companyInfo || undefined}
                    brandInfo={invoice.brand ? {
                        name: invoice.brand.company_name,
                        address: invoice.brand.address,
                        logo_url: invoice.brand.logo_url,
                        primary_color: invoice.brand.primary_color,
                        accent_color: invoice.brand.accent_color,
                        default_invoice_template_id: invoice.brand.default_invoice_template_id
                    } : null}
                />
            ).toBlob()
            setPdfUrl(URL.createObjectURL(blob))
        } catch (error) {
            console.error('Error generating PDF preview:', error)
            toast.error('Gagal menampilkan PDF')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
    }

    return (
        <>
            <button
                onClick={handlePreview}
                disabled={loading}
                className={`${className ?? 'p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors'} disabled:opacity-50`}
                title="Lihat PDF"
                aria-label="Lihat PDF invoice"
            >
                {loading ? (
                    <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.269 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
                {label && <span>{label}</span>}
            </button>
            <PdfPreviewModal isOpen={Boolean(pdfUrl)} pdfUrl={pdfUrl} title={`Preview Invoice`} onClose={handleClose} />
        </>
    )
}
