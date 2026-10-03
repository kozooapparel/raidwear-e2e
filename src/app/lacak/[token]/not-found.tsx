import { SearchX } from 'lucide-react'

export default function PortalNotFound() {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
            <div className="surface w-full max-w-md p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <SearchX className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-h2 text-slate-900">Order tidak ditemukan</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Tautan tidak valid atau sudah kedaluwarsa. Pastikan Anda membuka tautan
                    terbaru dari kami, atau hubungi customer service untuk bantuan.
                </p>
            </div>
        </div>
    )
}
