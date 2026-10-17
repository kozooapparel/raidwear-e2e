import Link from 'next/link'
import type { Metadata } from 'next'
import { PackageSearch } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Link Tidak Ditemukan — RAIDWEAR',
    robots: { index: false, follow: false },
}

/**
 * Halaman 404 untuk /portal/[token] yang tidak dikenali.
 * Tampilan ramah dengan tombol kembali ke halaman utama portal, konsisten
 * dengan halaman not-found pada /lacak/[token].
 */
export default function PortalNotFound() {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
            <div className="surface max-w-sm p-8 text-center">
                <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
                <h1 className="mt-4 text-lg font-semibold text-slate-900">
                    Order tidak ditemukan
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Tautan yang Anda buka tidak dikenali atau sudah tidak
                    berlaku. Hubungi admin atau CS RAIDWEAR untuk mendapatkan
                    tautan baru.
                </p>
                <Link
                    href="/"
                    className="btn-secondary mt-6 inline-flex w-full justify-center"
                >
                    Kembali ke Beranda
                </Link>
            </div>
        </div>
    )
}