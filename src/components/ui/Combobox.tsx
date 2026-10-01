'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type SVGProps } from 'react'

/* ------------------------------------------------------------------ */
/* Ikon inline (mengikuti konvensi repo, tanpa dependensi ikon luar)   */
/* ------------------------------------------------------------------ */

const IconSearch = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </svg>
)

const IconCheck = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m5 13 4 4L19 7" />
    </svg>
)

const IconClose = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 18 18 6M6 6l12 12" />
    </svg>
)

const IconChevron = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m6 9 6 6 6-6" />
    </svg>
)

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

/** Ambil hanya digit, supaya pencarian nomor telepon tetap cocok walau ada spasi/tanda hubung */
export const digitsOnly = (value: string) => value.replace(/\D/g, '')

/** Sorot bagian teks yang cocok dengan kata kunci pencarian */
export function HighlightText({ text, query }: { text: string; query: string }) {
    const needle = query.trim()
    if (!needle) return <>{text}</>
    const index = text.toLowerCase().indexOf(needle.toLowerCase())
    if (index === -1) return <>{text}</>
    return (
        <>
            {text.slice(0, index)}
            <span className="rounded-[3px] bg-brand-100 text-brand-700">
                {text.slice(index, index + needle.length)}
            </span>
            {text.slice(index + needle.length)}
        </>
    )
}

export interface ComboboxRenderContext {
    /** Kata kunci yang sedang diketik */
    query: string
    isSelected: boolean
    isActive: boolean
}

export interface ComboboxProps<T> {
    items: T[]
    /** Kunci unik item terpilih, null bila belum ada */
    value: string | null
    /** Dipanggil dengan item terpilih, atau null saat pilihan dihapus */
    onChange: (item: T | null) => void
    getKey: (item: T) => string
    /** Teks yang dipakai untuk pencocokan saat user mengetik */
    getSearchText: (item: T) => string
    /** Teks yang tampil pada input saat daftar tertutup */
    getLabel: (item: T) => string
    renderOption: (item: T, ctx: ComboboxRenderContext) => ReactNode
    /** Aksi di bagian bawah daftar, mis. "Tambah baru" */
    footer?: (ctx: { query: string }) => ReactNode
    placeholder?: string
    /** Pesan saat hasil pencarian kosong */
    emptyText?: string
    /** Pesan saat daftar sumber memang belum ada isinya */
    noItemsText?: string
    disabled?: boolean
    /** Tampilkan tombol hapus pilihan */
    clearable?: boolean
    /**
     * Aktifkan kotak pencarian di dalam daftar (default true).
     * Nonaktifkan untuk daftar pendek & statis, mis. pilihan pengurutan.
     */
    searchable?: boolean
    size?: 'sm' | 'md'
    className?: string
    ariaLabel?: string
    /** Batas tinggi daftar opsi */
    maxHeightClass?: string
}

const SIZE_CLASSES = {
    sm: {
        input: 'py-1.5 text-xs rounded-lg',
        icon: 'h-3.5 w-3.5',
        iconLeft: 'left-2.5',
        iconRight: 'right-2',
        padSearchable: 'pl-8 pr-8',
        padPlain: 'pl-3 pr-8',
    },
    md: {
        input: 'py-2.5 text-sm rounded-xl',
        icon: 'h-4 w-4',
        iconLeft: 'left-3',
        iconRight: 'right-2.5',
        padSearchable: 'pl-9 pr-9',
        padPlain: 'pl-3.5 pr-9',
    },
} as const

/**
 * Combobox serbaguna: dropdown yang bisa langsung dicari.
 *
 * - Klik/fokus langsung membuka daftar dan siap diketik
 * - Navigasi keyboard: Arrow Up/Down, Enter, Escape, Tab
 * - ARIA combobox + listbox lengkap
 * - Bisa memuat aksi tambahan di bawah daftar (mis. buat data baru)
 */
export default function Combobox<T>({
    items,
    value,
    onChange,
    getKey,
    getSearchText,
    getLabel,
    renderOption,
    footer,
    placeholder = 'Cari...',
    emptyText = 'Tidak ditemukan',
    noItemsText = 'Belum ada data',
    disabled = false,
    clearable = false,
    searchable = true,
    size = 'md',
    className = '',
    ariaLabel,
    maxHeightClass = 'max-h-64',
}: ComboboxProps<T>) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const listboxId = useId()
    const s = SIZE_CLASSES[size]

    const selected = useMemo(
        () => items.find(item => getKey(item) === value) ?? null,
        // getKey diasumsikan stabil untuk tipe item yang sama
        [items, value, getKey]
    )

    // Filter instan di sisi klien supaya terasa cepat
    const filtered = useMemo(() => {
        if (!searchable) return items
        const q = query.trim().toLowerCase()
        if (!q) return items
        const qDigits = digitsOnly(q)
        return items.filter(item => {
            const haystack = getSearchText(item).toLowerCase()
            if (haystack.includes(q)) return true
            if (qDigits.length > 0 && digitsOnly(haystack).includes(qDigits)) return true
            return false
        })
    }, [items, query, getSearchText, searchable])

    // Sorotan diklem saat render supaya tidak perlu setState di dalam effect
    const safeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0))

    // Tutup saat klik di luar
    useEffect(() => {
        if (!open) return
        const handlePointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handlePointerDown)
        return () => document.removeEventListener('mousedown', handlePointerDown)
    }, [open])

    // Jaga opsi yang tersorot tetap terlihat
    useEffect(() => {
        if (!open || !listRef.current) return
        const el = listRef.current.children[safeIndex] as HTMLElement | undefined
        el?.scrollIntoView({ block: 'nearest' })
    }, [safeIndex, open])

    const commit = (item: T | null) => {
        setOpen(false)
        setQuery('')
        onChange(item)
        inputRef.current?.blur()
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!open) {
                setOpen(true)
                return
            }
            setActiveIndex(Math.min(safeIndex + 1, Math.max(filtered.length - 1, 0)))
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex(Math.max(safeIndex - 1, 0))
        } else if (event.key === 'Enter') {
            // Cegah form induk ikut ter-submit
            event.preventDefault()
            if (open && filtered[safeIndex]) {
                commit(filtered[safeIndex])
            }
        } else if (event.key === 'Escape') {
            if (open) {
                // Cegah Escape ikut menutup modal induk
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
            }
        } else if (event.key === 'Tab') {
            setOpen(false)
        }
    }

    const showList = open && !disabled
    const emptyList = items.length === 0
    const noResult = !emptyList && filtered.length === 0
    // Saat tidak bisa dicari, input selalu menampilkan label pilihan
    const displayValue = selected ? getLabel(selected) : searchable && open ? query : ''

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                {searchable && (
                    <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${s.iconLeft}`}>
                        <IconSearch className={s.icon} />
                    </span>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listboxId}
                    aria-autocomplete={searchable ? 'list' : undefined}
                    aria-label={ariaLabel}
                    aria-activedescendant={
                        showList && filtered[safeIndex] ? `${listboxId}-${getKey(filtered[safeIndex])}` : undefined
                    }
                    value={displayValue}
                    disabled={disabled}
                    readOnly={!searchable}
                    placeholder={placeholder}
                    onChange={(event) => {
                        if (!searchable) return
                        setQuery(event.target.value)
                        setActiveIndex(0)
                        setOpen(true)
                    }}
                    onFocus={(event) => {
                        setQuery('')
                        setActiveIndex(0)
                        setOpen(true)
                        event.target.select()
                    }}
                    onBlur={() => {
                        setOpen(false)
                        setQuery('')
                    }}
                    onKeyDown={handleKeyDown}
                    className={`w-full border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${s.input} ${searchable ? s.padSearchable : `${s.padPlain} cursor-pointer`}`}
                />

                {/* Tombol hapus pilihan / penanda terpilih */}
                {selected && clearable && !disabled && (
                    <span className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5 ${s.iconRight}`}>
                        <span className="text-emerald-500" title="Terpilih">
                            <IconCheck className={s.icon} />
                        </span>
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Hapus pilihan"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                onChange(null)
                                setQuery('')
                                inputRef.current?.focus()
                            }}
                            className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                            <IconClose className={s.icon} />
                        </button>
                    </span>
                )}

                {/* Chevron saat belum ada pilihan */}
                {(!selected || !clearable) && !disabled && (
                    <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${s.iconRight}`}>
                        <IconChevron className={`${s.icon} transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                )}
            </div>

            {showList && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-fadeIn">
                    {emptyList || noResult ? (
                        <div className="px-4 py-6 text-center">
                            <p className="text-sm text-slate-500">{emptyList ? noItemsText : emptyText}</p>
                        </div>
                    ) : (
                        <ul
                            ref={listRef}
                            id={listboxId}
                            role="listbox"
                            className={`${maxHeightClass} overflow-y-auto py-1 scrollbar-thin`}
                        >
                            {filtered.map((item, index) => {
                                const isActive = index === safeIndex
                                const isSelected = getKey(item) === value
                                return (
                                    <li
                                        key={getKey(item)}
                                        id={`${listboxId}-${getKey(item)}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => commit(item)}
                                        className={`cursor-pointer px-3 py-2 transition-colors ${isActive ? 'bg-brand-50' : ''}`}
                                    >
                                        {renderOption(item, { query, isSelected, isActive })}
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {footer && (
                        <div className="border-t border-slate-100 bg-slate-50/80">
                            {footer({ query })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* SelectBox: pembungkus ringkas untuk daftar opsi sederhana           */
/* ------------------------------------------------------------------ */

export interface SelectOption {
    value: string
    label: string
    /** Keterangan tambahan di kanan opsi */
    meta?: string
}

export interface SelectBoxProps {
    options: SelectOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    emptyText?: string
    disabled?: boolean
    /** Izinkan mengosongkan pilihan (menambah opsi "Semua") */
    clearable?: boolean
    /** Label untuk opsi kosong, dipakai bila clearable aktif */
    clearLabel?: string
    /** Aktifkan pencarian di dalam daftar (default true) */
    searchable?: boolean
    size?: 'sm' | 'md'
    className?: string
    ariaLabel?: string
}

/**
 * Versi ringkas Combobox untuk daftar opsi sederhana (pengganti <select>),
 * dengan pencarian, navigasi keyboard, dan ARIA yang konsisten.
 */
export function SelectBox({
    options,
    value,
    onChange,
    placeholder = 'Pilih...',
    emptyText = 'Tidak ditemukan',
    disabled = false,
    clearable = false,
    clearLabel = 'Semua',
    searchable = true,
    size = 'md',
    className = '',
    ariaLabel,
}: SelectBoxProps) {
    const items = useMemo<SelectOption[]>(
        () => (clearable ? [{ value: '', label: clearLabel }, ...options] : options),
        [options, clearable, clearLabel]
    )

    return (
        <Combobox<SelectOption>
            items={items}
            value={value}
            onChange={(item) => onChange(item ? item.value : '')}
            getKey={(option) => option.value}
            getLabel={(option) => option.label}
            getSearchText={(option) => `${option.label} ${option.meta ?? ''}`}
            placeholder={placeholder}
            emptyText={emptyText}
            noItemsText={emptyText}
            disabled={disabled}
            clearable={clearable}
            searchable={searchable}
            size={size}
            className={className}
            ariaLabel={ariaLabel}
            renderOption={(option, ctx) => (
                <div className="flex items-center gap-2">
                    {ctx.isSelected && <IconCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                        <HighlightText text={option.label} query={ctx.query} />
                    </span>
                    {option.meta && (
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">{option.meta}</span>
                    )}
                </div>
            )}
        />
    )
}
