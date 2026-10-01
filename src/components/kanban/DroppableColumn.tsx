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
        <div className={`${fullWidth ? 'w-full' : 'w-64'} flex-shrink-0 flex flex-col h-full`}>
            {/* Column Header */}
            <div
                className={`mb-2 p-2 rounded-xl flex items-center bg-white border ${isGatekeeper
                    ? 'border-amber-300 bg-amber-50'
                    : isBottleneckStage
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200'
                    }`}
            >
                <div className="flex items-center gap-2">
                    {/* Circle Icon */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isGatekeeper ? 'border-amber-400' :
                        isBottleneckStage ? 'border-red-400' : 'border-slate-300'
                        }`}>
                        {isGatekeeper && (
                            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        )}
                        {isBottleneckStage && (
                            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                    <span className="badge badge-neutral text-mono">
                        {orders.length}
                    </span>
                </div>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 overflow-y-auto space-y-1.5 p-1.5 rounded-xl transition-all duration-200 ${isOver
                    ? 'bg-brand-50 border-2 border-dashed border-brand-400'
                    : 'bg-slate-100/80 border border-slate-200'
                    }`}
            >
                <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {orders.length === 0 ? (
                        <div className={`flex items-center justify-center h-24 text-sm rounded-xl border-2 border-dashed ${isOver ? 'text-brand-600 border-brand-300 bg-brand-50' : 'text-slate-400 border-slate-200'
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
                    className="mt-2 w-full py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
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
