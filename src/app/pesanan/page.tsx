'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'
import { CountryCodePicker } from '@/components/ui'
import {
    DEFAULT_COUNTRY_ISO,
    getDialByIso,
    isKnownIso,
} from '@/lib/data/country-codes'
import { formatWaLink, formatPhoneInput } from '@/lib/utils/phone'

interface RegisterResult {
    success: boolean
    message: string
    status: 'pending' | 'active'
    phone_normalized: string | null
    name: string | null
    brand_phone: string | null
}

/**
 * Halaman form daftar mandiri /pesanan.
 *
 * Customer mengisi nama + nomor WA. RPC register_customer_request membuat
 * customer berstatus 'pending' (anti-spam); customer kemudian diarahkan ke
 * WhatsApp admin untuk disetujui secara manual.
 */
export default function PesananPage() {
    const supabase = useState(() => createClient())[0]
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<RegisterResult | null>(null)

    // Deteksi negara dari IP untuk default kode negara (fallback ke ID).
    useEffect(() => {
        let cancelled = false
        const detect = async () => {
            try {
                const res = await fetch('/api/geo')
                const json = (await res.json()) as { country?: string }
                if (!cancelled && json.country && isKnownIso(json.country)) {
                    setCountryIso(json.country)
                }
            } catch {
                // Abaikan kegagalan deteksi; tetap memakai default ID.
            }
        }
        detect()
        return () => { cancelled = true }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !phone.trim()) return

        setLoading(true)
        setResult(null)
        try {
            const { data, error } = await supabase.rpc(
                'register_customer_request',
                {
                    p_name: name.trim(),
                    p_phone: phone.trim(),
                    p_country_code: getDialByIso(countryIso),
                },
            )

            if (error) {
                setResult({
                    success: false,
                    message: error.message,
                    status: 'pending',
                    phone_normalized: null,
                    name: null,
                    brand_phone: null,
                })
                return
            }

            setResult(data as unknown as RegisterResult)
        } catch (err) {
            setResult({
                success: false,
                message:
                    err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.',
                status: 'pending',
                phone_normalized: null,
                name: null,
                brand_phone: null,
            })
        } finally {
            setLoading(false)
        }
    }

    const waText = result?.name
        ? `Halo, saya ${result.name} (WA: ${result.phone_normalized ?? phone.trim()}). Saya ingin mengaktifkan akses dashboard "Order Saya".`
        : 'Halo, saya ingin mengaktifkan akses dashboard "Order Saya".'

    const waLink = formatWaLink(
        result?.brand_phone || result?.phone_normalized,
        waText,
    )

    return (
        <div className="min-h-dvh bg-slate-50">
            <header className="border-b border-slate-200/70 bg-white">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                        RW
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            RAIDWEAR
                        </p>
                        <p className="text-xs text-slate-500">Akses Order Saya</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <div className="surface max-w-md mx-auto p-6 sm:p-8">
                    {!result ? (
                        <>
                            <div className="mb-6 text-center">
                                <h1 className="text-xl font-semibold text-slate-900">
                                    Akses Order Saya
                                </h1>
                                <p className="mt-2 text-sm text-slate-500">
                                    Masukkan data Anda. Kami akan memverifikasi
                                    permintaan Anda sebelum akses diaktifkan.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="pesanan-name"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        Nama
                                    </label>
                                    <input
                                        id="pesanan-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nama Anda"
                                        className="input"
                                        required
                                        autoComplete="name"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="pesanan-phone"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        No. WhatsApp
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="w-32 shrink-0">
                                            <CountryCodePicker
                                                value={countryIso}
                                                onChange={setCountryIso}
                                                ariaLabel="Pilih kode negara"
                                            />
                                        </div>
                                        <input
                                            id="pesanan-phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(formatPhoneInput(e.target.value, getDialByIso(countryIso)))}
                                            placeholder="81234567890"
                                            className="input flex-1"
                                            required
                                            autoComplete="tel"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full disabled:opacity-60"
                                >
                                    {loading ? 'Mengirim…' : 'Kirim Permintaan'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            {result.success ? (
                                <>
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 text-warning-700">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="mt-4 text-lg font-semibold text-slate-900">
                                        Permintaan terkirim
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        {result.message ||
                                            'Permintaan Anda sedang ditinjau.'}
                                    </p>
                                    {waLink && (
                                        <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary mt-6 inline-flex"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Lanjut ke WhatsApp
                                        </a>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Perlu perhatian
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        {result.message}
                                    </p>
                                    {result.status === 'active' &&
                                        result.phone_normalized && (
                                            <Link
                                                href={`/pesanan/${result.phone_normalized}`}
                                                className="btn-secondary mt-6 inline-flex"
                                            >
                                                Buka Dasbor Saya
                                            </Link>
                                        )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}