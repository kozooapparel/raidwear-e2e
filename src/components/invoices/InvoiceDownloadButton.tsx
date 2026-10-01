'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { InvoicePDFDocument } from './InvoicePDF'
import { InvoiceWithItems } from '@/types/database'
import { getBankInfo, getCompanyInfo } from '@/lib/actions/settings'
import { getInvoiceById } from '@/lib/actions/invoices'
import { toast } from 'sonner'

interface InvoiceDownloadButtonProps {
    invoiceId: string
    invoice?: InvoiceWithItems // Optional if already have full data
    variant?: 'button' | 'icon'
    className?: string
}

export default function InvoiceDownloadButton({ invoiceId, variant = 'button', className }: InvoiceDownloadButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const invoice = await getInvoiceById(invoiceId)
            if (!invoice) {
                toast.error('Invoice tidak ditemukan')
                return
            }

            // Use brand info from invoice, fallback to global settings
            let bankInfo, companyInfo

            if (invoice.brand) {
                // Use brand-specific info
                bankInfo = {
                    bank_name: invoice.brand.bank_name || '',
                    account_name: invoice.brand.account_name || '',
                    account_number: invoice.brand.account_number || ''
                }
                companyInfo = {
                    name: invoice.brand.company_name,
                    address: invoice.brand.address || '',
                    phone: invoice.brand.phone || ''
                }
            } else {
                // Fallback to global settings
                const [globalBankInfo, globalCompanyInfo] = await Promise.all([
                    getBankInfo(),
                    getCompanyInfo()
                ])
                bankInfo = globalBankInfo
                companyInfo = globalCompanyInfo
            }

            // Generate PDF blob
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

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${invoice.no_invoice.replace(/\//g, '-')}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error('Gagal generate PDF')
        } finally {
            setLoading(false)
        }
    }

    if (variant === 'icon') {
        return (
            <button
                onClick={handleDownload}
                disabled={loading}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${className || ''}`}
                title="Download PDF"
            >
                {loading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
                PDF
            </button>
        )
    }

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className={`btn-primary ${className || ''}`}
        >
            {loading ? 'Generating...' : 'PDF'}
        </button>
    )
}

