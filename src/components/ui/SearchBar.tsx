'use client'

import { useState } from 'react'

interface SearchBarProps {
    onSearch: (query: string) => void
    placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = 'Cari customer atau order...' }: SearchBarProps) {
    const [query, setQuery] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setQuery(value)
        onSearch(value)
    }

    const handleClear = () => {
        setQuery('')
        onSearch('')
    }

    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500 transition-all shadow-sm"
            />
            {query && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Bersihkan pencarian"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}
