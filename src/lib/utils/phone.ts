/**
 * Utilitas nomor telepon & link WhatsApp.
 *
 * Tujuan: memastikan seluruh nomor yang dikirim ke WhatsApp memakai format
 * internasional (tanpa awalan 0), sehingga link `wa.me` selalu valid. Nomor
 * admin bernegara 62, sedangkan nomor customer bisa memakai kode negara lain.
 */

const DEFAULT_COUNTRY_CODE = '62'

/**
 * Salin logika normalisasi SQL `normalize_phone` di sisi klien.
 *
 * - Hapus semua karakter non-angka.
 * - Buang awalan `0` lokal lalu tambahkan kode negara.
 * - Khusus Indonesia (62): awalan `8` tanpa `0` dianggap nomor lokal.
 * - Nomor yang sudah berawalan kode negara dibiarkan (bila ada `0` tepat
 *   setelahnya, dibuang).
 *
 * Mengembalikan `null` bila hasilnya tidak valid (terlalu pendek/panjang).
 */
export function normalizePhone(
    phone: string | null | undefined,
    countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
    if (!phone) return null

    let digits = phone.replace(/\D/g, '')
    if (!digits) return null

    const cc = (countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE

    if (digits.startsWith(cc)) {
        if (digits[cc.length] === '0') {
            digits = cc + digits.slice(cc.length + 1)
        }
    } else if (digits.startsWith('0')) {
        digits = cc + digits.slice(1)
    } else if (cc === '62' && digits.startsWith('8') && digits.length >= 8 && digits.length <= 12) {
        digits = '62' + digits
    } else {
        digits = cc + digits
    }

    if (digits.length < cc.length + 5 || digits.length > 15) return null
    return digits
}

/**
 * Buat link WhatsApp `https://wa.me/<nomor>` yang valid.
 *
 * Menerima nomor ternormalisasi (mis. `phone_normalized`) ataupun nomor mentah
 * (mis. `phone` `0812...`); apapun bentuknya dinormalisasi dulu agar tidak
 * berawalan `0`.
 */
export function formatWaLink(
    phone: string | null | undefined,
    message?: string,
): string | null {
    const normalized = normalizePhone(phone)
    if (!normalized) return null

    const query = message ? `?text=${encodeURIComponent(message)}` : ''
    return `https://wa.me/${normalized}${query}`
}

/**
 * Tampilkan nomor dalam bentuk internasional dengan awalan `+`.
 * Bila nomor tidak valid, kembalikan nilai mentahnya apa adanya.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
    const normalized = normalizePhone(phone)
    if (!normalized) return phone ?? ''
    return `+${normalized}`
}

/**
 * Format langsung di input saat pengguna mengetik (live formatting).
 *
 * Hanya menampilkan nomor nasional (TANPA awalan `+` / kode negara).
 * Kode negara dipilih terpisah lewat dropdown.
 *
 * - Buang semua karakter non-angka (strip `-`, spasi, kurung, dll).
 * - Buang kode negara bila ikut diketik (mis. `62`, `60`, `+1`).
 * - Buang `0` di depan (awalan trunk lokal, contoh Indonesia).
 *   Contoh: ketik `0812-3456-7890` → `81234567890`.
 *
 * Dipakai agar nomor langsung rapi & bersih di layar, bukan hanya saat disimpan.
 */
export function formatPhoneInput(
    raw: string,
    countryCode: string = DEFAULT_COUNTRY_CODE,
): string {
    if (!raw) return ''
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''

    const cc = (countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE

    // Buang awalan kode negara bila ikut diketik.
    let cleaned = digits.startsWith(cc) ? digits.slice(cc.length) : digits
    // Buang `0` di depan (trunk prefix lokal, mis. Indonesia & Malaysia).
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1)

    return cleaned
}
