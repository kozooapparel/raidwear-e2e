'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface CurrencyInputProps {
    /** Controlled mode: pass `value` + `onChange` */
    value?: number | string
    /** Uncontrolled mode: pass `defaultValue` + optional `name` (for FormData) */
    defaultValue?: number | string
    onChange?: (value: number) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    showPrefix?: boolean
    min?: number
    max?: number
    name?: string
    autoFocus?: boolean
    required?: boolean
}

// Raw digits (no thousand separators) from any value
function toRawString(v: number | string | undefined | null): string {
    if (v === undefined || v === null || v === '') return ''
    const num = typeof v === 'string' ? parseFloat(v) || 0 : v || 0
    return num > 0 ? String(Math.floor(num)) : ''
}

// Format raw digits with id-ID thousand separators (100000 -> "100.000")
function formatDigits(digits: string): string {
    if (!digits) return ''
    const num = parseInt(digits, 10)
    if (isNaN(num)) return ''
    return num.toLocaleString('id-ID')
}

// Find caret index in formatted string after the given number of digits
function findCaretPosition(formatted: string, digitsBefore: number): number {
    let count = 0
    for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) count++
        if (count >= digitsBefore) return i + 1
    }
    return formatted.length
}

/**
 * Currency Input Component with better UX
 * - Live thousand separators (.) while typing (100000 -> "100.000")
 * - No leading zeros
 * - Shows "Rp" prefix optionally
 * - Auto-selects on focus for easy editing
 * - Supports controlled (value/onChange) and uncontrolled (defaultValue/name) modes
 */
export default function CurrencyInput({
    value,
    defaultValue,
    onChange,
    placeholder = '0',
    className = '',
    disabled = false,
    showPrefix = true,
    min,
    max,
    name,
    autoFocus,
    required,
}: CurrencyInputProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const isControlled = value !== undefined

    const [rawValue, setRawValue] = useState<number>(() => {
        const digits = toRawString(isControlled ? value : defaultValue)
        return parseInt(digits) || 0
    })
    const [displayValue, setDisplayValue] = useState<string>(() => {
        const digits = toRawString(isControlled ? value : defaultValue)
        return digits ? formatDigits(digits) : ''
    })
    const [isFocused, setIsFocused] = useState(false)
    const touchedRef = useRef(false)

    const applyConstraints = useCallback((num: number): number => {
        if (min !== undefined && num < min) return min
        if (max !== undefined && num > max) return max
        return num
    }, [min, max])

    // Sync with external value (controlled) or defaultValue (uncontrolled, if untouched)
    useEffect(() => {
        if (isFocused) return
        const source = isControlled ? value : (touchedRef.current ? undefined : defaultValue)
        if (source === undefined) return
        const digits = toRawString(source)
        const num = parseInt(digits) || 0
        setRawValue(num)
        setDisplayValue(digits ? formatDigits(digits) : '')
    }, [value, defaultValue, isControlled, isFocused])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true)
        setTimeout(() => {
            e.target.select()
        }, 0)
    }

    const handleBlur = () => {
        setIsFocused(false)
        const clamped = applyConstraints(rawValue)
        setRawValue(clamped)
        setDisplayValue(clamped > 0 ? formatDigits(String(clamped)) : '')
        onChange?.(clamped)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        touchedRef.current = true
        const input = e.target
        const caretPos = input.selectionStart ?? input.value.length
        // Count digits typed before the caret in the current value
        const digitsBefore = input.value.slice(0, caretPos).replace(/[^\d]/g, '').length

        // Only allow digits, remove leading zeros (keep single "0" for zero)
        const cleaned = input.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')

        // Live thousand separator while typing
        const formatted = formatDigits(cleaned)
        setDisplayValue(formatted)

        const num = applyConstraints(parseInt(cleaned) || 0)
        setRawValue(num)
        onChange?.(num)

        // Restore caret to correct position after reformatting
        requestAnimationFrame(() => {
            const pos = findCaretPosition(formatted, digitsBefore)
            input.setSelectionRange(pos, pos)
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
        if (allowedKeys.includes(e.key)) return

        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return

        if (!/^\d$/.test(e.key)) {
            e.preventDefault()
        }
    }

    return (
        <div className="relative">
            {showPrefix && !isFocused && displayValue && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
                    Rp
                </span>
            )}
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`input w-full ${showPrefix && !isFocused && displayValue ? 'pl-10' : ''} ${className}`}
            />
            {name && (
                <input type="hidden" name={name} value={rawValue === 0 ? '' : rawValue} required={required} />
            )}
        </div>
    )
}
