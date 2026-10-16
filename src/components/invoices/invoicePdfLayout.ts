import { formatCurrency } from '@/lib/utils/format'

/**
 * Tata letak Invoice PDF — pemilihan kepadatan baris item.
 *
 * Tujuan: invoice A4 tetap **satu halaman** walau daftar itemnya panjang, tanpa
 * menghilangkan satu item pun dan tanpa mengecilkan huruf sampai tidak terbaca.
 *
 * ## Angka di bawah ini hasil pengukuran, bukan perkiraan
 *
 * Semua konstanta tetap diukur pada 16 Oktober 2026 dengan merender komponen
 * `InvoicePDF.tsx` asli lewat `@react-pdf/renderer` (`renderToBuffer`) di Node,
 * lalu membaca koordinat objek (teks & kotak) dari berkas PDF yang dihasilkan.
 * Cara mengukur ulang kalau nanti gaya invoice berubah:
 *
 *  1. `LINE_HEIGHT_FACTOR` = jarak baseline dua baris teks / fontSize → 1,1
 *     (diukur pada fontSize 10 / 9,5 / 9 / 8,5 / 8, sama semua = 1,1).
 *  2. Tinggi satu baris item = jumlah baris teks × 1,1 × fontSize
 *     + 2 × padding + 1 (garis bawah). Diuji: 1 baris/padding 8 → 28 pt,
 *     2 baris → 39 pt, 5 baris → 72 pt (cocok dengan hasil render).
 *  3. `ABOVE_TABLE` = jarak tepi atas area isi halaman (y = 40) ke tepi atas
 *     baris judul tabel, diukur dari baseline teks judul tabel (302,5 pt untuk
 *     template bawaan) dikurangi padding baris dan tinggi naik font.
 *  4. `TAIL_BASE`, `TAIL_PEMBAYARAN`, `TAIL_BANK`, `TAIL_PPN`, `ABOVE_NO_PO`
 *     diukur sebagai selisih tepi bawah kotak rekening antara dua render yang
 *     hanya berbeda pada satu keadaan (mis. dibayar 0 vs > 0 → 52,3 pt).
 *  5. `SAFE_CONTENT_BOTTOM` = batas bawah isi yang terbukti masih aman: pada render
 *     nyata, isi yang berakhir di 789,2 pt masih 1 halaman, sedangkan yang
 *     berikutnya (sekitar 803 pt, satu baris item lagi) sudah pecah 2 halaman —
 *     footer dokumen (dua teks di bawah, `position: absolute`) ternyata ikut
 *     mengambil ruang di aliran isi. Dipakai 788 pt supaya ada sisa aman.
 *
 * Perubahan salah satu gaya di `InvoicePDF.tsx` (padding halaman, margin header,
 * padding kotak customer, gaya blok total/terbilang/rekening, footer) membuat
 * angka-angka ini **basi** dan wajib diukur ulang dengan cara di atas.
 */

/** Tinggi halaman A4 dalam pt. */
export const A4_HEIGHT = 841.89
/** Tinggi halaman A4 dalam pt (lebar: 595.28) — dipakai untuk lebar kolom. */
export const A4_WIDTH = 595.28
/** Padding halaman (`styles.page`). */
export const PAGE_PADDING = 40
/** Lebar area isi = 595,28 − 2 × 40. */
export const CONTENT_WIDTH = A4_WIDTH - 2 * PAGE_PADDING
/** Tinggi satu baris teks Helvetica = 1,1 × fontSize (hasil pengukuran). */
export const LINE_HEIGHT_FACTOR = 1.1
/** Tinggi baris judul tabel (padding 8 + satu baris fontSize 10). Tidak ikut menipis. */
export const TABLE_HEADER_HEIGHT = 2 * 8 + LINE_HEIGHT_FACTOR * 10
/** Tinggi kotak alamat customer bila tidak ada baris tambahan (nama + alamat + telp). */
export const CUSTOMER_BOX_HEIGHT = 2 * 10 + 3 * LINE_HEIGHT_FACTOR * 10 + 4
/** Batas bawah (pt dari tepi atas halaman) isi yang masih aman dalam satu halaman. */
export const SAFE_CONTENT_BOTTOM = 788

/** Jarak tepi atas isi (40) sampai tepi atas baris judul tabel, per template. */
export const ABOVE_TABLE: Record<string, number> = {
    invoice_01: 247.32,
    invoice_02: 239.12,
    invoice_03: 269.92,
}
/** Tambahan tinggi header bila invoice memuat No. PO (satu baris info lagi). */
export const ABOVE_NO_PO = 15
/** Tinggi ujung dokumen (total + terbilang + rekening) tanpa pembayaran & rekening. */
export const TAIL_BASE = 110.48
/** Tambahan bila `total_dibayar > 0` (baris Dibayar + Sisa Tagihan). */
export const TAIL_PEMBAYARAN = 52.3
/** Tambahan bila blok rekening (`bankInfo`) ikut dicetak. */
export const TAIL_BANK = 89
/** Tambahan bila ada baris PPN. */
export const TAIL_PPN = 15

/** Lebar kolom tabel (persen dari lebar isi) — harus sama dengan `styles.col*`. */
const COLUMN_WIDTH_PCT = {
    desc: 0.40,
    qty: 0.10,
    unit: 0.10,
    price: 0.175,
    subtotal: 0.175,
}

/**
 * Toleransi kerning: PDFKit/`@react-pdf/renderer` merapatkan pasangan huruf, sehingga lebar
 * teks nyata ±1–3% lebih sempit daripada jumlah lebar huruf (tanpa kerning) di tabel di atas.
 * Diuji pada 108 kombinasi (12 deskripsi × 6 tingkat kepadatan): dengan 1,02 tidak ada satu pun
 * kasus yang jumlah barisnya diremehkan, sedangkan mulai 1,05 sudah mulai diremehkan — itu
 * sebabnya dipakai 1,02 (aman, bukan yang paling pas).
 */
const KERNING_TOLERANCE = 1.02

/**
 * Lebar karakter Helvetica (satuan 1/1000 em), kode karakter 32..126.
 * Diambil dari data AFM Helvetica yang dipakai `@react-pdf/pdfkit`, tanpa kerning
 * sehingga hasil hitungan selalu **sedikit lebih lebar** dari teks sesungguhnya
 * (aman: jumlah baris tidak pernah diremehkan).
 */
const HELVETICA_WIDTHS_32_126 = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

/** Lebar teks (pt) memakai tabel Helvetica; karakter di luar 32..126 dianggap 556. */
export function textWidth(text: string, fontSize: number): number {
    let units = 0
    for (const char of text) {
        const code = char.charCodeAt(0)
        const width = code >= 32 && code <= 126 ? HELVETICA_WIDTHS_32_126[code - 32] : 556
        units += width
    }
    return (units / 1000) * fontSize
}

/**
 * Jumlah baris teks setelah dibungkus (word wrap) pada lebar tertentu.
 * Meniru pembungkusan `@react-pdf/renderer`: per kata, dan kata yang lebih lebar
 * dari kolom dipotong per karakter.
 */
export function countWrappedLines(text: string, fontSize: number, maxWidth: number): number {
    const paragraphs = String(text ?? '').split(/\r?\n/)
    let total = 0

    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ').filter(word => word.length > 0)
        if (words.length === 0) {
            total += 1
            continue
        }

        let lines = 1
        let current = ''
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word
            if (textWidth(candidate, fontSize) <= maxWidth) {
                current = candidate
                continue
            }
            if (current) {
                lines += 1
                current = ''
            }
            // Kata tunggal yang tetap tidak muat: dipecah per karakter.
            let chunk = ''
            for (const char of word) {
                if (textWidth(chunk + char, fontSize) <= maxWidth) {
                    chunk += char
                } else {
                    lines += chunk ? 1 : 0
                    chunk = char
                }
            }
            current = chunk
        }
        total += lines
    }

    return Math.max(1, total)
}

/**
 * Tingkat kepadatan baris item, dari paling lega ke paling rapat.
 * `padding` tidak pernah di bawah 3 dan `fontSize` tidak pernah di bawah 8 supaya
 * invoice tetap terbaca — menerima 2 halaman lebih baik daripada tagihan tidak terbaca.
 */
export const ITEM_DENSITY_LEVELS = [
    { padding: 8, fontSize: 10 },
    { padding: 6, fontSize: 10 },
    { padding: 5, fontSize: 9.5 },
    { padding: 4, fontSize: 9 },
    { padding: 3.5, fontSize: 8.5 },
    { padding: 3, fontSize: 8 },
] as const

export interface ItemDensity {
    padding: number
    fontSize: number
}

export interface InvoiceItemLayoutInput {
    deskripsi?: string | null
    jumlah?: number | string | null
    satuan?: string | null
    harga_satuan?: number | null
    sub_total?: number | null
}

export interface InvoiceLayoutInput {
    items: InvoiceItemLayoutInput[]
    /** Template invoice: `invoice_01` (modern), `invoice_02` (minimal), `invoice_03` (bold). */
    templateId?: string | null
    /** Blok rekening ikut dicetak (`bankInfo` ada). */
    hasBankInfo: boolean
    /** `invoice.total_dibayar > 0` → ada baris Dibayar & Sisa Tagihan. */
    hasPembayaran: boolean
    /** `invoice.ppn_persen > 0` → ada baris PPN. */
    hasPpn: boolean
    /** `invoice.no_po` terisi → satu baris info di header. */
    hasNoPo: boolean
    /** Alamat customer (kotak "Kepada Yth.") — dihitung kalau panjangnya membungkus. */
    customerAddress?: string | null
}

export interface InvoiceLayoutResult extends ItemDensity {
    /** Perkiraan tepi bawah isi dokumen (pt dari tepi atas halaman) pada kepadatan ini. */
    estimatedContentBottom: number
    /** Perkiraan jumlah baris teks per baris item. */
    linesPerItem: number[]
    /**
     * `false` berarti walau pada kepadatan paling rapat yang masih terbaca isinya tetap
     * tidak muat satu halaman — pemilik keputusan soal meringkas item, bukan kode ini.
     */
    fitsOnePage: boolean
}

function itemTextLines(item: InvoiceItemLayoutInput, fontSize: number, padding: number): number {
    // Lebar kolom mengikuti lebar kotak isi baris (padding kiri/kanan baris ikut mengurangi),
    // sama seperti cara react-pdf menghitung persentase: (lebar isi − 2 × padding) × 40%.
    const rowContentWidth = (CONTENT_WIDTH - 2 * padding) * KERNING_TOLERANCE
    const descLines = countWrappedLines(String(item.deskripsi ?? ''), fontSize, rowContentWidth * COLUMN_WIDTH_PCT.desc)
    const priceLines = countWrappedLines(formatRupiah(item.harga_satuan), fontSize, rowContentWidth * COLUMN_WIDTH_PCT.price)
    const subtotalLines = countWrappedLines(formatRupiah(item.sub_total), fontSize, rowContentWidth * COLUMN_WIDTH_PCT.subtotal)
    const qtyLines = countWrappedLines(String(item.jumlah ?? ''), fontSize, rowContentWidth * COLUMN_WIDTH_PCT.qty)
    const unitLines = countWrappedLines(String(item.satuan ?? ''), fontSize, rowContentWidth * COLUMN_WIDTH_PCT.unit)
    return Math.max(1, descLines, priceLines, subtotalLines, qtyLines, unitLines)
}

/** `formatCurrency` dipakai apa adanya supaya lebar teks persis seperti di PDF. */
function formatRupiah(value?: number | null): string {
    return formatCurrency(Number(value ?? 0))
}

function rowHeight(lines: number, density: ItemDensity): number {
    return lines * LINE_HEIGHT_FACTOR * density.fontSize + 2 * density.padding + 1
}

function aboveTableHeight(templateId: string | null | undefined, hasNoPo: boolean, customerAddress?: string | null): number {
    const base = ABOVE_TABLE[templateId ?? ''] ?? ABOVE_TABLE.invoice_01
    const noPo = hasNoPo ? ABOVE_NO_PO : 0
    // Baris alamat customer yang membungkus menambah tinggi kotak "Kepada Yth.".
    const addressLines = countWrappedLines(String(customerAddress ?? '-'), 10, (CONTENT_WIDTH - 2 * 10) * KERNING_TOLERANCE)
    const addressExtra = Math.max(0, addressLines - 1) * LINE_HEIGHT_FACTOR * 10
    return base + noPo + addressExtra
}

function tailHeight(input: InvoiceLayoutInput): number {
    return (
        TAIL_BASE +
        (input.hasPembayaran ? TAIL_PEMBAYARAN : 0) +
        (input.hasBankInfo ? TAIL_BANK : 0) +
        (input.hasPpn ? TAIL_PPN : 0)
    )
}

/**
 * Pilih kepadatan baris item paling lega yang masih membuat seluruh isi (header,
 * item, total, terbilang, rekening) muat dalam satu halaman A4.
 */
export function pickItemDensity(input: InvoiceLayoutInput): InvoiceLayoutResult {
    const items = input.items ?? []
    const tail = tailHeight(input)
    const above = aboveTableHeight(input.templateId, input.hasNoPo, input.customerAddress)

    let chosen: ItemDensity = ITEM_DENSITY_LEVELS[ITEM_DENSITY_LEVELS.length - 1]
    let chosenLines: number[] = []
    let chosenBottom = 0
    let fits = false

    for (const level of ITEM_DENSITY_LEVELS) {
        const lines = items.map(item => itemTextLines(item, level.fontSize, level.padding))
        const rows = lines.reduce((total, lineCount) => total + rowHeight(lineCount, level), 0)
        const bottom = PAGE_PADDING + above + TABLE_HEADER_HEIGHT + rows + tail
        // Selama belum ada yang muat, kepadatan makin rapat; berhenti pada yang pertama muat.
        chosen = level
        chosenLines = lines
        chosenBottom = bottom
        if (bottom <= SAFE_CONTENT_BOTTOM) {
            fits = true
            break
        }
    }

    return { ...chosen, estimatedContentBottom: chosenBottom, linesPerItem: chosenLines, fitsOnePage: fits }
}
