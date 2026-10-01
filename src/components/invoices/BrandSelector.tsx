'use client'

import { useState, useEffect } from 'react'
import { Brand } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface BrandSelectorProps {
    selectedBrandId: string | null
    onSelect: (brandId: string) => void
    required?: boolean
}

export default function BrandSelector({ selectedBrandId, onSelect, required = false }: BrandSelectorProps) {
    const [brands, setBrands] = useState<Brand[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchBrands() {
            try {
                const { data, error } = await supabase
                    .from('brands')
                    .select('*')
                    .eq('is_active', true)
                    .order('is_default', { ascending: false })

                if (error) throw error
                setBrands(data || [])
            } catch (err) {
                console.error('Error fetching brands:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchBrands()
    }, [supabase])

    if (loading) {
        return (
            <div className="p-6 bg-slate-50 rounded-xl border-2 border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-20 bg-slate-200 rounded"></div>
                    <div className="h-20 bg-slate-200 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className={`p-6 rounded-xl border-2 ${selectedBrandId ? 'bg-white border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
            <div className="flex items-center gap-3 mb-4">
                <svg className={`w-6 h-6 ${selectedBrandId ? 'text-emerald-500' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="flex-1">
                    <h3 className={`text-lg font-bold ${selectedBrandId ? 'text-slate-900' : 'text-amber-900'}`}>
                        Pilih Brand
                    </h3>
                    {required && !selectedBrandId && (
                        <p className="text-sm text-amber-600 font-medium">⚠️ Wajib dipilih - Menentukan rekening bank dan info perusahaan</p>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {brands.map((brand) => {
                    const isSelected = selectedBrandId === brand.id
                    return (
                        <button
                            key={brand.id}
                            type="button"
                            onClick={() => onSelect(brand.id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                    ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-[1.02]'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Radio Button */}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                    }`}>
                                    {isSelected && (
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                </div>

                                {/* Logo */}
                                {brand.logo_url && (
                                    <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                        <Image
                                            src={brand.logo_url}
                                            alt={brand.name}
                                            fill
                                            className="object-contain p-1"
                                        />
                                    </div>
                                )}

                                {/* Brand Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                                            {brand.name}
                                        </h4>
                                        {brand.is_default && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-700">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{brand.company_name}</p>

                                    {/* Bank Info */}
                                    {brand.bank_name && brand.account_number && (
                                        <div className={`text-xs p-2 rounded-lg ${isSelected ? 'bg-emerald-100/50' : 'bg-slate-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <svg className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                                <span className={`font-medium ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                    {brand.bank_name}
                                                </span>
                                            </div>
                                            <p className={`mt-1 font-mono ${isSelected ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {brand.account_number} - {brand.account_name}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Selected Checkmark */}
                                {isSelected && (
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>

            {brands.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500">
                    <p>Tidak ada brand aktif</p>
                </div>
            )}
        </div>
    )
}
