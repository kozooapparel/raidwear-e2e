import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceList } from '@/lib/actions/invoices'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RekapInvoiceTable from '@/components/invoices/RekapInvoiceTable'
import { PageHeader } from '@/components/ui/ds'

export default async function RekapInvoicePage() {
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

    // Fetch all invoices
    const invoices = await getInvoiceList()

    return (
        <DashboardLayout user={profile}>
            <div className="space-y-6">
                <PageHeader
                    title="Rekap Invoice Total"
                    description="Ringkasan seluruh invoice"
                    actions={
                        <>
                            <Link href="/invoices/items" className="btn-secondary">
                                Rekap Item
                            </Link>
                            <Link href="/invoices" className="btn-primary">
                                Kembali
                            </Link>
                        </>
                    }
                />

                <RekapInvoiceTable invoices={invoices} />
            </div>
        </DashboardLayout>
    )
}
