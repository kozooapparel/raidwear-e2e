'use client'

import Image from 'next/image'
import { MessageCircle, Mail } from 'lucide-react'
import type { PortalBrand } from '@/lib/portal/types'

interface PortalHeaderProps {
    brand: PortalBrand
}

/**
 * Header portal customer.
 * Menampilkan identitas brand + kanal bantuan (WhatsApp & email).
 */
export function PortalHeader({ brand }: PortalHeaderProps) {
    const waLink = brand.phone
        ? `https://wa.me/${brand.phone}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang order saya.')}`
        : null

    return (
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-sm font-bold text-white">
                        {brand.logoUrl ? (
                            <Image
                                src={brand.logoUrl}
                                alt={`${brand.name} logo`}
                                width={36}
                                height={36}
                                className="h-full w-full bg-white object-contain p-0.5"
                            />
                        ) : (
                            brand.name.slice(0, 2).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{brand.name}</p>
                        <p className="truncate text-xs text-slate-500">{brand.companyName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {waLink && (
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary btn-sm"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                    )}
                    {brand.email && (
                        <a href={`mailto:${brand.email}`} className="btn-ghost btn-sm" aria-label="Kirim email">
                            <Mail className="h-4 w-4" />
                        </a>
                    )}
                </div>
            </div>
        </header>
    )
}
