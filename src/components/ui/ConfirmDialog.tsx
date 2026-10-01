'use client'

import { useEffect, type ReactNode } from 'react'

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    /** danger = aksi merusak (hapus), brand = aksi netral */
    tone?: 'danger' | 'brand'
    loading?: boolean
    /** Ikon di bagian atas dialog */
    icon?: ReactNode
}

const TONE = {
    danger: {
        icon: 'bg-red-50 border-red-100 text-red-600',
        button: 'btn-danger',
    },
    brand: {
        icon: 'bg-brand-50 border-brand-100 text-brand-600',
        button: 'btn-primary',
    },
} as const

/**
 * Dialog konfirmasi seragam untuk aksi yang perlu penegasan
 * (mis. menghapus data), menggantikan implementasi ad-hoc per halaman.
 */
export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    tone = 'danger',
    loading = false,
    icon,
}: ConfirmDialogProps) {
    const t = TONE[tone]

    // Tutup dengan Escape + kunci scroll body selama dialog terbuka
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [isOpen, loading, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => !loading && onClose()}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-scaleIn">
                <div className="text-center">
                    {icon && (
                        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${t.icon}`}>
                            {icon}
                        </div>
                    )}
                    <h3 className="text-h3 text-slate-900">{title}</h3>
                    {description && (
                        <p className="mt-2 text-sm text-slate-500">{description}</p>
                    )}
                </div>
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 btn-secondary"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 ${t.button}`}
                    >
                        {loading ? 'Memproses...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
