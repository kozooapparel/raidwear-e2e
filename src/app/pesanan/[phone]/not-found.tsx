import Link from 'next/link'
import type { Metadata } from 'next'
import { PackageSearch } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Link Tidak Ditemukan — RAIDWEAR',
    robots: { index: false, follow: false },
}

/**
 * Halaman 404 untuk /pesanan/[phone] yang tidak dikenali.
 */
export default function PesananNotFound() {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
            <div className="surface max-w-sm p-8 text-center">
                <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
                <h1 className="mt-4 text-lg font-semibold text-slate-900">
                    Akun tidak ditemukan
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Tautan yang Anda buka tidak dikenali. Hubungi admin atau CS
                    RAIDWEAR untuk mendapatkan tautan akses yang benar.
                </p>
                <Link
                    href="/pesanan"
                    className="btn-secondary mt-6 inline-flex w-full justify-center"
                >
                    Daftar Akses
                </Link>
            </div>
        </div>
    )
}