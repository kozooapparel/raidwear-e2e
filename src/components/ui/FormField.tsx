import type { ReactNode } from 'react'

interface FormFieldProps {
    label: string
    /** id elemen input, supaya klik label memfokuskan input */
    htmlFor?: string
    required?: boolean
    /** Petunjuk singkat di bawah input */
    hint?: string
    /** Pesan kesalahan; bila ada, gaya input berubah dan hint disembunyikan */
    error?: string
    /** Keterangan tambahan di kanan label, mis. "(opsional)" */
    aside?: ReactNode
    children: ReactNode
    className?: string
}

/**
 * Pembungkus label + input + petunjuk/error yang seragam,
 * supaya semua form memakai hierarki dan spasi yang sama.
 */
export default function FormField({
    label,
    htmlFor,
    required = false,
    hint,
    error,
    aside,
    children,
    className = '',
}: FormFieldProps) {
    return (
        <div className={className}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
                    {label}
                    {required && <span className="ml-0.5 text-brand-600">*</span>}
                </label>
                {aside}
            </div>
            {children}
            {error ? (
                <p className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
                    <svg className="mt-px h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    )
}
