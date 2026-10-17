import { NextRequest, NextResponse } from 'next/server'

/**
 * Deteksi negara pengunjung berdasarkan header geo yang disuntik infra
 * (Vercel `x-vercel-ip-country`, Cloudflare `cf-ipcountry`, atau proxy lain).
 *
 * Dipakai form daftar mandiri untuk memilih kode negara default. Bila header
 * tidak tersedia, jatuh ke 'ID' (Indonesia).
 */

const GEO_HEADER_KEYS = [
    'x-vercel-ip-country',
    'cf-ipcountry',
    'x-country-code',
    'x-ip-country',
]

export async function GET(request: NextRequest) {
    for (const key of GEO_HEADER_KEYS) {
        const value = request.headers.get(key)
        if (value && /^[A-Za-z]{2}$/.test(value)) {
            return NextResponse.json({ country: value.toUpperCase() })
        }
    }

    return NextResponse.json({ country: 'ID' })
}
