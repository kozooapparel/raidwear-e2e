'use client'

import * as React from 'react'

export type GridPulseProps = Omit<
    React.ComponentPropsWithoutRef<'div'>,
    'children'
> & {
    /** Ukuran sel dalam px. Garis tipis dan sel yang menyala memakainya sama. */
    cell?: number
    /** Sejauh apa dari kursor sebuah sel masih bisa menangkap cahaya, dalam satuan sel. */
    reach?: number
    /** Berapa sel yang menyala sendiri setiap irama, agar grid tidak pernah mati. */
    ambient?: number
    /** Batas maksimum, agar sapuan cepat tidak menyalakan seluruh bidang sekaligus. */
    maxLit?: number
    /**
     * Elemen yang baris teksnya dihindari cahaya, dicari di dalam parent grid.
     */
    avoid?: string
}

/** Hue di bagian atas bidang dan seberapa jauh ia berputar ke bawah: kuning,
 *  melewati oranye, merah, magenta dan biru, sampai hijau. */
const HUE_TOP = 60
const HUE_SPAN = 270
/**
 * Setiap sel memakai salah satu tingkat terang dari daftar ini, sehingga sapuan
 * terbaca sebagai bidang berwarna, bukan satu warna datar. Di latar gelap ujung
 * terang tangga ini akan pudar melewati abu-abu, jadi ia mulai lebih dalam.
 */
const TINTS = [88, 80, 72, 64, 56]
const TINTS_DARK = [72, 65, 58, 51, 44]
/** Seberapa redup sebuah sel tepat di belakang baris teks. */
const FAINT = 0.13
/** Berapa sel yang dibutuhkan untuk kembali ke kekuatan penuh. */
const FADE = 2.2
/** Ruang kosong di sekitar setiap baris teks, dalam px. */
const PAD = 5
const FADE_IN = 160
const FADE_OUT = 750

type Cell = {
    col: number
    row: number
    colour: string
    /** Seberapa banyak warnanya yang boleh muncul, 0 sampai 1. */
    dim: number
    born: number
    /** Kapan ia mulai memudar. */
    until: number
}

const easeOut = (t: number) => 1 - (1 - t) ** 2
const easeIn = (t: number) => t * t

/**
 * Grid halus yang mengambil warna saat kursor melewatinya dan melepaskannya
 * sesaat kemudian, dengan beberapa sel menyala sendiri. Spektrum berjalan turun
 * di bidang seperti tabel warna tercetak, sehingga sapuan menampilkan satu pita
 * warna yang koheren, bukan konfeti.
 *
 * Tempatkan di dalam container ber-`position`, di bawah konten. Ini hanya
 * dekorasi: disembunyikan dari teknologi bantu, transparan terhadap pointer,
 * digambar di satu canvas yang tidur saat tidak ada yang menyala, dijeda saat
 * di luar layar, dan diam bagi pembaca yang meminta gerak dikurangi.
 */
export function GridPulse({
    cell = 24,
    reach = 2.6,
    ambient = 2,
    maxLit = 180,
    avoid = '[data-grid-avoid]',
    className,
    style,
    ...props
}: GridPulseProps) {
    const box = React.useRef<HTMLDivElement>(null)
    const canvas = React.useRef<HTMLCanvasElement>(null)

    React.useEffect(() => {
        const el = box.current
        const paper = canvas.current
        const ctx = paper?.getContext('2d')
        if (!el || !paper || !ctx) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        let cols = 1
        let rows = 1
        let width = 0
        let height = 0
        let clear: DOMRect[] = []
        let tints = TINTS
        const cells = new Map<string, Cell>()

        // Latar terang atau gelap, dibaca dari warna teks yang diwarisi grid,
        // sehingga mengikuti tema apa pun. Diselesaikan lewat pixel, karena
        // warna computed bisa berbentuk oklch.
        const probe = document.createElement('canvas').getContext('2d', {
            willReadFrequently: true,
        })
        const readTheme = () => {
            if (!probe) return
            probe.clearRect(0, 0, 1, 1)
            probe.fillStyle = getComputedStyle(el).color
            probe.fillRect(0, 0, 1, 1)
            const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
            const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5
            tints = light ? TINTS_DARK : TINTS
        }

        // Lindungi baris teks, bukan kotak yang memuatnya: paragraf dengan
        // ukuran tertentu tetap mempertahankan lebar itu pada baris terakhirnya
        // yang pendek, dan kotaknya akan memegang pita sel gelap di tempat yang
        // tidak ada yang perlu dibaca.
        const measureText = () => {
            const bounds = el.getBoundingClientRect()
            const scope = el.parentElement ?? document
            clear = [...scope.querySelectorAll(avoid)].flatMap((node) => {
                const range = document.createRange()
                range.selectNodeContents(node)
                const lines = [...range.getClientRects()].filter(
                    (r) => r.width > 0 && r.height > 0,
                )
                const boxes = lines.length > 0 ? lines : [node.getBoundingClientRect()]
                return boxes.map(
                    (r) =>
                        new DOMRect(
                            r.left - bounds.left - PAD,
                            r.top - bounds.top - PAD,
                            r.width + PAD * 2,
                            r.height + PAD * 2,
                        ),
                )
            })
        }

        const measure = () => {
            width = el.clientWidth
            height = el.clientHeight
            cols = Math.max(1, Math.ceil(width / cell))
            rows = Math.max(1, Math.ceil(height / cell))
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            paper.width = Math.round(width * dpr)
            paper.height = Math.round(height * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            readTheme()
            measureText()
            wake()
        }

        /**
         * Seberapa terang sebuah sel, berdasarkan jaraknya dari baris teks
         * terdekat. Sel di belakang kata menjadi redup, bukan gelap: lubang yang
         * dipotong di grid terbaca sebagai cacat, penurunan kecerahan terbaca
         * sebagai kedalaman.
         */
        const brightness = (col: number, row: number) => {
            const x = col * cell + cell / 2
            const y = row * cell + cell / 2
            let nearest = Number.POSITIVE_INFINITY
            for (const r of clear) {
                const dx = Math.max(r.left - x, 0, x - r.right)
                const dy = Math.max(r.top - y, 0, y - r.bottom)
                nearest = Math.min(nearest, Math.hypot(dx, dy))
                if (nearest === 0) break
            }
            if (nearest === Number.POSITIVE_INFINITY) return 1
            return FAINT + (1 - FAINT) * Math.min(1, nearest / (FADE * cell))
        }

        const ink = (row: number) => {
            const t = rows > 1 ? Math.min(1, row / (rows - 1)) : 0
            const hue = (((HUE_TOP - t * HUE_SPAN) % 360) + 360) % 360
            const tint = tints[Math.floor(Math.random() * tints.length)]
            return `hsl(${Math.round(hue)} 94% ${tint}%)`
        }

        // Satu loop menggambar setiap sel; ia hanya berjalan saat ada yang menyala.
        let frame = 0
        const draw = (now: number) => {
            frame = 0
            ctx.clearRect(0, 0, width, height)
            for (const [key, c] of cells) {
                let alpha: number
                if (now < c.until) {
                    alpha = easeOut(Math.min(1, (now - c.born) / FADE_IN))
                } else {
                    const t = (now - c.until) / FADE_OUT
                    if (t >= 1) {
                        cells.delete(key)
                        continue
                    }
                    alpha = 1 - easeIn(t)
                }
                ctx.globalAlpha = alpha * c.dim
                ctx.fillStyle = c.colour
                // Diinset sebesar garis tipis, agar grid tetap terlihat di antara sel yang menyala.
                ctx.fillRect(c.col * cell + 1, c.row * cell + 1, cell - 1, cell - 1)
            }
            ctx.globalAlpha = 1
            if (cells.size > 0) frame = requestAnimationFrame(draw)
        }
        const wake = () => {
            if (!frame) frame = requestAnimationFrame(draw)
        }

        /** Menyalakan satu sel, kecuali ia di luar grid atau sudah menyala. */
        const light = (col: number, row: number, hold: number) => {
            if (col < 0 || row < 0 || col >= cols || row >= rows) return
            if (cells.size >= maxLit) return
            const key = `${col},${row}`
            const now = performance.now()
            const lit = cells.get(key)
            if (lit && now < lit.until) return
            // Sel yang tertangkap lagi saat memudar melanjutkan dari posisi
            // terakhirnya, bukan berkedip keluar lalu masuk lagi.
            let born = now
            if (lit) {
                const faded = 1 - easeIn(Math.min(1, (now - lit.until) / FADE_OUT))
                born = now - (1 - Math.sqrt(1 - faded)) * FADE_IN
            }
            cells.set(key, {
                col,
                row,
                colour: lit?.colour ?? ink(row),
                dim: brightness(col, row),
                born,
                until: now + hold,
            })
            wake()
        }

        // Pointer yang melukis. Sel yang lebih jauh darinya lebih jarang
        // menangkap cahaya, sehingga tepi jejaknya pecah, bukan bergerak sebagai blok.
        let pending = 0
        let at: { x: number; y: number } | null = null
        const paint = () => {
            pending = 0
            if (!at) return
            const cx = Math.floor(at.x / cell)
            const cy = Math.floor(at.y / cell)
            const span = Math.ceil(reach)
            for (let dy = -span; dy <= span; dy++) {
                for (let dx = -span; dx <= span; dx++) {
                    const away = Math.hypot(dx, dy)
                    if (away > reach) continue
                    if (Math.random() > 1 - away / (reach + 0.6)) continue
                    light(cx + dx, cy + dy, 260 + Math.random() * 900)
                }
            }
        }
        // Didengarkan di window, karena grid berada di bawah konten dan tidak
        // pernah menerima pointer itu sendiri.
        const onMove = (event: PointerEvent) => {
            const bounds = el.getBoundingClientRect()
            at = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
            if (!pending) pending = requestAnimationFrame(paint)
        }

        // Beberapa sel menyala sendiri, agar grid tetap hidup saat baru dibuka
        // dan di layar tanpa pointer. Dijeda saat di luar pandangan.
        let visible = true
        let beat = 0
        const drift = () => {
            beat = window.setTimeout(drift, 1400 + Math.random() * 1800)
            if (!visible || document.hidden) return
            for (let i = 0; i < ambient; i++) {
                light(
                    Math.floor(Math.random() * cols),
                    Math.floor(Math.random() * rows),
                    900 + Math.random() * 1600,
                )
            }
        }
        beat = window.setTimeout(drift, 500)

        const sight = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true
        })
        sight.observe(el)
        const resize = new ResizeObserver(measure)
        resize.observe(el)
        // Teks yang ditambah, dihapus, atau ditulis ulang memindahkan baris yang dihindari.
        let recheck = 0
        const copy = new MutationObserver(() => {
            if (!recheck) {
                recheck = requestAnimationFrame(() => {
                    recheck = 0
                    measureText()
                })
            }
        })
        copy.observe(el.parentElement ?? document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        })
        const theme = new MutationObserver(readTheme)
        theme.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme'],
        })
        const scheme = window.matchMedia('(prefers-color-scheme: dark)')
        scheme.addEventListener('change', readTheme)
        measure()
        // Baris teks bergeser setelah web font tiba.
        document.fonts?.ready.then(measureText).catch(() => {})
        window.addEventListener('pointermove', onMove, { passive: true })

        return () => {
            sight.disconnect()
            resize.disconnect()
            copy.disconnect()
            cancelAnimationFrame(recheck)
            theme.disconnect()
            scheme.removeEventListener('change', readTheme)
            cancelAnimationFrame(frame)
            cancelAnimationFrame(pending)
            clearTimeout(beat)
            window.removeEventListener('pointermove', onMove)
        }
    }, [cell, reach, ambient, maxLit, avoid])

    return (
        <div
            ref={box}
            aria-hidden
            data-slot="grid-pulse"
            className={[
                // Garis tipis, samar sendiri agar sel yang menyala tetap pekat.
                // Tumpuk dengan --grid-pulse-line.
                'pointer-events-none absolute inset-0 overflow-hidden',
                '[--grid-pulse-line:color-mix(in_oklab,currentColor_7%,transparent)]',
                // Memudar di bagian bawah, agar apa pun yang menyusul bisa menaikinya.
                '[mask-image:linear-gradient(to_bottom,#000_92%,transparent)]',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            style={
                {
                    '--grid-pulse-cell': `${cell}px`,
                    backgroundImage:
                        'linear-gradient(to right, var(--grid-pulse-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-pulse-line) 1px, transparent 1px)',
                    backgroundSize: 'var(--grid-pulse-cell) var(--grid-pulse-cell)',
                    ...style,
                } as React.CSSProperties
            }
            {...props}
        >
            <canvas ref={canvas} className="absolute inset-0 size-full" />
        </div>
    )
}
