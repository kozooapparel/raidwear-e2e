/**
 * Utilitas clipboard bersama.
 *
 * Dipakai oleh beberapa tempat (link portal/layout pada OrderDetailModal,
 * pesan tagihan DP 50% pada InvoiceForm) agar fallback untuk konteks tidak aman
 * tidak ditulis berulang.
 */

/**
 * Menyalin teks ke clipboard.
 *
 * Clipboard API hanya tersedia pada secure context (https atau localhost).
 * Bila dashboard dibuka lewat http di jaringan lokal, API tersebut tidak ada
 * sehingga dipakai fallback textarea + execCommand.
 *
 * @param text - Teks yang akan disalin.
 * @returns true bila teks benar-benar tersalin, false bila semua cara gagal.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // Clipboard API bisa ditolak; lanjut ke fallback di bawah.
        }
    }

    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.top = '-9999px'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        textarea.setSelectionRange(0, text.length)
        const succeeded = document.execCommand('copy')
        document.body.removeChild(textarea)
        return succeeded
    } catch {
        return false
    }
}
