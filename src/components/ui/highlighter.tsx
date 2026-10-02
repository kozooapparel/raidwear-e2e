'use client'

import * as React from 'react'

/* ============================================
   HIGHLIGHTER / SPOTLIGHT
   Port dari komponen referensi (HighlightGroup + HighlighterItem + Particles),
   disesuaikan dengan palet brand kita (merah) dan gaya kode repo ini.
   Tanpa ketergantungan dicons/framer-motion.
   ============================================ */

/** Warna brand utama, dipakai sebagai default agar konsisten di seluruh app. */
const BRAND = '#dc2626'
/**
 * Pemilih default: permukaan kartu (`.surface`) plus baris tabel (`tbody tr`).
 * Baris tabel ikut menjadi target agar kartu yang berisi banyak baris mendapat
 * sorotan per baris, bukan satu titik di seluruh kartu.
 */
const DEFAULT_SELECTOR = '.surface, .surface-elevated, [data-highlight], tbody tr'

export interface HighlightGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Pemilih elemen yang diberi sorotan mengikuti kursor. */
    selector?: string
    /** Matikan efek tanpa membongkar komponen (mis. saat mode gerak dikurangi). */
    disabled?: boolean
}

/**
 * Pembungkus yang menggerakkan sorotan mengikuti kursor untuk semua elemen
 * yang cocok di dalamnya. Cukup bungkus area konten sekali, maka seluruh kartu
 * `.surface` di dalamnya otomatis mendapat efek spotlight.
 *
 * Hanya menulis dua variabel CSS (`--mouse-x` / `--mouse-y`) per elemen pada
 * tiap frame, sementara pengukuran posisi dilakukan saat layout berubah, bukan
 * setiap kursor bergerak. Menghormati `prefers-reduced-motion`.
 */
export function HighlightGroup({
    selector = DEFAULT_SELECTOR,
    disabled = false,
    className,
    children,
    ...props
}: HighlightGroupProps) {
    const scopeRef = React.useRef<HTMLDivElement>(null)
    const targetsRef = React.useRef<HTMLElement[]>([])
    const rectsRef = React.useRef<Map<HTMLElement, DOMRect>>(new Map())
    const pointerRef = React.useRef({ x: 0, y: 0 })
    const frameRef = React.useRef(0)

    React.useEffect(() => {
        const scope = scopeRef.current
        if (!scope || disabled) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        // Ukur ulang daftar target dan posisinya. Dipanggil saat layout berubah,
        // bukan setiap kali kursor bergerak, agar tidak memicu reflow mahal.
        const measure = () => {
            targetsRef.current = Array.from(
                scope.querySelectorAll<HTMLElement>(selector),
            ).filter((el) => el.offsetParent !== null)
            rectsRef.current = new Map(
                targetsRef.current.map((el) => [el, el.getBoundingClientRect()]),
            )
        }

        const readRects = () => {
            rectsRef.current = new Map(
                targetsRef.current.map((el) => [el, el.getBoundingClientRect()]),
            )
        }

        const paint = () => {
            frameRef.current = 0
            const { x, y } = pointerRef.current
            for (const [el, rect] of rectsRef.current) {
                el.style.setProperty('--mouse-x', `${x - rect.left}px`)
                el.style.setProperty('--mouse-y', `${y - rect.top}px`)
            }
        }

        const onMove = (event: PointerEvent) => {
            pointerRef.current = { x: event.clientX, y: event.clientY }
            if (!frameRef.current) frameRef.current = requestAnimationFrame(paint)
        }

        const refresh = () => {
            measure()
        }

        measure()

        const resizeObserver = new ResizeObserver(readRects)
        resizeObserver.observe(scope)
        const mutationObserver = new MutationObserver(refresh)
        mutationObserver.observe(scope, { childList: true, subtree: true })

        window.addEventListener('pointermove', onMove, { passive: true })
        window.addEventListener('scroll', readRects, { passive: true })
        window.addEventListener('resize', readRects)

        return () => {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = 0
            resizeObserver.disconnect()
            mutationObserver.disconnect()
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('scroll', readRects)
            window.removeEventListener('resize', readRects)
            // Bersihkan variabel agar tidak ada sorotan yang tertinggal.
            for (const el of targetsRef.current) {
                el.style.removeProperty('--mouse-x')
                el.style.removeProperty('--mouse-y')
            }
        }
    }, [disabled, selector])

    return (
        <div
            ref={scopeRef}
            data-slot="highlight-group"
            className={['highlight-scope', className].filter(Boolean).join(' ')}
            {...props}
        >
            {children}
        </div>
    )
}

export interface HighlighterItemProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Jari-jari sorotan dalam px. */
    radius?: number
    /** Warna sorotan (default: warna brand). */
    color?: string
}

/**
 * Kartu dengan sorotan mengikuti kursor. Untuk dipakai eksplisit di luar
 * cakupan `.surface`. Di dalam `HighlightGroup`, variabel kursor sudah diset
 * otomatis, jadi cukup dibungkus tanpa prop tambahan.
 */
export function HighlighterItem({
    radius = 320,
    color = BRAND,
    className,
    children,
    style,
    ...props
}: HighlighterItemProps) {
    return (
        <div
            data-highlight
            className={['group relative overflow-hidden rounded-2xl', className]
                .filter(Boolean)
                .join(' ')}
            style={{ '--highlight-radius': `${radius}px`, ...style } as React.CSSProperties}
            {...props}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(var(--highlight-radius) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), color-mix(in srgb, ${color} 22%, transparent), transparent 62%)`,
                }}
            />
            <div className="relative z-10 h-full">{children}</div>
        </div>
    )
}

function hexToRgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '')
    const int = parseInt(value, 16)
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

type Circle = {
    x: number
    y: number
    translateX: number
    translateY: number
    size: number
    alpha: number
    targetAlpha: number
    dx: number
    dy: number
    magnetism: number
}

export interface ParticlesProps extends React.HTMLAttributes<HTMLDivElement> {
    quantity?: number
    staticity?: number
    ease?: number
    /** Warna partikel (default: warna brand). */
    color?: string
    vx?: number
    vy?: number
}

/**
 * Bidang partikel bergerak di canvas, tertarik ke arah kursor. Dekorasi saja:
 * disembunyikan dari teknologi bantu, transparan terhadap pointer, dan dijeda
 * saat di luar viewport, tab tidak aktif, atau saat pengguna meminta gerak
 * dikurangi.
 */
export function Particles({
    className = '',
    quantity = 30,
    staticity = 50,
    ease = 50,
    color = BRAND,
    vx = 0,
    vy = 0,
    ...props
}: ParticlesProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const contextRef = React.useRef<CanvasRenderingContext2D | null>(null)
    const circlesRef = React.useRef<Circle[]>([])
    const mouseRef = React.useRef({ x: 0, y: 0 })
    const sizeRef = React.useRef({ w: 0, h: 0 })
    const frameRef = React.useRef(0)
    const visibleRef = React.useRef(true)

    React.useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const context = canvas.getContext('2d')
        if (!context) return
        contextRef.current = context

        const rgb = hexToRgb(color)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        const circleParams = (): Circle => ({
            x: Math.floor(Math.random() * sizeRef.current.w),
            y: Math.floor(Math.random() * sizeRef.current.h),
            translateX: 0,
            translateY: 0,
            size: Math.floor(Math.random() * 2) + 1,
            alpha: 0,
            targetAlpha: parseFloat((Math.random() * 0.3 + 0.1).toFixed(1)),
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
            magnetism: 0.1 + Math.random() * 4,
        })

        const remapValue = (
            value: number,
            start1: number,
            end1: number,
            start2: number,
            end2: number,
        ) => {
            const remapped =
                ((value - start1) * (end2 - start2)) / (end1 - start1) + start2
            return remapped > 0 ? remapped : 0
        }

        const drawCircle = (circle: Circle, update = false) => {
            const ctx = contextRef.current
            if (!ctx) return
            ctx.translate(circle.translateX, circle.translateY)
            ctx.beginPath()
            ctx.arc(circle.x, circle.y, circle.size, 0, 2 * Math.PI)
            ctx.fillStyle = `rgba(${rgb.join(', ')}, ${circle.alpha})`
            ctx.fill()
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            if (!update) circlesRef.current.push(circle)
        }

        const clearContext = () => {
            contextRef.current?.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h)
        }

        const drawParticles = () => {
            clearContext()
            for (let i = 0; i < quantity; i++) {
                drawCircle(circleParams())
            }
        }

        const resizeCanvas = () => {
            if (!canvasRef.current || !contextRef.current) return
            circlesRef.current.length = 0
            sizeRef.current.w = container.offsetWidth
            sizeRef.current.h = container.offsetHeight
            canvasRef.current.width = sizeRef.current.w * dpr
            canvasRef.current.height = sizeRef.current.h * dpr
            canvasRef.current.style.width = `${sizeRef.current.w}px`
            canvasRef.current.style.height = `${sizeRef.current.h}px`
            contextRef.current.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        const initCanvas = () => {
            resizeCanvas()
            drawParticles()
        }

        const animate = () => {
            frameRef.current = requestAnimationFrame(animate)
            if (!visibleRef.current || document.hidden) return

            clearContext()
            circlesRef.current.forEach((circle, index) => {
                const edge = [
                    circle.x + circle.translateX - circle.size,
                    sizeRef.current.w - circle.x - circle.translateX - circle.size,
                    circle.y + circle.translateY - circle.size,
                    sizeRef.current.h - circle.y - circle.translateY - circle.size,
                ]
                const closestEdge = edge.reduce((a, b) => Math.min(a, b))
                const remapClosestEdge = parseFloat(
                    remapValue(closestEdge, 0, 20, 0, 1).toFixed(2),
                )
                if (remapClosestEdge > 1) {
                    circle.alpha += 0.02
                    if (circle.alpha > circle.targetAlpha) {
                        circle.alpha = circle.targetAlpha
                    }
                } else {
                    circle.alpha = circle.targetAlpha * remapClosestEdge
                }
                circle.x += circle.dx + vx
                circle.y += circle.dy + vy
                circle.translateX +=
                    (mouseRef.current.x / (staticity / circle.magnetism) -
                        circle.translateX) /
                    ease
                circle.translateY +=
                    (mouseRef.current.y / (staticity / circle.magnetism) -
                        circle.translateY) /
                    ease

                if (
                    circle.x < -circle.size ||
                    circle.x > sizeRef.current.w + circle.size ||
                    circle.y < -circle.size ||
                    circle.y > sizeRef.current.h + circle.size
                ) {
                    circlesRef.current.splice(index, 1)
                    drawCircle(circleParams())
                } else {
                    drawCircle({ ...circle }, true)
                }
            })
        }

        const onMouseMove = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            const x = event.clientX - rect.left - sizeRef.current.w / 2
            const y = event.clientY - rect.top - sizeRef.current.h / 2
            const inside =
                x < sizeRef.current.w / 2 &&
                x > -sizeRef.current.w / 2 &&
                y < sizeRef.current.h / 2 &&
                y > -sizeRef.current.h / 2
            if (inside) mouseRef.current = { x, y }
        }

        const onWindowResize = () => initCanvas()
        const onVisibility = () => {
            if (document.hidden) mouseRef.current = { x: 0, y: 0 }
        }

        initCanvas()
        animate()

        const sightObserver = new IntersectionObserver(([entry]) => {
            visibleRef.current = entry?.isIntersecting ?? true
        })
        sightObserver.observe(container)

        window.addEventListener('resize', onWindowResize)
        window.addEventListener('mousemove', onMouseMove, { passive: true })
        document.addEventListener('visibilitychange', onVisibility)

        return () => {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = 0
            sightObserver.disconnect()
            window.removeEventListener('resize', onWindowResize)
            window.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [quantity, staticity, ease, color, vx, vy])

    return (
        <div
            ref={containerRef}
            aria-hidden
            data-slot="particles"
            className={['pointer-events-none', className].filter(Boolean).join(' ')}
            {...props}
        >
            <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        </div>
    )
}
