'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { KuitansiPDFDocument } from './KuitansiPDF'
import { KuitansiWithInvoice } from '@/types/database'
import { getKuitansiById } from '@/lib/actions/kuitansi'
import { toast } from 'sonner'

interface KuitansiDownloadButtonProps {
    kuitansiId: string
    kuitansi?: KuitansiWithInvoice // Optional if already have full data
    variant?: 'button' | 'icon'
    className?: string
}

export default function KuitansiDownloadButton({ kuitansiId, variant = 'button', className }: KuitansiDownloadButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const kuitansi = await getKuitansiById(kuitansiId)
            if (!kuitansi) {
                toast.error('Kuitansi tidak ditemukan')
                return
            }

            // Get brand info from invoice if available
            const brand = kuitansi.invoice?.brand

            // Generate PDF blob with brand info
            const blob = await pdf(
                <KuitansiPDFDocument
                    kuitansi={kuitansi}
                    companyInfo={brand ? {
                        name: brand.company_name,
                        address: brand.address || '',
                        phone: brand.phone || '',
                        primary_color: brand.primary_color,
                        accent_color: brand.accent_color,
                        default_kuitansi_template_id: brand.default_kuitansi_template_id
                    } : undefined}
                />
            ).toBlob()

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Kuitansi-${kuitansi.no_kuitansi}-${kuitansi.invoice?.no_invoice?.replace(/\//g, '-') || 'unknown'}.pdf`
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

