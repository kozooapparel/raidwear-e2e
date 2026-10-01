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
    }))

    return (
        <FilterPills
            options={options}
            value={value}
            onChange={onChange}
            size="sm"
            className={className}
            ariaLabel="Filter status order"
        />
    )
}
