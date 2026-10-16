'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Order, OrderStage, OrderWithCustomer } from '@/types/database'
import DraggableOrderCard from './DraggableOrderCard'

interface DroppableColumnProps {
    stage: OrderStage
    label: string
    orders: OrderWithCustomer[]
    isGatekeeper: boolean
    isBottleneckStage: boolean
    checkBottleneck: (order: Order) => boolean
    onOrderClick: (order: OrderWithCustomer) => void
    onAddClick?: () => void
    fullWidth?: boolean
}

/**
 * Satu kolom papan: kepala kolom (judul + jumlah) dan badan kolom penerima kartu.
 * Satu tingkat elevasi (tepi saja), jarak kelipatan 8, dan warna hanya dipakai
 * saat kolom butuh perhatian (gatekeeper / bottleneck).
 */
export default function DroppableColumn({
    stage,
    label,
    orders,
    isGatekeeper,
    isBottleneckStage,
    checkBottleneck,
    onOrderClick,
    onAddClick,
    fullWidth = false,
}: DroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage,
    })

    return (
        <div className={`${fullWidth ? 'w-full' : 'w-[288px]'} flex-shrink-0 flex flex-col h-full`}>
            {/* Column Header */}
            <div
                className={`mb-[8px] flex items-center gap-[8px] rounded-lg border px-[12px] py-[10px] ${isGatekeeper
                    ? 'border-amber-200 bg-amber-50'
                    : isBottleneckStage
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-white'
                    }`}
            >
                {/* Circle Icon */}
                <div className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${isGatekeeper ? 'border-amber-500' :
                    isBottleneckStage ? 'border-red-500' : 'border-slate-300'
                    }`}>
                    {isGatekeeper && (
                        <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    )}
                    {isBottleneckStage && (
                        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
                <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{label}</h3>
                <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-slate-100 px-[8px] text-sm font-semibold text-slate-600 text-mono">
                    {orders.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 overflow-y-auto space-y-[8px] rounded-lg p-[8px] transition-colors ${isOver
                    ? 'bg-brand-50 border-2 border-dashed border-brand-400'
                    : 'bg-slate-100/80 border border-slate-200'
                    }`}
            >
                <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {orders.length === 0 ? (
                        <div className={`flex h-[96px] items-center justify-center rounded-lg border-2 border-dashed text-base ${isOver ? 'text-brand-600 border-brand-300 bg-brand-50' : 'text-slate-500 border-slate-200'
                            }`}>
                            {isOver ? 'Lepaskan di sini' : 'Belum ada order'}
                        </div>
                    ) : (
                        orders.map((order) => (
                            <DraggableOrderCard
                                key={order.id}
                                order={order}
                                isBottleneck={checkBottleneck(order)}
                                onClick={() => onOrderClick(order)}
                            />
                        ))
                    )}
                </SortableContext>
            </div>

            {/* Add Task Button at Bottom */}
            {onAddClick && (
                <button
                    onClick={onAddClick}
                    className="mt-[8px] flex min-h-[44px] w-full items-center justify-center gap-[8px] rounded-lg border border-dashed border-slate-300 text-sm font-medium text-slate-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Order
                </button>
            )}
        </div>
    )
}
