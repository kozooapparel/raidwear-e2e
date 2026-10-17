'use client'

import { useMemo } from 'react'
import type { CountryCode } from '@/lib/data/country-codes'
import { COUNTRY_CODES, DEFAULT_COUNTRY_ISO, isoToFlag } from '@/lib/data/country-codes'
import Combobox from './Combobox'

interface CountryCodePickerProps {
    /** Kode ISO 3166-1 alpha-2 negara terpilih (contoh: 'ID'). */
    value: string
    /** Dipanggil dengan kode ISO negara yang dipilih. */
    onChange: (iso: string) => void
    disabled?: boolean
    ariaLabel?: string
    className?: string
}

/**
 * Pemilih kode negara untuk form nomor telepon.
 *
 * Menampilkan flag emoji + kode panggil pada tombol, dan daftar pencarian
 * lengkap (~250 negara) saat dibuka. Nilai yang diterima/dikeluarkan adalah
 * kode ISO alpha-2; pemanggil menerjemahkannya ke kode panggil (dial) lewat
 * `getDialByIso` saat menyimpan.
 */
export default function CountryCodePicker({
    value,
    onChange,
    disabled = false,
    ariaLabel,
    className = '',
}: CountryCodePickerProps) {
    const items = useMemo(() => COUNTRY_CODES, [])

    return (
        <Combobox<CountryCode>
            items={items}
            value={value || DEFAULT_COUNTRY_ISO}
            onChange={(item) => onChange(item ? item.iso : DEFAULT_COUNTRY_ISO)}
            getKey={(c) => c.iso}
            getLabel={(c) => `${isoToFlag(c.iso)} +${c.dial}`}
            getSearchText={(c) => `${c.name} ${c.dial} ${c.iso}`}
            placeholder="Cari negara..."
            emptyText="Negara tidak ditemukan"
            noItemsText="Tidak ada negara"
            disabled={disabled}
            clearable={false}
            searchable
            size="md"
            ariaLabel={ariaLabel ?? 'Pilih kode negara'}
            className={className}
            maxHeightClass="max-h-72"
            renderOption={(c) => (
                <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-base leading-none">
                        {isoToFlag(c.iso)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                        {c.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                        +{c.dial}
                    </span>
                </div>
            )}
        />
    )
}
