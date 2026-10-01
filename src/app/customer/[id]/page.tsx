import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import Image from 'next/image'
import { STAGE_LABELS } from '@/types/database'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch customer
    const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

    if (!customer) {
        redirect('/dashboard')
    }

    // Fetch all orders for this customer
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })

    // Calculate stats
    const totalOrders = orders?.length || 0
    const totalQuantity = orders?.reduce((sum, o) => sum + o.total_quantity, 0) || 0
    const totalRevenue = orders?.reduce((sum, o) =>
        sum + o.dp_desain_amount + o.dp_produksi_amount + o.pelunasan_amount, 0) || 0
    const completedOrders = orders?.filter(o => o.stage === 'pengiriman').length || 0

    // Customer tier based on total orders
    const getCustomerTier = () => {
        if (totalOrders >= 10) return { label: 'VIP', color: 'bg-amber-500', icon: '👑' }
        if (totalOrders >= 5) return { label: 'Loyal', color: 'bg-brand-500', icon: '💎' }
        if (totalOrders >= 2) return { label: 'Repeat', color: 'bg-blue-500', icon: '🔄' }
        return { label: 'New', color: 'bg-emerald-500', icon: '✨' }
    }

    const tier = getCustomerTier()

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    type OrderType = NonNullable<typeof orders>[number]

    const getPaymentStatus = (order: OrderType) => {
        if (order.pelunasan_verified) return { label: 'Lunas', color: 'bg-emerald-500' }
        if (order.dp_produksi_verified) return { label: 'DP 50%', color: 'bg-amber-500' }
        if (order.dp_desain_verified) return { label: 'Deposit Desain', color: 'bg-blue-500' }
        return { label: 'Belum Bayar', color: 'bg-red-500' }
    }

    return (
        <DashboardLayout user={profile}>
            <div className="space-y-6">
                {/* Back Button */}
                <Link
                    href="/customers"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali ke Customers
                </Link>

                {/* Customer Header */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-brand-gradient flex items-center justify-center text-2xl font-bold text-white">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${tier.color}`}>
                                        {tier.icon} {tier.label}
                                    </span>
                                </div>
                                <p className="text-slate-600 mt-1">
                                    <a href={`tel:${customer.phone}`} className="hover:text-red-500 transition-colors">
                                        📱 {customer.phone}
                                    </a>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Customer sejak {formatDate(customer.created_at)}
                                </p>
                            </div>
                        </div>
                        {/* WhatsApp Button */}
                        <a
                            href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Chat WhatsApp
                        </a>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500">Total Order</p>
                        <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500">Total Quantity</p>
                        <p className="text-2xl font-bold text-slate-900">{totalQuantity} pcs</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500">Completed Orders</p>
                        <p className="text-2xl font-bold text-slate-900">{completedOrders}</p>
                    </div>
                </div>

                {/* Order History */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Riwayat Order</h2>

                    {orders && orders.length > 0 ? (
                        <div className="space-y-3">
                            {orders.map((order) => {
                                const paymentStatus = getPaymentStatus(order)
                                return (
                                    <div
                                        key={order.id}
                                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-red-300 transition-colors"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Mockup Thumbnail */}
                                            {order.mockup_url ? (
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                                    <Image src={order.mockup_url} alt="Mockup" fill className="object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Order Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                                                        {STAGE_LABELS[order.stage as keyof typeof STAGE_LABELS]}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${paymentStatus.color}`}>
                                                        {paymentStatus.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-700 mt-1 truncate">
                                                    {order.order_description || 'Tidak ada deskripsi'}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                    <span>{order.total_quantity} pcs</span>
                                                    <span>{formatDate(order.created_at)}</span>
                                                    {order.deadline && (
                                                        <span>Deadline: {formatDate(order.deadline)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Revenue */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-semibold text-emerald-600">
                                                    {formatCurrency(order.dp_desain_amount + order.dp_produksi_amount + order.pelunasan_amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-slate-400 py-8">Belum ada order</p>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}

