'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Clock, Maximize2, MessageSquare, Send, X } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface LayoutReviewProps {
    layoutPreviewUrl: string | null
    mockupUrl: string | null
    designNotes: string | null
    approved: boolean
    approvedAt: string | null
    revisionNote: string | null
    revisionRequestedAt: string | null
    /** true hanya bila order masih di tahap proses_layout. */
    canRespond: boolean
    submitting: boolean
    onApprove: () => void
    onRequestRevision: (note: string) => void
}

type ZoomedImage = { src: string; alt: string }

/**
 * Panel persetujuan layout (ACC) dan permintaan revisi.
 * Urutan tampilan: mockup desain sebagai referensi di atas, gambar layout yang
 * perlu disetujui di bawah. Kedua gambar bisa diklik untuk dibuka dalam popup
 * berukuran penuh agar detail lebih jelas.
 */
export function LayoutReview({
    layoutPreviewUrl,
    mockupUrl,
    designNotes,
    approved,
    approvedAt,
    revisionNote,
    revisionRequestedAt,
    canRespond,
    submitting,
    onApprove,
    onRequestRevision,
}: LayoutReviewProps) {
    const [showRevisionForm, setShowRevisionForm] = useState(false)
    const [revisionInput, setRevisionInput] = useState('')
    const [zoomedImage, setZoomedImage] = useState<ZoomedImage | null>(null)

    // Popup: tutup dengan Escape dan kunci scroll halaman selama terbuka.
    useEffect(() => {
        if (!zoomedImage) return
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setZoomedImage(null)
        }
        document.addEventListener('keydown', handleKeyDown)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [zoomedImage])

    function handleSubmitRevision() {
        const note = revisionInput.trim()
        if (!note) return
        onRequestRevision(note)
        setRevisionInput('')
        setShowRevisionForm(false)
    }

    const zoomOverlay = zoomedImage && (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setZoomedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={zoomedImage.alt}
        >
            <button
                type="button"
                className="absolute right-4 top-4 z-[101] rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                onClick={() => setZoomedImage(null)}
                aria-label="Tutup pratinjau"
            >
                <X className="h-7 w-7" />
            </button>
            <div
                className="relative h-full max-h-[90vh] w-full max-w-5xl"
                onClick={(e) => e.stopPropagation()}
            >
                <Image src={zoomedImage.src} alt={zoomedImage.alt} fill className="object-contain" priority />
            </div>
        </div>
    )

    const hasLayout = Boolean(layoutPreviewUrl)

    // Placeholder hanya bila mockup dan gambar layout sama-sama belum ada.
    if (!layoutPreviewUrl && !mockupUrl) {
        return (
            <>
                <section className="surface p-5">
                    <h2 className="text-sm font-semibold text-slate-900">Layout &amp; Persetujuan</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Gambar layout belum tersedia. Kami akan mengabari Anda setelah layout siap
                        untuk diperiksa.
                    </p>
                </section>
                {zoomOverlay}
            </>
        )
    }

    return (
        <>
            <section className="surface p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-900">Layout &amp; Persetujuan</h2>
                    {approved && hasLayout ? (
                        <span className="badge badge-success">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Disetujui
                        </span>
                    ) : hasLayout && canRespond ? (
                        <span className="badge badge-warning">
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            Menunggu ACC
                        </span>
                    ) : hasLayout ? (
                        <span className="badge badge-info">
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            Tahap Layout Selesai
                        </span>
                    ) : (
                        <span className="badge badge-info">
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            Menyiapkan Layout
                        </span>
                    )}
                </div>

                {/* Mockup desain sebagai referensi — diletakkan di atas */}
                {mockupUrl && (
                    <div className="mb-4">
                        <p className="mb-2 text-xs font-medium text-slate-500">Mockup desain (referensi)</p>
                        <button
                            type="button"
                            onClick={() => setZoomedImage({ src: mockupUrl, alt: 'Mockup desain' })}
                            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                            aria-label="Perbesar mockup desain"
                        >
                            <Image
                                src={mockupUrl}
                                alt="Mockup desain"
                                width={800}
                                height={600}
                                className="h-auto w-full object-cover"
                            />
                            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                                <Maximize2 className="h-3.5 w-3.5" />
                                Perbesar
                            </span>
                        </button>
                    </div>
                )}

                {/* Gambar layout yang perlu disetujui — diletakkan di bawah */}
                {layoutPreviewUrl ? (
                    <>
                        <p className="mb-2 text-xs font-medium text-slate-500">Layout siap cetak</p>
                        <button
                            type="button"
                            onClick={() => setZoomedImage({ src: layoutPreviewUrl, alt: 'Gambar layout' })}
                            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                            aria-label="Perbesar gambar layout"
                        >
                            <Image
                                src={layoutPreviewUrl}
                                alt="Gambar layout"
                                width={800}
                                height={600}
                                className="h-auto w-full object-cover"
                            />
                            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                                <Maximize2 className="h-3.5 w-3.5" />
                                Perbesar
                            </span>
                        </button>
                    </>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                        Layout cetak sedang disiapkan. Mockup desain di atas ditampilkan sebagai
                        referensi. Kami akan mengabari Anda setelah layout siap untuk diperiksa.
                    </div>
                )}

                {designNotes && <p className="mt-3 text-sm text-slate-600">{designNotes}</p>}

                {!hasLayout ? null : approved ? (
                    <div className="mt-4 rounded-xl border border-success-100 bg-success-50 p-3 text-sm text-success-700">
                        Terima kasih. Layout telah disetujui
                        {approvedAt ? ` pada ${formatDate(approvedAt)}` : ''}.
                    </div>
                ) : revisionRequestedAt ? (
                    <div className="mt-4 rounded-xl border border-info-100 bg-info-50 p-3 text-sm text-info-700">
                        <p>
                            Permintaan revisi Anda sudah terkirim pada {formatDate(revisionRequestedAt)}.
                            Tim kami akan segera memperbarui layout.
                        </p>
                        {revisionNote && (
                            <p className="mt-1 text-info-700/80">Catatan: {revisionNote}</p>
                        )}
                    </div>
                ) : !canRespond ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                        Tahap persetujuan layout sudah selesai karena order telah masuk ke proses
                        berikutnya. Hubungi customer service bila ada perubahan.
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {!showRevisionForm ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    className="btn flex-1 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-emerald-600"
                                    onClick={onApprove}
                                    disabled={submitting}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {submitting ? 'Memproses...' : 'Setujui Layout'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary flex-1"
                                    onClick={() => setShowRevisionForm(true)}
                                    disabled={submitting}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Ajukan Revisi
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="revision-note" className="text-sm font-medium text-slate-700">
                                    Apa yang ingin direvisi?
                                </label>
                                <textarea
                                    id="revision-note"
                                    className="input min-h-24 resize-y"
                                    placeholder="Contoh: posisi logo digeser ke tengah, warna nama lebih terang."
                                    value={revisionInput}
                                    onChange={(e) => setRevisionInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        disabled={!revisionInput.trim() || submitting}
                                        onClick={handleSubmitRevision}
                                    >
                                        <Send className="h-4 w-4" />
                                        {submitting ? 'Mengirim...' : 'Kirim Revisi'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => setShowRevisionForm(false)}
                                        disabled={submitting}
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {zoomOverlay}
        </>
    )
}
