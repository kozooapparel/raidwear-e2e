'use client'

import FilterPills from './FilterPills'
import type { FilterPillOption, FilterTone } from './FilterPills'

export type OrderFilter = 'all' | 'needs_action' | 'ready_move' | 'bottleneck' | 'deadline_soon'

interface OrderStatusFilterProps {
    value: OrderFilter
    onChange: (filter: OrderFilter) => void
    /** Jumlah order per filter, opsional — ditampilkan sebagai angka kecil di pil */
    counts?: Partial<Record<OrderFilter, number>>
    className?: string
}

/**
 * Titik warna sebagai penanda status: arti tiap filter tetap terbaca tanpa
 * bergantung pada warna latar pil (warna bukan satu-satunya penanda).
 */
const TONE_DOT: Record<FilterTone, string> = {
    brand: 'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    danger: 'bg-red-500',
    neutral: 'bg-slate-400',
}

const FILTER_OPTIONS: { value: OrderFilter; label: string; tone: FilterTone }[] = [
    { value: 'all', label: 'Semua', tone: 'neutral' },
    { value: 'needs_action', label: 'Perlu Action', tone: 'danger' },
    { value: 'ready_move', label: 'Siap Pindah', tone: 'success' },
    { value: 'bottleneck', label: 'Bottleneck', tone: 'warning' },
    { value: 'deadline_soon', label: 'Deadline Dekat', tone: 'info' },
]

export default function OrderStatusFilter({ value, onChange, counts, className }: OrderStatusFilterProps) {
    const options: FilterPillOption<OrderFilter>[] = FILTER_OPTIONS.map((option) => ({
        ...option,
        count: counts?.[option.value],
        // Pil terpilih memakai satu nada netral (bukan satu warna per status) supaya
        // warna aksen halaman tetap dipakai tombol aksi utama; status dibawa titik.
        tone: 'neutral' as FilterTone,
        icon: (
            <span
                className={`h-[6px] w-[6px] shrink-0 rounded-full ${TONE_DOT[option.tone]}`}
                aria-hidden="true"
            />
        ),
    }))

    return (
        <FilterPills
            options={options}
            value={value}
            onChange={onChange}
            size="md"
            className={className}
            ariaLabel="Filter status order"
        />
    )
}
