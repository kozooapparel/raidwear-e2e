'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SIZE_MB = 50
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * Validate an image file. Returns an error message, or null when valid.
 */
export function validateImageFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
        return 'Format tidak didukung. Gunakan PNG, JPG, WEBP, GIF, atau SVG.'
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `Ukuran file maksimal ${MAX_SIZE_MB}MB.`
    }
    return null
}

interface ImageDropzoneProps {
    /** Called with a valid image file from click, drop, or paste. */
    onFileSelect: (file: File) => void
    /** Called when a file is rejected by validation. */
    onError?: (message: string) => void
    /** Disables all interaction (e.g. while uploading). */
    disabled?: boolean
    /** Listen for Ctrl+V on the whole document. Set false for a secondary dropzone. */
    enablePaste?: boolean
    /** Text shown inside the dropzone. */
    label?: string
}

export default function ImageDropzone({
    onFileSelect,
    onError,
    disabled = false,
    enablePaste = true,
    label = 'Klik untuk pilih gambar',
}: ImageDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [pasteFlash, setPasteFlash] = useState(false)

    const handleFile = useCallback(
        (file: File) => {
            const error = validateImageFile(file)
            if (error) {
                onError?.(error)
                return
            }
            onFileSelect(file)
        },
        [onFileSelect, onError]
    )

    // Ctrl+V / Cmd+V paste support
    useEffect(() => {
        if (!enablePaste || disabled) return

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return

            for (const item of items) {
                if (item.kind !== 'file' || !item.type.startsWith('image/')) continue

                const file = item.getAsFile()
                if (!file) continue

                e.preventDefault()
                setPasteFlash(true)
                window.setTimeout(() => setPasteFlash(false), 600)

                // Screenshots arrive as "image.png"; add a timestamp for uniqueness
                const ext = file.type.split('/')[1] || 'png'
                handleFile(
                    new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type })
                )
                return
            }
        }

        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    }, [enablePaste, disabled, handleFile])

    const openPicker = () => {
        if (!disabled) inputRef.current?.click()
    }

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={label}
            aria-disabled={disabled}
            onClick={openPicker}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openPicker()
                }
            }}
            onDragOver={(e) => {
                e.preventDefault()
                if (!disabled) setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (disabled) return
                const file = e.dataTransfer.files?.[0]
                if (file) handleFile(file)
            }}
            className={`w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                : isDragging
                    ? 'cursor-pointer border-brand-500 bg-brand-50'
                    : pasteFlash
                        ? 'cursor-pointer border-emerald-500 bg-emerald-50'
                        : 'cursor-pointer border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/50'
                }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    // Reset so selecting the same file again re-triggers onChange
                    e.target.value = ''
                }}
            />

            <svg
                className={`mx-auto mb-2 h-8 w-8 ${isDragging ? 'text-brand-500' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>

            <p className="text-sm font-medium text-slate-700">
                {isDragging ? 'Lepaskan gambar di sini' : label}
            </p>
            <p className="mt-1 text-xs text-slate-500">
                {enablePaste ? 'Tempel dengan Ctrl+V, tarik & lepas, atau klik' : 'Tarik & lepas, atau klik'}
                {' · '}PNG, JPG, WEBP, GIF, SVG · maks {MAX_SIZE_MB}MB
            </p>
        </div>
    )
}
