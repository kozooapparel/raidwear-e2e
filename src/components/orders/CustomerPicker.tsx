'use client'

import { useEffect, useId, useMemo, useRef, useState, type SVGProps } from 'react'
import type { Customer } from '@/types/database'

interface CustomerPickerProps {
    /** ID customer yang sedang terpilih ('' jika belum ada) */
    value: string
    /** Daftar customer yang bisa dipilih */
    customers: Customer[]
    disabled?: boolean
    /** User memilih customer dari daftar */
    onSelect: (customer: Customer) => void
    /** User menghapus pilihan customer */
    onClear: () => void
    /** User ingin menambah customer baru (dibawa kata kunci yang sudah diketik) */
    onCreateNew: (typedQuery: string) => void
}

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

const IconPlus = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 5v14M5 12h14" />
    </svg>
)

/** Ambil hanya digit agar pencarian nomor HP tetap cocok walau ada spasi/tanda hubung */
const digitsOnly = (value: string) => value.replace(/\D/g, '')

/** Sorot bagian nama yang cocok dengan kata kunci */
const highlightMatch = (text: string, query: string) => {
    const needle = query.trim()
    if (!needle) return text
    const index = text.toLowerCase().indexOf(needle.toLowerCase())
    if (index === -1) return text
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

/**
 * Smart customer picker untuk order baru.
 * - Klik/fokus langsung membuka daftar customer dan siap diketik
 * - Cari berdasarkan nama, nomor HP, kota, atau alamat
 * - Selalu ada aksi "+ Customer Baru" di dalam daftar
 * - Navigasi keyboard: Arrow Up/Down, Enter, Escape, Tab
 */
export default function CustomerPicker({
    value,
    customers,
    disabled = false,
    onSelect,
    onClear,
    onCreateNew,
}: CustomerPickerProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const listboxId = useId()

    const selected = useMemo(() => customers.find(c => c.id === value) ?? null, [customers, value])

    // Filter instan di sisi klien supaya terasa cepat
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return customers
        const qDigits = digitsOnly(q)
        const matches = customers.filter(c => {
            if (c.name.toLowerCase().includes(q)) return true
            if (qDigits.length > 0 && digitsOnly(c.phone).includes(qDigits)) return true
            if ((c.kota ?? '').toLowerCase().includes(q)) return true
            if ((c.alamat ?? '').toLowerCase().includes(q)) return true
            return false
        })
        // Nama yang diawali kata kunci ditampilkan lebih dulu
        return matches.sort((a, b) => {
            const aStart = a.name.toLowerCase().startsWith(q) ? 0 : 1
            const bStart = b.name.toLowerCase().startsWith(q) ? 0 : 1
            return aStart - bStart || a.name.localeCompare(b.name)
        })
    }, [customers, query])

    // Sorotan diklem saat render supaya tidak perlu setState di dalam effect
    const safeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0))

    // Tutup saat klik di luar
    useEffect(() => {
        if (!open) return
        const handlePointerDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

    const commit = (customer: Customer) => {
        setOpen(false)
        setQuery('')
        onSelect(customer)
        inputRef.current?.blur()
    }

    const openCreate = () => {
        const typed = query.trim()
        setOpen(false)
        setQuery('')
        onCreateNew(typed)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!open) {
                setOpen(true)
                return
            }
            setActiveIndex(Math.min(safeIndex + 1, Math.max(filtered.length - 1, 0)))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(Math.max(safeIndex - 1, 0))
        } else if (e.key === 'Enter') {
            // Jangan sampai men-submit form order di belakangnya
            e.preventDefault()
            if (open && filtered[safeIndex]) {
                commit(filtered[safeIndex])
            } else if (query.trim()) {
                openCreate()
            }
        } else if (e.key === 'Escape') {
            if (open) {
                // Cegah Escape ikut menutup modal order
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
            }
        } else if (e.key === 'Tab') {
            setOpen(false)
        }
    }

    // Saat daftar tertutup, tampilkan nama customer yang terpilih
    const displayValue = open ? query : selected?.name ?? ''
    const showList = open && !disabled
    const emptyList = customers.length === 0
    const noResult = !emptyList && filtered.length === 0
    const selectedMeta = selected ? [selected.kota, selected.alamat].filter(Boolean).join(' · ') : ''

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconSearch className="h-4 w-4" />
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-label="Cari customer"
                    aria-activedescendant={
                        showList && filtered[safeIndex] ? `${listboxId}-${filtered[safeIndex].id}` : undefined
                    }
                    value={displayValue}
                    disabled={disabled}
                    placeholder="Cari nama, no. HP, atau kota..."
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setActiveIndex(0)
                        setOpen(true)
                    }}
                    onFocus={(e) => {
                        setQuery('')
                        setActiveIndex(0)
                        setOpen(true)
                        e.target.select()
                    }}
                    onBlur={() => {
                        setOpen(false)
                        setQuery('')
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {selected && (
                    <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                        <span className="text-emerald-500" title="Customer terpilih">
                            <IconCheck className="h-4 w-4" />
                        </span>
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Hapus pilihan customer"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onClear()
                                setQuery('')
                                inputRef.current?.focus()
                            }}
                            className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                            <IconClose className="h-4 w-4" />
                        </button>
                    </span>
                )}
            </div>

            {selected && !open && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">{selected.phone}</span>
                    {selectedMeta && <span className="text-slate-400">· {selectedMeta}</span>}
                </p>
            )}

            {showList && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-fadeIn">
                    {emptyList || noResult ? (
                        <div className="px-4 py-6 text-center">
                            <p className="text-sm text-slate-500">
                                {emptyList ? 'Belum ada customer' : 'Customer tidak ditemukan'}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Buat baru tanpa keluar dari form order
                            </p>
                        </div>
                    ) : (
                        <ul
                            ref={listRef}
                            id={listboxId}
                            role="listbox"
                            className="max-h-64 overflow-y-auto py-1 scrollbar-thin"
                        >
                            {filtered.map((customer, index) => {
                                const isActive = index === safeIndex
                                const isSelected = customer.id === value
                                return (
                                    <li
                                        key={customer.id}
                                        id={`${listboxId}-${customer.id}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => commit(customer)}
                                        className={`flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
                                            isActive ? 'bg-brand-50' : ''
                                        }`}
                                    >
                                        {isSelected && <IconCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {highlightMatch(customer.name, query)}
                                            </p>
                                            <p className="truncate text-xs text-slate-400">
                                                {customer.phone}
                                                {customer.kota ? ` · ${customer.kota}` : ''}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {/* Aksi utama: tambah customer baru tanpa keluar dari form order */}
                    <div className="border-t border-slate-100 bg-slate-50/80">
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={openCreate}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                                <IconPlus className="h-3 w-3" />
                            </span>
                            <span className="truncate">
                                Customer Baru
                                {query.trim() && (
                                    <span className="font-normal text-slate-500">: &ldquo;{query.trim()}&rdquo;</span>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
