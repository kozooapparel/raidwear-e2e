import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/ui/ds'

export default async function NewInvoicePage({
    searchParams
}: {
    searchParams: Promise<{ order_id?: string; customerId?: string }>
}) {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch profile for layout
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch customers
    const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

    // Get search params
    const params = await searchParams
    const orderId = params.order_id
    const prefilledCustomerId = params.customerId

    // Fetch order data if orderId provided
    let orderCustomerId: string | undefined
    let orderBrandId: string | undefined

    if (orderId) {
        const { data: order } = await supabase
            .from('orders')
            .select('customer_id, brand_id')
            .eq('id', orderId)
            .single()

        if (order) {
            orderCustomerId = order.customer_id
            orderBrandId = order.brand_id || undefined
        }
    }

    return (
        <DashboardLayout user={profile}>
            <div className="space-y-6">
                <PageHeader
                    title="Buat Invoice Baru"
                    description="Buat invoice untuk customer"
                />

                {/* Form */}
                <InvoiceForm
                    customers={customers || []}
                    orderId={orderId}
                    prefilledCustomerId={orderCustomerId || prefilledCustomerId}
                    prefilledBrandId={orderBrandId}
                />
            </div>
        </DashboardLayout>
    )
}
