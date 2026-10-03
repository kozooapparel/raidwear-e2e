'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { PortalOrder } from '@/lib/portal/types'
import { getPortalAction } from '@/lib/portal/stages'
import { PortalHeader } from './PortalHeader'
import { OrderSummary } from './OrderSummary'
import { StageProgress } from './StageProgress'
import { LayoutReview } from './LayoutReview'
import { PaymentInfo } from './PaymentInfo'
import { ShippingSupport } from './ShippingSupport'

interface PortalClientProps {
    order: PortalOrder
}

type RpcResult = { success?: boolean; message?: string }

/**
 * Shell portal customer.
 *
 * Aksi ACC/revisi layout dikirim ke sistem lewat RPC yang divalidasi token,
 * lalu state lokal diperbarui agar tampilan langsung menyesuaikan.
 */
export function PortalClient({ order }: PortalClientProps) {
    const supabase = useMemo(() => createClient(), [])
    const [layoutApproved, setLayoutApproved] = useState(order.layoutApproved)
    const [approvedAt, setApprovedAt] = useState(order.layoutApprovedAt)
    const [revisionNote, setRevisionNote] = useState(order.layoutRevisionNote)
    const [revisionSubmittedAt, setRevisionSubmittedAt] = useState(order.layoutRevisionRequestedAt)
    const [submitting, setSubmitting] = useState(false)

    const action = getPortalAction(order, layoutApproved)

    async function handleApprove() {
        setSubmitting(true)
        const { data, error } = await supabase.rpc('approve_portal_layout', {
            p_token: order.token,
        })
        setSubmitting(false)

        const result = data as unknown as RpcResult | null
        if (error || !result?.success) {
            toast.error(result?.message || 'Gagal menyetujui layout. Silakan coba lagi.')
            return
        }

        setLayoutApproved(true)
        setApprovedAt(new Date().toISOString())
        setRevisionNote(null)
        setRevisionSubmittedAt(null)
        toast.success('Layout disetujui. Terima kasih!')
    }

    async function handleRequestRevision(note: string) {
        setSubmitting(true)
        const { data, error } = await supabase.rpc('request_portal_layout_revision', {
            p_token: order.token,
            p_note: note,
        })
        setSubmitting(false)

        const result = data as unknown as RpcResult | null
        if (error || !result?.success) {
            toast.error(result?.message || 'Gagal mengirim revisi. Silakan coba lagi.')
            return
        }

        setRevisionNote(note)
        setRevisionSubmittedAt(new Date().toISOString())
        setLayoutApproved(false)
        setApprovedAt(null)
        toast.success('Permintaan revisi terkirim ke tim kami.')
    }

    return (
        <div className="min-h-dvh bg-slate-50">
            <PortalHeader brand={order.brand} />

            <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
                <OrderSummary
                    order={order}
                    action={action}
                    actionSlot={
                        action.kind === 'approve_layout' ? (
                            <a href="#layout" className="btn-primary btn-sm">
                                Lihat Layout
                            </a>
                        ) : action.kind === 'payment' ? (
                            <a href="#pembayaran" className="btn-primary btn-sm">
                                Lihat Pembayaran
                            </a>
                        ) : undefined
                    }
                />

                <div id="layout">
                    <LayoutReview
                        layoutPreviewUrl={order.layoutPreviewUrl}
                        mockupUrl={order.mockupUrl}
                        designNotes={order.designNotes}
                        approved={layoutApproved}
                        approvedAt={approvedAt}
                        revisionNote={revisionNote}
                        revisionRequestedAt={revisionSubmittedAt}
                        canRespond={order.stage === 'proses_layout'}
                        submitting={submitting}
                        onApprove={handleApprove}
                        onRequestRevision={handleRequestRevision}
                    />
                </div>

                <StageProgress order={order} layoutApprovedAt={approvedAt} />

                <div id="pembayaran">
                    <PaymentInfo order={order} />
                </div>

                <ShippingSupport order={order} />

                <footer className="pb-4 pt-2 text-center text-xs text-slate-400">
                    {order.brand.companyName} • {order.orderNumber}
                </footer>
            </main>
        </div>
    )
}
