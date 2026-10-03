'use client'

import { MapPin, MessageCircle, Mail, Truck } from 'lucide-react'
import type { PortalOrder } from '@/lib/portal/types'
import { formatDate } from '@/lib/utils/format'

interface ShippingSupportProps {
    order: PortalOrder
}

/**
 * Info pengiriman + kanal bantuan.
 */
export function ShippingSupport({ order }: ShippingSupportProps) {
    const { shipping, brand } = order
    const waLink = brand.phone
        ? `https://wa.me/${brand.phone}?text=${encodeURIComponent(
              `Halo, saya ingin menanyakan order ${order.orderNumber}.`
          )}`
        : null

    return (
        <section className="surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Pengiriman & Bantuan</h2>

            {shipping.trackingNumber ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                    <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            {shipping.courier || 'Kurir'}
                        </p>
                        <p className="text-sm text-slate-600">No. Resi: {shipping.trackingNumber}</p>
                        {shipping.shippedAt && (
                            <p className="mt-0.5 text-xs text-slate-400">
                                Dikirim {formatDate(shipping.shippedAt)}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-500">
                    Order belum dikirim. Nomor resi akan muncul di sini setelah pengiriman.
                </p>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                        <MessageCircle className="h-4 w-4" />
                        Hubungi via WhatsApp
                    </a>
                )}
                {brand.email && (
                    <a href={`mailto:${brand.email}`} className="btn-secondary">
                        <Mail className="h-4 w-4" />
                        Kirim Email
                    </a>
                )}
            </div>

            {brand.address && (
                <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {brand.address}
                </p>
            )}
        </section>
    )
}
