'use client'

import { useEffect, useMemo, useState } from 'react'
import { Brand, Customer, OrderInsert, OrderWithCustomer } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import CustomerPicker from './CustomerPicker'
import QuickCreateCustomerModal from './QuickCreateCustomerModal'

interface AddOrderModalProps {
    isOpen: boolean
    onClose: () => void
    customers: Customer[]
    onOrderCreated: (order: OrderWithCustomer) => void
}

export default function AddOrderModal({ isOpen, onClose, customers, onOrderCreated }: AddOrderModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [brands, setBrands] = useState<Brand[]>([])

    // Form state
    const [brandId, setBrandId] = useState('')
    const [customerId, setCustomerId] = useState('')

    // Customer baru yang dibuat dari dalam modal ini (belum ikut ter-refresh dari server)
    const [createdCustomers, setCreatedCustomers] = useState<Customer[]>([])
    const [quickCreateOpen, setQuickCreateOpen] = useState(false)
    const [quickCreateName, setQuickCreateName] = useState('')

    const supabase = useMemo(() => createClient(), [])

    // Daftar customer = data dari server + customer yang baru saja dibuat di sesi ini
    const allCustomers = useMemo(() => {
        if (createdCustomers.length === 0) return customers
        const createdIds = new Set(createdCustomers.map(c => c.id))
        return [...createdCustomers, ...customers.filter(c => !createdIds.has(c.id))]
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [customers, createdCustomers])

    // Fetch brands on mount
    useEffect(() => {
        const fetchBrands = async () => {
            const { data } = await supabase
                .from('brands')
                .select('*')
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('name')

            if (data) {
                setBrands(data)
                // Auto-select default brand
                const defaultBrand = data.find(b => b.is_default)
                if (defaultBrand) {
                    setBrandId(defaultBrand.id)
                }
            }
        }

        if (isOpen) {
            fetchBrands()
        }
    }, [isOpen, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerId) {
            setError('Pilih customer terlebih dahulu')
            return
        }
        setLoading(true)
        setError(null)

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()

            // Create order with brand (quantity will be updated when size_breakdown is set)
            const orderData: OrderInsert = {
                customer_id: customerId,
                total_quantity: 0,  // Will be calculated from size_breakdown later
                dp_desain_amount: 0,
                dp_desain_verified: false,
                stage: 'customer_dp_desain',
                created_by: user?.id || null,
                brand_id: brandId || null,
            }

            const { data: insertedOrder, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single()

            if (orderError) throw orderError

            const { data: freshOrder, error: fetchOrderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    invoices(id),
                    customer:customers(*),
                    creator:profiles!created_by(id, full_name),
                    brand:brands(*)
                `)
                .eq('id', insertedOrder.id)
                .single()

            if (fetchOrderError) throw fetchOrderError

            // Reset form and close
            onOrderCreated(freshOrder as OrderWithCustomer)
            resetForm()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setCustomerId('')
        setError(null)
        setQuickCreateName('')
        // Keep brand selection for convenience
    }

    const openQuickCreateCustomer = (typedQuery: string) => {
        setQuickCreateName(typedQuery.trim())
        setQuickCreateOpen(true)
    }

    // Customer baru langsung dipakai pada order yang sedang dibuat
    const handleCustomerSaved = (customer: Customer) => {
        setCreatedCustomers(prev => prev.some(c => c.id === customer.id) ? prev : [...prev, customer])
        setCustomerId(customer.id)
        setQuickCreateName('')
    }

    if (!isOpen) return null

    const selectedBrand = brands.find(b => b.id === brandId)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl m-4"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose()
                }}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Tambah Order Baru</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Pilih brand dan customer, order masuk ke tahap DP Desain.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="p-1.5 -mr-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Brand Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Brand <span className="text-brand-600">*</span>
                        </label>
                        <div className="flex gap-2">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    type="button"
                                    onClick={() => setBrandId(brand.id)}
                                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${brandId === brand.id
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {brand.logo_url ? (
                                        <img
                                            src={brand.logo_url}
                                            alt={brand.name}
                                            className="w-6 h-6 object-contain"
                                        />
                                    ) : (
                                        <span className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                            {brand.code}
                                        </span>
                                    )}
                                    <span className={`text-sm font-medium ${brandId === brand.id ? 'text-brand-700' : 'text-slate-700'}`}>
                                        {brand.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {selectedBrand && (
                            <p className="text-xs text-slate-400 mt-2">
                                Invoice prefix: <span className="font-medium text-slate-500">{selectedBrand.invoice_prefix}</span>
                            </p>
                        )}
                    </div>

                    {/* Customer Selection */}
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <label className="block text-sm font-semibold text-slate-700">
                                Customer <span className="text-brand-600">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => openQuickCreateCustomer('')}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Customer Baru
                            </button>
                        </div>
                        <CustomerPicker
                            value={customerId}
                            customers={allCustomers}
                            onSelect={(customer) => setCustomerId(customer.id)}
                            onClear={() => setCustomerId('')}
                            onCreateNew={openQuickCreateCustomer}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !brandId || !customerId}
                        className="w-full py-3 px-4 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <span className="inline-flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Menyimpan...
                            </span>
                        ) : (
                            'Simpan Order'
                        )}
                    </button>
                </form>
            </div>

            {/* Form customer baru — di luar <form> order supaya tidak bersarang */}
            <QuickCreateCustomerModal
                isOpen={quickCreateOpen}
                onClose={() => setQuickCreateOpen(false)}
                initialName={quickCreateName}
                onSaved={handleCustomerSaved}
            />
        </div>
    )
}
