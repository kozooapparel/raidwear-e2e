'use client'

import type { ReactNode } from 'react'

export type FilterTone = 'brand' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export interface FilterPillOption<T extends string> {
    value: T
    label: string
    /** Jumlah item untuk opsi ini, ditampilkan sebagai angka kecil di kanan label */
    count?: number
    /** Warna saat opsi aktif */
    tone?: FilterTone
    icon?: ReactNode
}

const ACTIVE_CLASSES: Record<FilterTone, string> = {
    brand: 'border-brand-600 bg-brand-600 text-white shadow-sm',
    success: 'border-emerald-600 bg-emerald-600 text-white shadow-sm',
    warning: 'border-amber-500 bg-amber-500 text-white shadow-sm',
    info: 'border-blue-600 bg-blue-600 text-white shadow-sm',
    danger: 'border-red-600 bg-red-600 text-white shadow-sm',
    neutral: 'border-slate-800 bg-slate-800 text-white shadow-sm',
}

const SIZE_CLASSES = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
} as const

interface FilterPillsProps<T extends string> {
    options: FilterPillOption<T>[]
    value: T
    onChange: (value: T) => void
    size?: 'sm' | 'md'
    className?: string
    ariaLabel?: string
}

/**
 * Deret tombol filter berbentuk pil, dipakai untuk menyaring daftar
 * dengan satu klik (mis. tier customer, status order).
 * Hanya satu opsi yang aktif pada satu waktu.
 */
export default function FilterPills<T extends string>({
    options,
    value,
    onChange,
    size = 'md',
    className = '',
    ariaLabel,
}: FilterPillsProps<T>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={`flex flex-wrap items-center gap-1.5 ${className}`}
        >
            {options.map((option) => {
                const isActive = option.value === value
                const tone = option.tone ?? 'brand'
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors focus-ring ${SIZE_CLASSES[size]} ${
                            isActive
                                ? ACTIVE_CLASSES[tone]
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {option.icon}
                        {option.label}
                        {typeof option.count === 'number' && (
                            <span
                                className={`text-mono text-[11px] ${
                                    isActive ? 'text-white/80' : 'text-slate-400'
                                }`}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
