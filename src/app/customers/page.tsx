import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CustomerList from '@/components/customers/CustomerList'

interface CustomerWithStats {
    id: string
    name: string
    phone: string | null
    country_code: string | null
    status: 'pending' | 'active'
    phone_normalized: string | null
    portal_token: string | null
    created_at: string
    order_count: number
    total_quantity: number
    total_revenue: number
}

export default async function CustomersPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch all customers with their order stats
    const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

    // Fetch order stats for each customer
    const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, total_quantity, dp_desain_amount, dp_produksi_amount, pelunasan_amount')

    // Calculate stats per customer
    const customersWithStats: CustomerWithStats[] = (customers || []).map(customer => {
        const customerOrders = orders?.filter(o => o.customer_id === customer.id) || []
        return {
            ...customer,
            order_count: customerOrders.length,
            total_quantity: customerOrders.reduce((sum, o) => sum + o.total_quantity, 0),
            total_revenue: customerOrders.reduce((sum, o) =>
                sum + o.dp_desain_amount + o.dp_produksi_amount + o.pelunasan_amount, 0)
        }
    }).sort((a, b) => b.total_revenue - a.total_revenue) // Sort by revenue

    return (
        <DashboardLayout user={profile}>
            <CustomerList customers={customersWithStats} />
        </DashboardLayout>
    )
}
