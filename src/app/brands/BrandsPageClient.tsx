'use client'

import { useState } from 'react'
import { Brand, Profile } from '@/types/database'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { BrandList, BrandFormModal } from '@/components/brands'
import { PageHeader, StatCard } from '@/components/ui/ds'

interface BrandsPageClientProps {
    brands: Brand[]
    user: Profile
}

export default function BrandsPageClient({ brands: initialBrands, user }: BrandsPageClientProps) {
    const [brands, setBrands] = useState<Brand[]>(initialBrands)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const upsertBrand = (brand: Brand) => {
        setBrands((current) => {
            const idx = current.findIndex((b) => b.id === brand.id)
            if (idx === -1) return [...current, brand]
            const updated = [...current]
            updated[idx] = brand
            return updated
        })
    }

    const handleSetDefault = (id: string) => {
        setBrands((current) =>
            current.map((b) => ({ ...b, is_default: b.id === id }))
        )
    }

    const handleDelete = (id: string) => {
        setBrands((current) => current.filter((b) => b.id !== id))
    }

    const handleBrandCreated = (brand: Brand) => {
        upsertBrand(brand)
        setIsModalOpen(false)
    }

    const handleBrandUpdated = (brand: Brand) => {
        upsertBrand(brand)
    }

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <PageHeader
                    title="Brand Management"
                    description="Kelola brand untuk invoice, kuitansi, dan SPK"
                    actions={
                        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Brand
                        </button>
                    }
                />

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Brand"
                        value={brands.length}
                        tone="info"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Brand Default"
                        value={brands.find(b => b.is_default)?.name || '-'}
                        tone="success"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Total Dokumen"
                        value={brands.reduce((sum, b) => sum + b.invoice_counter + b.kuitansi_counter + b.spk_counter, 0)}
                        tone="brand"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                    />
                </div>

                {/* Brand List */}
                <BrandList
                    brands={brands}
                    onBrandUpdated={handleBrandUpdated}
                    onSetDefault={handleSetDefault}
                    onDelete={handleDelete}
                />

                {/* Modal */}
                <BrandFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onBrandCreated={handleBrandCreated}
                />
            </div>
        </DashboardLayout>
    )
}
