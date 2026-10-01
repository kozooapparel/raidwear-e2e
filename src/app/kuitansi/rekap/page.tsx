import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getKuitansiList } from '@/lib/actions/kuitansi'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RekapKuitansiTable from '@/components/kuitansi/RekapKuitansiTable'
import { PageHeader } from '@/components/ui/ds'

export default async function RekapKuitansiPage() {
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

    // Fetch all kuitansi
    const kuitansiList = await getKuitansiList()

    return (
        <DashboardLayout user={profile}>
            <div className="space-y-6">
                <PageHeader
                    title="Rekap Kuitansi"
                    description="Ringkasan seluruh pembayaran"
                    actions={
                        <Link href="/kuitansi" className="btn-primary">
                            Kembali
                        </Link>
                    }
                />

                <RekapKuitansiTable kuitansiList={kuitansiList} />
            </div>
        </DashboardLayout>
    )
}
