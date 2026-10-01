'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Customer, Barang, InvoiceWithItems, InvoiceItemInsert } from '@/types/database'
import { createInvoice, updateInvoice } from '@/lib/actions/invoices'
import { getBarangList, getHargaByQty } from '@/lib/actions/barang'
import { getBankInfo, getCompanyInfo, BankInfo, CompanyInfo } from '@/lib/actions/settings'
import { formatCurrency, formatDateInput } from '@/lib/utils/format'
import { terbilang } from '@/lib/utils/terbilang'
import { toast } from 'sonner'
import BrandSelector from './BrandSelector'
import ItemPicker from './ItemPicker'
import QuickCreateBarangModal from './QuickCreateBarangModal'
import CustomerPicker from '@/components/orders/CustomerPicker'
import QuickCreateCustomerModal from '@/components/orders/QuickCreateCustomerModal'
import { CurrencyInput, NumberInput } from '@/components/ui'

interface InvoiceFormProps {
    customers: Customer[]
    invoice?: InvoiceWithItems | null
    orderId?: string
    prefilledCustomerId?: string
    prefilledBrandId?: string
}

interface InvoiceItemRow {
    id: string
    barang_id: string | null
    deskripsi: string
    jumlah: number
    satuan: string
    harga_satuan: number
    sub_total: number
}

export default function InvoiceForm({
    customers,
    invoice,
    orderId,
    prefilledCustomerId,
    prefilledBrandId
}: InvoiceFormProps) {
    const router = useRouter()
    const isEdit = !!invoice

    // Form state
    const [loading, setLoading] = useState(false)
    const [customerId, setCustomerId] = useState(invoice?.customer_id || prefilledCustomerId || '')
    const [tanggal, setTanggal] = useState(formatDateInput(invoice?.tanggal || new Date()))
    const [perkiraanProduksi, setPerkiraanProduksi] = useState(invoice?.perkiraan_produksi?.toString() || '')
    const [deadline, setDeadline] = useState(formatDateInput(invoice?.deadline || null))
    const [terminPembayaran, setTerminPembayaran] = useState(invoice?.termin_pembayaran?.toString() || '16')
    const [noPo, setNoPo] = useState(invoice?.no_po || '')
    const [ppnPersen, setPpnPersen] = useState(invoice?.ppn_persen?.toString() || '0')
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(prefilledBrandId || null)

    // Items state
    const [items, setItems] = useState<InvoiceItemRow[]>(() => {
        if (invoice?.items && invoice.items.length > 0) {
            return invoice.items.map((item, index) => ({
                id: `item-${index}`,
                barang_id: item.barang_id,
                deskripsi: item.deskripsi,
                jumlah: item.jumlah,
                satuan: item.satuan,
                harga_satuan: item.harga_satuan,
                sub_total: item.sub_total
            }))
        }
        return [{
            id: `item-0`,
            barang_id: null,
            deskripsi: '',
            jumlah: 0,
            satuan: 'PCS',
            harga_satuan: 0,
            sub_total: 0
        }]
    })

    // Lookup data
    const [barangList, setBarangList] = useState<Barang[]>([])
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
    const [brandInfo, setBrandInfo] = useState<{ name: string; address: string | null; logo_url: string | null } | null>(null)

    // Quick create barang (tanpa keluar dari halaman invoice)
    const [quickCreateIndex, setQuickCreateIndex] = useState<number | null>(null)
    const [quickCreateName, setQuickCreateName] = useState('')

    // Customer baru yang dibuat dari dalam form invoice (belum ter-refresh dari server)
    const [createdCustomers, setCreatedCustomers] = useState<Customer[]>([])
    const [quickCreateCustomerOpen, setQuickCreateCustomerOpen] = useState(false)
    const [quickCreateCustomerName, setQuickCreateCustomerName] = useState('')

    // Brand aktif menentukan daftar barang yang bisa dipilih
    const activeBrandId = selectedBrandId || prefilledBrandId

    // Daftar customer = data dari server + customer yang baru saja dibuat di sesi ini
    const allCustomers = useMemo(() => {
        if (createdCustomers.length === 0) return customers
        const createdIds = new Set(createdCustomers.map(c => c.id))
        return [...createdCustomers, ...customers.filter(c => !createdIds.has(c.id))]
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [customers, createdCustomers])

    // Load lookup data
    useEffect(() => {
        async function loadData() {
            const [barang, bank, company] = await Promise.all([
                activeBrandId ? getBarangList(activeBrandId) : Promise.resolve([]),
                getBankInfo(),
                getCompanyInfo()
            ])
            setBarangList(barang)
            setBankInfo(bank)
            setCompanyInfo(company)

            // Fetch brand info if brand is selected or prefilled
            if (activeBrandId) {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                const { data: brand } = await supabase
                    .from('brands')
                    .select('company_name, address, logo_url, bank_name, account_name, account_number')
                    .eq('id', activeBrandId)
                    .single()
                if (brand) {
                    setBrandInfo({
                        name: brand.company_name,
                        address: brand.address,
                        logo_url: brand.logo_url
                    })
                    // Update bank info with brand-specific data
                    if (brand.bank_name && brand.account_name && brand.account_number) {
                        setBankInfo({
                            bank_name: brand.bank_name,
                            account_name: brand.account_name,
                            account_number: brand.account_number
                        })
                    }
                }
            }
        }
        loadData()
    }, [prefilledBrandId, selectedBrandId, activeBrandId])

    // Calculate totals
    const subTotal = items.reduce((sum, item) => sum + item.sub_total, 0)
    const ppnAmount = (subTotal * parseFloat(ppnPersen || '0')) / 100
    const total = subTotal + ppnAmount

    // Customer baru dibuat: daftarkan ke picker lalu pilih otomatis
    const handleCustomerSaved = (customer: Customer) => {
        setCreatedCustomers(prev => (prev.some(c => c.id === customer.id) ? prev : [...prev, customer]))
        setCustomerId(customer.id)
    }

    // Ganti brand: reset item agar harga brand lama tidak terbawa
    const handleBrandSelect = (brandId: string) => {
        if (brandId === selectedBrandId) return
        setSelectedBrandId(brandId)
        setItems([{
            id: `item-${Date.now()}`,
            barang_id: null,
            deskripsi: '',
            jumlah: 0,
            satuan: 'PCS',
            harga_satuan: 0,
            sub_total: 0
        }])
    }

    // Add row
    const addRow = () => {
        setItems([...items, {
            id: `item-${Date.now()}`,
            barang_id: null,
            deskripsi: '',
            jumlah: 0,
            satuan: 'PCS',
            harga_satuan: 0,
            sub_total: 0
        }])
    }

    // Remove row
    const removeRow = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index))
        }
    }

    // Update item
    const updateItem = async (index: number, field: keyof InvoiceItemRow, value: string | number | null) => {
        const newItems = [...items]
        const item = { ...newItems[index] }

        if (field === 'barang_id' && value) {
            const barang = barangList.find(b => b.id === value)
            if (barang) {
                item.barang_id = value as string
                item.deskripsi = barang.nama_barang
                item.satuan = barang.satuan
                // Get harga based on quantity (if quantity already entered)
                if (item.jumlah > 0) {
                    item.harga_satuan = await getHargaByQty(value as string, item.jumlah)
                } else {
                    item.harga_satuan = barang.harga_satuan
                }
            }
        } else if (field === 'jumlah') {
            item.jumlah = parseInt(value as string) || 0
            // Update harga based on new quantity if barang selected
            if (item.barang_id) {
                item.harga_satuan = await getHargaByQty(item.barang_id, item.jumlah)
            }
        } else if (field === 'harga_satuan') {
            item.harga_satuan = parseFloat(value as string) || 0
        } else if (field === 'deskripsi') {
            item.deskripsi = value as string
            // Clear barang_id if manually editing description
            if (item.barang_id && value !== barangList.find(b => b.id === item.barang_id)?.nama_barang) {
                item.barang_id = null
            }
        } else if (field === 'satuan') {
            item.satuan = value as string
        }

        // Recalculate sub_total
        item.sub_total = item.jumlah * item.harga_satuan

        newItems[index] = item
        setItems(newItems)
    }

    // Buka form barang baru untuk baris tertentu
    const openQuickCreate = (index: number, initialName: string) => {
        setQuickCreateIndex(index)
        setQuickCreateName(initialName.trim())
    }

    // Barang baru dibuat: daftarkan ke picker lalu pakai otomatis di baris saat ini
    const handleBarangCreated = (barang: Barang) => {
        const index = quickCreateIndex

        // Tambahkan ke daftar barang agar bisa dipilih juga di baris lain
        setBarangList(prev => {
            if (prev.some(b => b.id === barang.id)) return prev
            return [...prev, barang].sort((a, b) => a.nama_barang.localeCompare(b.nama_barang))
        })

        // Pakai barang baru di baris invoice yang sedang aktif
        if (index !== null) {
            setItems(prev => {
                const newItems = [...prev]
                const item = newItems[index]
                if (!item) return prev
                newItems[index] = {
                    ...item,
                    barang_id: barang.id,
                    deskripsi: barang.nama_barang,
                    satuan: barang.satuan,
                    harga_satuan: barang.harga_satuan,
                    sub_total: item.jumlah * barang.harga_satuan,
                }
                return newItems
            })
        }

        setQuickCreateIndex(null)
    }

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!customerId) {
            toast.warning('Pilih customer terlebih dahulu')
            return
        }

        // Validate brand selection (critical for bank account info)
        const finalBrandId = selectedBrandId || prefilledBrandId
        if (!finalBrandId && !isEdit) {
            toast.error('🚨 Pilih Brand terlebih dahulu! Ini menentukan rekening bank yang akan digunakan.')
            return
        }

        if (items.every(item => !item.deskripsi)) {
            toast.warning('Tambahkan minimal satu item')
            return
        }

        setLoading(true)

        try {
            const customerName = allCustomers.find(c => c.id === customerId)?.name || 'Customer'

            const invoiceItems: Omit<InvoiceItemInsert, 'invoice_id'>[] = items
                .filter(item => item.deskripsi)
                .map((item, index) => ({
                    item_no: index + 1,
                    barang_id: item.barang_id,
                    deskripsi: item.deskripsi,
                    jumlah: item.jumlah,
                    satuan: item.satuan,
                    harga_satuan: item.harga_satuan,
                    sub_total: item.sub_total
                }))

            if (isEdit && invoice) {
                await updateInvoice(invoice.id, {
                    customer_id: customerId,
                    tanggal,
                    perkiraan_produksi: perkiraanProduksi ? parseInt(perkiraanProduksi) : null,
                    deadline: deadline || null,
                    termin_pembayaran: parseInt(terminPembayaran) || 16,
                    no_po: noPo || null,
                    ppn_persen: parseFloat(ppnPersen) || 0
                }, invoiceItems)
            } else {
                const finalBrandId = selectedBrandId || prefilledBrandId
                await createInvoice({
                    customerName,
                    customer_id: customerId,
                    order_id: orderId || null,
                    brand_id: finalBrandId || null,
                    tanggal,
                    perkiraan_produksi: perkiraanProduksi ? parseInt(perkiraanProduksi) : null,
                    deadline: deadline || null,
                    termin_pembayaran: parseInt(terminPembayaran) || 16,
                    no_po: noPo || null,
                    ppn_persen: parseFloat(ppnPersen) || 0
                }, invoiceItems)
            }

            router.push('/invoices')
        } catch (error) {
            console.error('Error saving invoice:', error)
            toast.error('Gagal menyimpan invoice')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-700 text-white p-4 rounded-xl">
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-white text-brand-700 hover:bg-brand-50 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => router.push('/invoices/new')}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                >
                    Buat Baru
                </button>
            </div>

            {/* Brand Selector - Only show for manual invoice creation (no order context) */}
            {!prefilledBrandId && !isEdit && (
                <BrandSelector
                    selectedBrandId={selectedBrandId}
                    onSelect={handleBrandSelect}
                    required={true}
                />
            )}

            {/* Invoice Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* Invoice Header with Brand */}
                <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 rounded-t-xl">
                    <div className="flex items-start justify-between">
                        {/* Left: Invoice Info */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">INVOICE</h1>
                                <span className="badge badge-brand text-mono">
                                    {invoice?.no_invoice || 'DRAFT'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-20">No Invoice</span>
                                    <span className="font-mono font-medium text-slate-700">
                                        {invoice?.no_invoice || '(Auto-generate)'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-16">Tanggal</span>
                                    <input
                                        type="date"
                                        value={tanggal}
                                        onChange={(e) => setTanggal(e.target.value)}
                                        className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right: Brand/Company Info with Logo */}
                        <div className="text-right flex flex-col items-end">
                            {brandInfo?.logo_url && (
                                <img
                                    src={brandInfo.logo_url}
                                    alt={brandInfo.name}
                                    className="w-16 h-16 object-contain mb-2 rounded-lg"
                                />
                            )}
                            <h2 className="text-xl font-bold text-brand-600">
                                {brandInfo?.name || companyInfo?.name || 'RAIDWEAR'}
                            </h2>
                            <p className="text-xs text-slate-500 max-w-[200px] mt-1 leading-relaxed">
                                {brandInfo?.address || companyInfo?.address}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Production Info Bar */}
                <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-slate-500">Produksi:</span>
                        <NumberInput
                            value={perkiraanProduksi}
                            onChange={(v) => setPerkiraanProduksi(v > 0 ? String(v) : '')}
                            placeholder="16"
                            allowEmpty
                            className="!w-14 !px-2 !py-1 !rounded !text-sm !text-center !bg-white !border-slate-200 focus:!ring-brand-500/40"
                        />
                        <span className="text-sm text-slate-400">hari</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-slate-500">Deadline:</span>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        />
                    </div>
                </div>

                {/* Customer Section */}
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                            <CustomerPicker
                                value={customerId}
                                customers={allCustomers}
                                onSelect={(customer) => setCustomerId(customer.id)}
                                onClear={() => setCustomerId('')}
                                onCreateNew={(typed) => {
                                    setQuickCreateCustomerName(typed)
                                    setQuickCreateCustomerOpen(true)
                                }}
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium text-slate-700">No PO</label>
                                <span className="text-xs text-slate-400">(opsional)</span>
                            </div>
                            <input
                                type="text"
                                value={noPo}
                                onChange={(e) => setNoPo(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                                placeholder="Nomor PO Customer"
                            />
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-caption">Detail Item</h3>
                        <span className="text-xs font-medium text-slate-400">{items.length} baris</span>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                                <th className="w-10 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Deskripsi</th>
                                <th className="w-20 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
                                <th className="w-20 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Satuan</th>
                                <th className="w-32 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Harga</th>
                                <th className="w-32 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                                    <td className="px-2 py-2 text-sm font-medium text-slate-400">{index + 1}</td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="min-w-0 flex-1">
                                                <ItemPicker
                                                    value={item.deskripsi}
                                                    barangId={item.barang_id}
                                                    items={barangList}
                                                    hasBrand={!!activeBrandId}
                                                    onSelectItem={(barang) => updateItem(index, 'barang_id', barang.id)}
                                                    onChangeText={(text) => updateItem(index, 'deskripsi', text)}
                                                    onCreateNew={(typed) => openQuickCreate(index, typed)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openQuickCreate(index, item.deskripsi)}
                                                disabled={!activeBrandId}
                                                title={activeBrandId ? 'Tambah barang baru' : 'Pilih brand dulu'}
                                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-2 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 5v14M5 12h14" />
                                                </svg>
                                                Barang Baru
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <NumberInput
                                            value={item.jumlah || ''}
                                            onChange={(v) => updateItem(index, 'jumlah', v > 0 ? String(v) : '')}
                                            className="!w-full !px-2 !py-2 !rounded-lg !text-sm !text-center !bg-white !border-slate-200 focus:!border-brand-500 focus:!ring-brand-500/15"
                                            placeholder="0"
                                            min={0}
                                            allowEmpty
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={item.satuan}
                                            onChange={(e) => updateItem(index, 'satuan', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <CurrencyInput
                                            value={item.harga_satuan || ''}
                                            onChange={(v) => updateItem(index, 'harga_satuan', v > 0 ? String(v) : '')}
                                            showPrefix={false}
                                            className="!w-full !px-2 !py-2 !rounded-lg !text-sm !text-right !bg-white !border-slate-200 focus:!border-brand-500 focus:!ring-brand-500/15"
                                            placeholder="0"
                                            min={0}
                                        />
                                    </td>
                                    <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-slate-900">
                                        {formatCurrency(item.sub_total)}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(index)}
                                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                            disabled={items.length === 1}
                                            title="Hapus baris ini"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Add/Remove Row Buttons */}
                    <div className="mt-4 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={addRow}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Tambah Baris
                        </button>
                        <button
                            type="button"
                            onClick={() => removeRow(items.length - 1)}
                            disabled={items.length === 1}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                            </svg>
                            Hapus Baris
                        </button>
                    </div>
                </div>

                {/* Totals Section */}
                <div className={`p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200 ${bankInfo ? '' : 'rounded-b-xl'}`}>
                    <div className="flex justify-end">
                        <div className="w-80 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(subTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">PPN</span>
                                        <NumberInput
                                            value={ppnPersen}
                                            onChange={(v) => setPpnPersen(String(v))}
                                            className="!w-12 !px-2 !py-0.5 !rounded !text-xs !text-center !bg-white !border-slate-200 focus:!ring-brand-500/40"
                                            min={0}
                                            max={100}
                                        />
                                        <span className="text-slate-400 text-xs">%</span>
                                    </div>
                                    <span className="font-medium text-slate-700">{formatCurrency(ppnAmount)}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-slate-800">TOTAL</span>
                                        <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
                                    </div>
                                    {total > 0 && (
                                        <p className="text-xs text-slate-400 italic text-right mt-1">
                                            {terbilang(total)}
                                        </p>
                                    )}
                                </div>
                                {/* Payment Info - Only show on edit mode with existing payments */}
                                {isEdit && invoice && invoice.total_dibayar > 0 && (
                                    <div className="pt-3 border-t border-dashed border-slate-300 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-600 font-medium">Dibayar</span>
                                            <span className="font-semibold text-emerald-600">-{formatCurrency(invoice.total_dibayar)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-700">Sisa Tagihan</span>
                                            <span className={`text-lg font-bold ${invoice.sisa_tagihan > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {formatCurrency(invoice.sisa_tagihan)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bank Info */}
                {bankInfo && (
                    <div className="p-6 border-t border-slate-200 bg-white rounded-b-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pembayaran</h4>
                                <div className="space-y-1 text-sm">
                                    <p className="text-slate-600">Bank: <span className="font-semibold text-brand-600">{bankInfo.bank_name}</span></p>
                                    <p className="text-slate-600">A/N: <span className="font-medium text-slate-800">{bankInfo.account_name}</span></p>
                                    <p className="text-slate-600">No. Rek: <span className="font-mono font-medium text-slate-800">{bankInfo.account_number}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                <span className="text-sm text-slate-500">Termin:</span>
                                <NumberInput
                                    value={terminPembayaran}
                                    onChange={(v) => setTerminPembayaran(String(v))}
                                    className="!w-14 !px-2 !py-1 !rounded !text-sm !text-center !bg-white !border-slate-200 focus:!ring-brand-500/40"
                                    min={1}
                                />
                                <span className="text-sm text-slate-400">hari</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Form barang baru tanpa keluar dari invoice */}
            <QuickCreateBarangModal
                isOpen={quickCreateIndex !== null}
                onClose={() => setQuickCreateIndex(null)}
                brandId={activeBrandId || ''}
                initialName={quickCreateName}
                onCreated={handleBarangCreated}
            />

            {/* Form customer baru tanpa keluar dari invoice */}
            <QuickCreateCustomerModal
                isOpen={quickCreateCustomerOpen}
                onClose={() => setQuickCreateCustomerOpen(false)}
                initialName={quickCreateCustomerName}
                onSaved={handleCustomerSaved}
            />
        </form>
    )
}
