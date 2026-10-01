import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUnpaidInvoices } from '@/lib/actions/invoices'
import { getKuitansiList } from '@/lib/actions/kuitansi'
import { KuitansiForm, KuitansiList } from '@/components/kuitansi'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/ui/ds'

export default async function KuitansiPage({
    searchParams
}: {
    searchParams: Promise<{ invoiceId?: string; mode?: string }>
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

    // Get search params
    const params = await searchParams
    const prefilledInvoiceId = params.invoiceId
    const mode = params.mode || 'list'

    // Fetch data
    const [unpaidInvoices, kuitansiList] = await Promise.all([
        getUnpaidInvoices(),
        getKuitansiList()
    ])

    // Fetch active brands for filter dropdown
    const { data: brands } = await supabase
        .from('brands')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

    return (
        <DashboardLayout user={profile}>
            <div className="space-y-6">
                <PageHeader
                    title="Kuitansi"
                    description="Kelola bukti pembayaran"
                    actions={
                        <>
                            <Link href="/kuitansi/rekap" className="btn-secondary">
                                Rekap Kuitansi
                            </Link>
                            <Link
                                href={mode === 'new' ? '/kuitansi' : '/kuitansi?mode=new'}
                                className="btn-primary"
                            >
                                {mode === 'new' ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        Lihat List
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Buat Kuitansi
                                    </>
                                )}
                            </Link>
                        </>
                    }
                />

                {/* Content */}
                {mode === 'new' ? (
                    <KuitansiForm
                        unpaidInvoices={unpaidInvoices}
                        prefilledInvoiceId={prefilledInvoiceId}
                    />
                ) : (
                    <KuitansiList kuitansiList={kuitansiList} brands={brands || []} />
                )}
            </div>
        </DashboardLayout>
    )
}
