'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Order, Customer, DashboardMetrics, STAGES_ORDER, STAGE_LABELS, OrderStage, GATEKEEPER_STAGES, STAGE_BOTTLENECK_DAYS, OrderWithCustomer } from '@/types/database'
import DroppableColumn from './DroppableColumn'
import MetricsBar from './MetricsBar'
import { OrderStatusFilter, SearchBar, SelectBox } from '@/components/ui'
import type { OrderFilter, SelectOption } from '@/components/ui'
import AddOrderModal from '../orders/AddOrderModal'
import OrderDetailModal from '../orders/OrderDetailModal'
import AddCustomerModal from '../customers/AddCustomerModal'
import { createClient } from '@/lib/supabase/client'
import { generateSPKNumber } from '@/lib/actions/orders'
import { getOrderStageReadiness } from '@/lib/order-stage-readiness'
import { toast } from 'sonner'

interface AdminProfile {
    id: string
    full_name: string
}

interface BrandItem {
    id: string
    code: string
    name: string
}

const KANBAN_INITIAL_TAB_BY_STAGE: Record<OrderStage, 'payment' | 'stage' | 'form-order'> = {
    customer_dp_desain: 'payment',
    proses_desain: 'stage',
    dp_produksi: 'payment',
    proses_layout: 'stage',
    antrean_produksi: 'form-order',
    print_press: 'stage',
    cutting_jahit: 'stage',
    packing: 'stage',
    pelunasan: 'payment',
    pengiriman: 'stage',
}

interface KanbanBoardProps {
    orders: OrderWithCustomer[]
    metrics: DashboardMetrics
    customers: Customer[]
    admins: AdminProfile[]
    brands: BrandItem[]
    onOrderCreated: (order: OrderWithCustomer) => void
    onOrderUpdated: (orderId: string, updates: Partial<OrderWithCustomer>) => void
    onOrderRemoved: (orderId: string) => void
}

/** Order siap dipindah ke stage berikutnya (semua syarat stage terpenuhi) */
const isOrderReady = (order: OrderWithCustomer): boolean => getOrderStageReadiness(order).isReady

/** Order sudah melewati ambang batas hari di stage saat ini */
const isOrderBottleneck = (order: Order): boolean => {
    const stageEnteredAt = new Date(order.stage_entered_at)
    const daysDiff = Math.floor((Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff >= STAGE_BOTTLENECK_DAYS[order.stage]
}

/** Deadline order tinggal 3 hari lagi atau kurang */
const isDeadlineSoon = (order: Order): boolean => {
    if (!order.deadline) return false
    const deadline = new Date(order.deadline)
    const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilDeadline <= 3 && daysUntilDeadline >= 0
}

export default function KanbanBoard({
    orders,
    metrics,
    customers,
    admins,
    brands,
    onOrderCreated,
    onOrderUpdated,
    onOrderRemoved,
}: KanbanBoardProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    // Dipakai untuk mereset input SearchBar (komponen uncontrolled)
    const [searchKey, setSearchKey] = useState(0)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
    const [adminFilter, setAdminFilter] = useState<string>('')
    const [brandFilter, setBrandFilter] = useState<string>('')

    // Mobile responsive states
    const [isMobile, setIsMobile] = useState(false)
    const [currentStageIndex, setCurrentStageIndex] = useState(0)

    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const supabase = useMemo(() => createClient(), [])

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Scroll navigation - scroll by one column width (288px + gap)
    const scrollKanban = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 304 // column width (288px) + gap (16px)
            scrollContainerRef.current.scrollBy({
                left: direction === 'right' ? scrollAmount : -scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // Check if order is ready to move to next stage
    // Filter orders berdasarkan pencarian, admin, dan brand (tanpa filter status)
    const baseOrders = useMemo(() => orders.filter(order => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesSearch = (
                order.customer?.name.toLowerCase().includes(query) ||
                order.order_description?.toLowerCase().includes(query) ||
                order.customer?.phone.includes(query)
            )
            if (!matchesSearch) return false
        }

        // Admin filter
        if (adminFilter && order.created_by !== adminFilter) return false

        // Brand filter
        if (brandFilter && order.brand_id !== brandFilter) return false

        return true
    }), [adminFilter, brandFilter, orders, searchQuery])

    // Filter status order
    const filteredOrders = useMemo(() => {
        if (orderFilter === 'all') return baseOrders
        return baseOrders.filter(order => {
            switch (orderFilter) {
                case 'needs_action': return !isOrderReady(order)
                case 'ready_move': return isOrderReady(order)
                case 'bottleneck': return isOrderBottleneck(order)
                case 'deadline_soon': return isDeadlineSoon(order)
                default: return true
            }
        })
    }, [baseOrders, orderFilter])

    // Hitungan per filter status, dipakai sebagai angka pada pil filter
    const filterCounts = useMemo(() => ({
        all: baseOrders.length,
        needs_action: baseOrders.filter(order => !isOrderReady(order)).length,
        ready_move: baseOrders.filter(order => isOrderReady(order)).length,
        bottleneck: baseOrders.filter(order => isOrderBottleneck(order)).length,
        deadline_soon: baseOrders.filter(order => isDeadlineSoon(order)).length,
    }), [baseOrders])

    const adminOptions = useMemo<SelectOption[]>(
        () => admins.map(admin => ({ value: admin.id, label: admin.full_name })),
        [admins]
    )

    const brandOptions = useMemo<SelectOption[]>(
        () => brands.map(brand => ({ value: brand.id, label: brand.name, meta: brand.code })),
        [brands]
    )

    const hasActiveFilter = searchQuery !== '' || adminFilter !== '' || brandFilter !== '' || orderFilter !== 'all'

    const resetFilters = () => {
        setSearchQuery('')
        setSearchKey(key => key + 1)
        setAdminFilter('')
        setBrandFilter('')
        setOrderFilter('all')
    }

    // Group orders by stage
    const ordersByStage = useMemo(() => STAGES_ORDER.reduce((acc, stage) => {
        acc[stage] = filteredOrders.filter(order => order.stage === stage)
        return acc
    }, {} as Record<OrderStage, OrderWithCustomer[]>), [filteredOrders])

    // Check if stage has any bottleneck orders
    const hasBottleneckOrders = (stage: OrderStage) => {
        return ordersByStage[stage]?.some(order => isOrderBottleneck(order)) || false
    }

    // Check if stage is a gatekeeper
    const isGatekeeperStage = (stage: OrderStage) => GATEKEEPER_STAGES.includes(stage)

    // Check if order can move to target stage (gatekeeper logic - must complete current stage first)
    const canMoveToStage = (order: OrderWithCustomer, targetStage: OrderStage): { allowed: boolean; reason?: string } => {
        const currentIndex = STAGES_ORDER.indexOf(order.stage)
        const targetIndex = STAGES_ORDER.indexOf(targetStage)

        // Only check when moving forward
        if (targetIndex > currentIndex) {
            // Check if current stage is completed before allowing move
            switch (order.stage) {
                case 'customer_dp_desain':
                    if (!order.dp_desain_verified) {
                        return { allowed: false, reason: 'Selesaikan Deposit Desain terlebih dahulu' }
                    }
                    break
                case 'proses_desain':
                    if (!order.mockup_url) {
                        return { allowed: false, reason: 'Upload desain yang sudah di-ACC terlebih dahulu' }
                    }
                    break
                case 'proses_layout':
                    if (!order.layout_completed) {
                        return { allowed: false, reason: 'Selesaikan Layout terlebih dahulu' }
                    }
                    break
                case 'dp_produksi':
                    if (!order.dp_produksi_verified) {
                        return { allowed: false, reason: 'Verifikasi DP Produksi terlebih dahulu' }
                    }
                    break
                case 'antrean_produksi':
                    if (!order.production_ready) {
                        return { allowed: false, reason: 'Selesaikan Antrean Produksi terlebih dahulu' }
                    }
                    break
                case 'print_press':
                    if (!order.print_completed) {
                        return { allowed: false, reason: 'Selesaikan Print & Press terlebih dahulu' }
                    }
                    break
                case 'cutting_jahit':
                    if (!order.sewing_completed) {
                        return { allowed: false, reason: 'Selesaikan Cutting & Jahit terlebih dahulu' }
                    }
                    break
                case 'packing':
                    if (!order.packing_completed) {
                        return { allowed: false, reason: 'Selesaikan Packing terlebih dahulu' }
                    }
                    break
                case 'pelunasan':
                    if (!order.pelunasan_verified) {
                        return { allowed: false, reason: 'Verifikasi Pelunasan terlebih dahulu' }
                    }
                    break
                case 'pengiriman':
                    if (!order.tracking_number || !order.shipped_at) {
                        return { allowed: false, reason: 'Isi nomor resi dan tanggal kirim terlebih dahulu' }
                    }
                    break
            }
        }
        return { allowed: true }
    }

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id))
    }

    // Handle drag end - update order stage
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const orderId = String(active.id)
        const targetStage = over.id as OrderStage

        const order = orders.find(o => o.id === orderId)
        if (!order) return

        if (order.stage === targetStage) return

        const moveCheck = canMoveToStage(order, targetStage)
        if (!moveCheck.allowed) {
            toast.warning(moveCheck.reason)
            return
        }

        const previousStage = order.stage
        const nextStageEnteredAt = new Date().toISOString()

        onOrderUpdated(orderId, {
            stage: targetStage,
            stage_entered_at: nextStageEnteredAt,
        })

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    stage: targetStage,
                    stage_entered_at: nextStageEnteredAt
                })
                .eq('id', orderId)

            if (error) {
                console.error('Supabase error:', error.message, error.code)
                onOrderUpdated(orderId, { stage: previousStage, stage_entered_at: order.stage_entered_at })
                toast.error(`Gagal pindah stage: ${error.message}`)
                return
            }

            // Auto-generate SPK when entering antrean_produksi via drag & drop
            if (targetStage === 'antrean_produksi' && !order.spk_number) {
                const spk = await generateSPKNumber(orderId)
                if (spk.success) {
                    onOrderUpdated(orderId, { spk_number: spk.spkNumber ?? null })
                    toast.success(`Berhasil pindah stage! SPK ${spk.spkNumber} otomatis di-generate`)
                } else {
                    toast.warning('Pindah stage berhasil, tapi SPK gagal dibuat. Buka detail order untuk membuat SPK.')
                }
            }
        } catch (err) {
            onOrderUpdated(orderId, { stage: previousStage, stage_entered_at: order.stage_entered_at })
            console.error('Failed to update stage:', err)
            toast.error('Terjadi kesalahan saat update stage')
        }
    }

    const activeOrder = activeId ? orders.find(o => o.id === activeId) : null
    const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) ?? null : null

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header Section */}
            <div className="space-y-2 mb-3">
                {/* Metrics Row */}
                <MetricsBar metrics={metrics} />

                {/* Search and Add Button Row */}
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <SearchBar key={searchKey} onSearch={setSearchQuery} />
                    </div>
                    <button
                        onClick={() => setIsAddCustomerModalOpen(true)}
                        className="btn-secondary"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span className="hidden sm:inline">Tambah Customer</span>
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Tambah Order</span>
                    </button>
                </div>

                {/* Filter Row */}
                <div className="surface flex flex-wrap items-center gap-2 p-2">
                    <OrderStatusFilter
                        value={orderFilter}
                        onChange={setOrderFilter}
                        counts={filterCounts}
                    />

                    <SelectBox
                        className="w-40 shrink-0"
                        options={adminOptions}
                        value={adminFilter}
                        onChange={setAdminFilter}
                        clearable
                        clearLabel="Semua Admin"
                        placeholder="Semua Admin"
                        searchable={false}
                        ariaLabel="Filter admin"
                    />
                    <SelectBox
                        className="w-40 shrink-0"
                        options={brandOptions}
                        value={brandFilter}
                        onChange={setBrandFilter}
                        clearable
                        clearLabel="Semua Brand"
                        placeholder="Semua Brand"
                        searchable={false}
                        ariaLabel="Filter brand"
                    />

                    {hasActiveFilter && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="btn-ghost btn-sm text-slate-600"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Kanban Board - Full height, scrollbar at bottom */}
            <DndContext
                sensors={isMobile ? [] : sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 relative">
                    {/* Mobile Stage Header with Navigation */}
                    {isMobile && (
                        <div className="mb-3">
                            {/* Stage Navigation */}
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    onClick={() => setCurrentStageIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentStageIndex === 0}
                                    className={`p-2 rounded-full ${currentStageIndex === 0
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
                                        }`}
                                    aria-label="Stage sebelumnya"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="text-center flex-1">
                                    <h3 className="font-semibold text-slate-900">{STAGE_LABELS[STAGES_ORDER[currentStageIndex]]}</h3>
                                    <p className="text-xs text-slate-500">{currentStageIndex + 1} / {STAGES_ORDER.length}</p>
                                </div>
                                <button
                                    onClick={() => setCurrentStageIndex(prev => Math.min(STAGES_ORDER.length - 1, prev + 1))}
                                    disabled={currentStageIndex === STAGES_ORDER.length - 1}
                                    className={`p-2 rounded-full ${currentStageIndex === STAGES_ORDER.length - 1
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
                                        }`}
                                    aria-label="Stage berikutnya"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                            {/* Stage Indicator Dots */}
                            <div className="flex justify-center gap-1.5">
                                {STAGES_ORDER.map((stage, index) => (
                                    <button
                                        key={stage}
                                        onClick={() => setCurrentStageIndex(index)}
                                        className={`w-2 h-2 rounded-full transition-all ${index === currentStageIndex
                                            ? 'bg-brand-600 w-4'
                                            : 'bg-slate-300 hover:bg-slate-400'
                                            }`}
                                        title={STAGE_LABELS[stage]}
                                        aria-label={`Buka stage ${STAGE_LABELS[stage]}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Desktop: Sticky Side Navigation Buttons */}
                    {!isMobile && (
                        <>
                            {/* Left Navigation - Sticky wrapper */}
                            <div className="absolute left-4 top-0 bottom-0 z-20 pointer-events-none">
                                <div className="sticky top-1/2 -translate-y-1/2 pointer-events-auto">
                                    <button
                                        onClick={() => scrollKanban('left')}
                                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all hover:scale-110 shadow-lg"
                                        title="Scroll Left"
                                        aria-label="Geser ke kiri"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Right Navigation - Sticky wrapper */}
                            <div className="absolute right-4 top-0 bottom-0 z-20 pointer-events-none">
                                <div className="sticky top-1/2 -translate-y-1/2 pointer-events-auto">
                                    <button
                                        onClick={() => scrollKanban('right')}
                                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all hover:scale-110 shadow-lg"
                                        title="Scroll Right"
                                        aria-label="Geser ke kanan"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Columns Container */}
                    {isMobile ? (
                        // Mobile: Single Column
                        <div className="h-full pb-4">
                            <DroppableColumn
                                key={STAGES_ORDER[currentStageIndex]}
                                stage={STAGES_ORDER[currentStageIndex]}
                                label={STAGE_LABELS[STAGES_ORDER[currentStageIndex]]}
                                orders={ordersByStage[STAGES_ORDER[currentStageIndex]]}
                                isGatekeeper={isGatekeeperStage(STAGES_ORDER[currentStageIndex])}
                                isBottleneckStage={hasBottleneckOrders(STAGES_ORDER[currentStageIndex])}
                                checkBottleneck={isOrderBottleneck}
                                onOrderClick={(order) => setSelectedOrderId(order.id)}
                                fullWidth
                            />
                        </div>
                    ) : (
                        // Desktop: Scrollable Container with ALWAYS visible bottom scrollbar
                        <div
                            ref={scrollContainerRef}
                            className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin"
                        >
                            <div className="flex gap-2 min-w-max h-full pb-1 px-1">
                                {STAGES_ORDER.map((stage) => (
                                    <DroppableColumn
                                        key={stage}
                                        stage={stage}
                                        label={STAGE_LABELS[stage]}
                                        orders={ordersByStage[stage]}
                                        isGatekeeper={isGatekeeperStage(stage)}
                                        isBottleneckStage={hasBottleneckOrders(stage)}
                                        checkBottleneck={isOrderBottleneck}
                                        onOrderClick={(order) => setSelectedOrderId(order.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DragOverlay>
                    {activeOrder ? (
                        <div className="p-3 rounded-xl bg-white border-2 border-brand-500 shadow-2xl opacity-90">
                            <p className="font-semibold text-slate-900 text-sm">{activeOrder.customer?.name}</p>
                            <p className="text-xs text-slate-500 text-mono">{activeOrder.total_quantity} pcs</p>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <AddOrderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                customers={customers}
                onOrderCreated={onOrderCreated}
            />

            <OrderDetailModal
                order={selectedOrder}
                isOpen={selectedOrder !== null}
                initialActiveTab={selectedOrder ? KANBAN_INITIAL_TAB_BY_STAGE[selectedOrder.stage] : undefined}
                onClose={() => setSelectedOrderId(null)}
                onOrderUpdated={onOrderCreated}
                onOrderDeleted={onOrderRemoved}
            />

            <AddCustomerModal
                isOpen={isAddCustomerModalOpen}
                onClose={() => setIsAddCustomerModalOpen(false)}
            />
        </div>
    )
}
