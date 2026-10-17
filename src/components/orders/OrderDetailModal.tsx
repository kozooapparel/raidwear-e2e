'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { STAGE_LABELS, STAGES_ORDER, OrderStage, OrderWithCustomer } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { FormOrderEditor, FormOrderDownloadButton } from '@/components/form-order'
import { hasFormOrderData } from '@/lib/form-order'
import { getOrderStageReadiness } from '@/lib/order-stage-readiness'
import { copyTextToClipboard } from '@/lib/utils/clipboard'
import { ImageDropzone, CurrencyInput, ConfirmDialog, validateImageFile } from '@/components/ui'
import InvoicePreviewButton from '@/components/invoices/InvoicePreviewButton'
import { verifyDPPayment, correctDPPayment, moveOrderToNextStage, deleteOrder, updateDesignNotes, archiveOrder } from '@/lib/actions/orders'
import { getCustomerPortalLink } from '@/lib/actions/customers'

type OrderDetailTab = 'detail' | 'payment' | 'stage' | 'form-order'

interface OrderDetailModalProps {
    order: OrderWithCustomer | null
    isOpen: boolean
    initialActiveTab?: OrderDetailTab
    onClose: () => void
    onOrderUpdated?: (order: OrderWithCustomer) => void
    onOrderDeleted?: (orderId: string) => void
}

type LayoutFile = {
    id: string
    originalName: string
    sizeBytes: number
    status: 'uploading' | 'ready' | 'missing' | 'deleted' | 'failed'
}

class StorageRequestError extends Error {
    r2Completed: boolean

    constructor(message: string, r2Completed = false) {
        super(message)
        this.name = 'StorageRequestError'
        this.r2Completed = r2Completed
    }
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

async function storageRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
    const body = await response.json()
    if (!response.ok) throw new StorageRequestError(body.error || 'Permintaan file gagal', body.r2Completed === true)
    return body as T
}

function uploadPart(url: string, chunk: Blob, onProgress: (loaded: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('PUT', url)
        request.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(event.loaded)
        }
        request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
                reject(new Error(`Upload bagian file gagal (${request.status})`))
                return
            }
            const eTag = request.getResponseHeader('ETag')
            if (!eTag) {
                reject(new Error('Upload berhasil, tetapi ETag tidak diterima. Periksa CORS bucket R2.'))
                return
            }
            resolve(eTag)
        }
        request.onerror = () => reject(new Error('Gagal menghubungi R2 saat mengupload bagian file. Periksa kebijakan CORS bucket R2 (izinkan PUT dan expose header ETag).'))
        request.onabort = () => reject(new Error('Upload bagian file dibatalkan'))
        request.send(chunk)
    })
}

export default function OrderDetailModal({
    order,
    isOpen,
    initialActiveTab,
    onClose,
    onOrderUpdated,
    onOrderDeleted,
}: OrderDetailModalProps) {
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<OrderDetailTab>('detail')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [dpDesainAmount, setDpDesainAmount] = useState('')
    const [dpProduksiAmount, setDpProduksiAmount] = useState('')
    const [pelunasanAmount, setPelunasanAmount] = useState('')
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [orderInvoice, setOrderInvoice] = useState<{ id: string; no_invoice: string; total: number; sisa_tagihan: number; deadline: string | null } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [designNotes, setDesignNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)
    const [archiving, setArchiving] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [showDeleteMockupConfirm, setShowDeleteMockupConfirm] = useState(false)
    const [deletingMockup, setDeletingMockup] = useState(false)
    // Konfirmasi sebelum memundurkan order ke tahap sebelumnya
    const [showMoveBackConfirm, setShowMoveBackConfirm] = useState(false)
    const [showDeleteLayoutPreviewConfirm, setShowDeleteLayoutPreviewConfirm] = useState(false)
    const [deletingLayoutPreview, setDeletingLayoutPreview] = useState(false)
    const [portalLinkCopied, setPortalLinkCopied] = useState(false)
    const [editingDP, setEditingDP] = useState<'dp_desain' | 'dp_produksi' | 'pelunasan' | null>(null)
    const [editDPAmount, setEditDPAmount] = useState('')
    const [savingCorrection, setSavingCorrection] = useState(false)
    const [layoutFiles, setLayoutFiles] = useState<LayoutFile[]>([])
    const [layoutFilesLoading, setLayoutFilesLoading] = useState(false)
    const [layoutUploadProgress, setLayoutUploadProgress] = useState<number | null>(null)
    const [layoutBusy, setLayoutBusy] = useState<string | null>(null)
    const layoutFileInputRef = useRef<HTMLInputElement>(null)
    const mockupFileInputRef = useRef<HTMLInputElement>(null)
    const wasOpenRef = useRef(false)
    const [layoutFileToDelete, setLayoutFileToDelete] = useState<LayoutFile | null>(null)
    const [showDeleteLayoutLinkConfirm, setShowDeleteLayoutLinkConfirm] = useState(false)
    const supabase = useMemo(() => createClient(), [])

    // Only callers that explicitly provide a tab override the modal's existing behavior.
    useEffect(() => {
        if (isOpen && !wasOpenRef.current && initialActiveTab) {
            setActiveTab(initialActiveTab)
        }
        wasOpenRef.current = isOpen
    }, [initialActiveTab, isOpen])

    // Kalkulator DP Produksi: minimal DP = 50% dari total invoice
    const totalInvoice = orderInvoice?.total ?? 0
    const dpProduksiMinimal = Math.round(totalInvoice * 0.5)
    const dpProduksiInputValue = parseInt(dpProduksiAmount) || 0
    const sisaSetelahDP = Math.max(totalInvoice - (order?.dp_desain_amount || 0) - dpProduksiInputValue, 0)

    const syncLatestOrder = async (options?: { close?: boolean }) => {
        if (!order?.id) return

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                invoices(id),
                customer:customers(*),
                creator:profiles!created_by(id, full_name),
                brand:brands(*)
            `)
            .eq('id', order.id)
            .single()

        if (error) {
            console.error('Failed to sync latest order:', error)
            return
        }

        onOrderUpdated?.(data as OrderWithCustomer)

        if (options?.close) {
            onClose()
        }
    }

    // Fetch invoice for this order
    useEffect(() => {
        const fetchInvoice = async () => {
            if (!order?.id) return
            const { data } = await supabase
                .from('invoices')
                .select('id, no_invoice, total, sisa_tagihan, deadline')
                .eq('order_id', order.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
            setOrderInvoice(data || null)
        }
        fetchInvoice()
    }, [order?.id, supabase])

    // Update trackingNumber when order changes
    if (order?.tracking_number && trackingNumber === '' && order.tracking_number !== trackingNumber) {
        setTrackingNumber(order.tracking_number)
    }

    // Update designNotes when order changes
    useEffect(() => {
        if (order?.design_notes !== undefined) {
            setDesignNotes(order.design_notes || '')
        }
    }, [order?.design_notes])

    // Tutup konfirmasi hapus saat pindah order
    useEffect(() => {
        setShowDeleteMockupConfirm(false)
    }, [order?.id])

    const refreshLayoutFiles = async (target?: { orderId: string; brandId: string }): Promise<LayoutFile[]> => {
        const orderId = target?.orderId || order?.id
        const brandId = target?.brandId || order?.brand_id
        if (!orderId || !brandId) {
            setLayoutFiles([])
            return []
        }

        setLayoutFilesLoading(true)
        try {
            const result = await storageRequest<{ files: LayoutFile[] }>(
                `/api/storage/files?orderId=${encodeURIComponent(orderId)}&brandId=${encodeURIComponent(brandId)}`,
            )
            const files = result.files.filter((file) => file.status !== 'deleted')
            setLayoutFiles(files)
            return files
        } catch (error) {
            console.error('Failed to load layout files:', error)
            setLayoutFiles([])
            return []
        } finally {
            setLayoutFilesLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) void refreshLayoutFiles()
    // The order identifiers are sufficient to refresh the scoped R2 list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, order?.id, order?.brand_id])

    // Kesiapan tahap ini dipakai chip kartu dan tombol pindah tahap; `action` menjelaskan
    // apa yang perlu dikerjakan admin sekarang.
    const stageReadiness = order
        ? getOrderStageReadiness(order, { hasInvoice: orderInvoice !== null })
        : null

    const isReady = stageReadiness?.isReady ?? false

    if (!isOpen || !order) return null
    const handleLayoutFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        let fileId: string | null = null
        let r2UploadCompleted = false
        let brandId: string | null = order.brand_id
        setLayoutBusy('upload')
        setLayoutUploadProgress(0)
        const toastId = toast.loading('Mengupload file layout...')

        try {
            if (!brandId) {
                const { data: defaultBrand, error: brandError } = await supabase
                    .from('brands')
                    .select('id')
                    .eq('is_active', true)
                    .eq('is_default', true)
                    .maybeSingle()
                if (brandError) throw brandError
                if (!defaultBrand) throw new Error('Brand default aktif belum tersedia untuk order ini')

                const { error: orderError } = await supabase
                    .from('orders')
                    .update({ brand_id: defaultBrand.id })
                    .eq('id', order.id)
                    .is('brand_id', null)
                if (orderError) throw orderError
                brandId = defaultBrand.id
                await syncLatestOrder()
            }
            if (!brandId) throw new Error('Brand order belum tersedia untuk upload file layout')

            const started = await storageRequest<{ fileId: string; partSize: number }>('/api/storage/uploads/initiate', {
                method: 'POST',
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || null,
                    sizeBytes: file.size,
                    brandId,
                    orderId: order.id,
                }),
            })
            fileId = started.fileId
            const partSize = started.partSize
            const totalParts = Math.max(1, Math.ceil(file.size / partSize))
            const parts: Array<{ ETag: string; PartNumber: number }> = []

            for (let index = 0; index < totalParts; index += 1) {
                const start = index * partSize
                const end = Math.min(start + partSize, file.size)
                let eTag: string | null = null
                let lastError: unknown
                for (let attempt = 1; attempt <= 3 && !eTag; attempt += 1) {
                    try {
                        // Request a new presigned URL for every retry; this also
                        // avoids retrying an expired signed URL on a slow network.
                        const part = await storageRequest<{ url: string }>('/api/storage/uploads/part-url', {
                            method: 'POST',
                            body: JSON.stringify({ fileId, partNumber: index + 1 }),
                        })
                        eTag = await uploadPart(part.url, file.slice(start, end), (loaded) => {
                            const uploaded = start + loaded
                            setLayoutUploadProgress(file.size ? Math.min(99, Math.round((uploaded / file.size) * 100)) : 99)
                        })
                    } catch (error) {
                        lastError = error
                    }
                }
                if (!eTag) {
                    throw lastError instanceof Error ? lastError : new Error('Gagal mengupload bagian file')
                }
                parts.push({ ETag: eTag, PartNumber: index + 1 })
            }

            await storageRequest('/api/storage/uploads/complete', {
                method: 'POST',
                body: JSON.stringify({ fileId, parts }),
            })
            r2UploadCompleted = true

            // Success is based on a fresh server response, not optimistic state
            // from the browser while the multipart request was still in flight.
            const files = await refreshLayoutFiles({ orderId: order.id, brandId })
            if (!files.some((item) => item.id === fileId && item.status === 'ready')) {
                throw new Error('R2 sudah menyelesaikan upload, tetapi file belum tersedia di metadata server')
            }

            const { error } = await supabase
                .from('orders')
                .update({ layout_completed: true, layout_completed_at: new Date().toISOString() })
                .eq('id', order.id)
            if (error) throw error

            setLayoutUploadProgress(100)
            await syncLatestOrder()
            toast.success('File layout berhasil diupload.', { id: toastId })
        } catch (error) {
            console.error('Layout upload failed:', error)
            const r2CompletedDuringFinalization = error instanceof StorageRequestError && error.r2Completed
            if (fileId && !r2UploadCompleted && !r2CompletedDuringFinalization) {
                await storageRequest('/api/storage/uploads/abort', {
                    method: 'POST', body: JSON.stringify({ fileId }),
                }).catch(() => undefined)
            }
            const message = error instanceof Error ? error.message : 'Gagal mengupload file layout'
            toast.error(r2UploadCompleted ? 'File R2 sudah tersimpan, tetapi status layout gagal diperbarui' : message, { id: toastId })
            if ((r2UploadCompleted || r2CompletedDuringFinalization) && brandId) {
                await refreshLayoutFiles({ orderId: order.id, brandId }).catch(() => undefined)
            }
        } finally {
            setLayoutBusy(null)
            setLayoutUploadProgress(null)
        }
    }

    const openLayoutFile = async (file: LayoutFile, download: boolean) => {
        setLayoutBusy(`${download ? 'download' : 'open'}-${file.id}`)
        try {
            const result = await storageRequest<{ url: string }>(
                `/api/storage/files/${file.id}/download${download ? '' : '?disposition=inline'}`,
                { method: 'POST' },
            )
            if (download) window.location.assign(result.url)
            else window.open(result.url, '_blank', 'noopener,noreferrer')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal menyiapkan file')
            await refreshLayoutFiles()
        } finally {
            setLayoutBusy(null)
        }
    }

    // Salin link publik file layout agar bisa dibagikan lewat WhatsApp/email dan
    // dibuka siapa pun tanpa login.
    const handleCopyLayoutLink = async (file: LayoutFile) => {
        const link = `${window.location.origin}/lacak/file/${file.id}`
        const copied = await copyTextToClipboard(link)
        if (!copied) {
            toast.error('Gagal menyalin link file layout')
            return
        }
        toast.success('Link file layout disalin')
    }

    const deleteLayoutFile = async (file: LayoutFile) => {
        setLayoutBusy(`delete-${file.id}`)
        try {
            await storageRequest('/api/storage/files', {
                method: 'DELETE', body: JSON.stringify({ fileId: file.id }),
            })
            const remainingFiles = layoutFiles.filter((item) => item.id !== file.id && item.status === 'ready')
            const { error } = await supabase
                .from('orders')
                .update({
                    layout_completed: remainingFiles.length > 0 || Boolean(order.layout_url),
                    layout_completed_at: remainingFiles.length > 0 || order.layout_url ? order.layout_completed_at : null,
                })
                .eq('id', order.id)
            if (error) throw error
            await refreshLayoutFiles()
            await syncLatestOrder()
            toast.success('File layout dihapus')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal menghapus file layout')
        } finally {
            setLayoutBusy(null)
        }
    }

    // Hapus link layout lama (Google Drive) milik order
    const deleteLayoutLink = async (targetOrderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    layout_url: null,
                    layout_completed: false,
                    layout_completed_at: null
                })
                .eq('id', targetOrderId)

            if (error) throw error
            toast.success('Link dihapus')
            await syncLatestOrder({ close: true })
        } catch (err) {
            console.error('Delete layout link error:', err)
            toast.error('Gagal menghapus link')
        }
    }

    // Handle save tracking number
    const handleSaveTrackingNumber = async () => {
        if (!trackingNumber.trim()) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    tracking_number: trackingNumber.trim(),
                    shipped_at: new Date().toISOString()
                })
                .eq('id', order.id)

            if (error) throw error
            await syncLatestOrder({ close: true })
        } catch (err) {
            console.error('Save tracking error:', err)
        } finally {
            setLoading(false)
        }
    }

    // Handle upload desain final (mockup) — dipakai oleh klik, drag-drop, dan Ctrl+V
    const handleMockupUpload = async (file: File) => {
        setLoading(true)
        const toastId = toast.loading('Mengupload desain...')
        try {
            const fileExt = (file.name.split('.').pop() || 'png').toLowerCase()
            const filePath = `mockups/${order.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('order-assets')
                .upload(filePath, file, { contentType: file.type, upsert: false })

            if (uploadError) {
                console.error('Storage error:', uploadError)
                toast.error(`Gagal upload: ${uploadError.message}`, { id: toastId })
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('order-assets')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('orders')
                .update({ mockup_url: publicUrl })
                .eq('id', order.id)

            if (updateError) {
                console.error('Update error:', updateError)
                toast.error(`Gagal update: ${updateError.message}`, { id: toastId })
                return
            }

            toast.success('Desain berhasil diupload!', { id: toastId })
            await syncLatestOrder()
        } catch (err) {
            console.error('Upload error:', err)
            const message = err instanceof Error ? err.message : 'Unknown error'
            toast.error(`Gagal upload desain: ${message}`, { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    // Handle hapus desain final — buang file dari storage lalu kosongkan mockup_url
    const handleDeleteMockup = async () => {
        if (!order.mockup_url) return

        setDeletingMockup(true)
        const toastId = toast.loading('Menghapus desain...')
        try {
            // Ambil path file dari public URL: .../object/public/order-assets/<path>
            const marker = '/order-assets/'
            const markerIndex = order.mockup_url.indexOf(marker)
            const filePath = markerIndex !== -1
                ? decodeURIComponent(order.mockup_url.slice(markerIndex + marker.length))
                : null

            // Kosongkan referensi di DB lebih dulu supaya UI tidak menunjuk file hilang
            const { error: updateError } = await supabase
                .from('orders')
                .update({ mockup_url: null })
                .eq('id', order.id)

            if (updateError) {
                console.error('Update error:', updateError)
                toast.error(`Gagal menghapus: ${updateError.message}`, { id: toastId })
                return
            }

            // File sisa tidak memblokir alur kerja, jadi kegagalan di sini hanya di-log
            if (filePath) {
                const { error: removeError } = await supabase.storage
                    .from('order-assets')
                    .remove([filePath])

                if (removeError) {
                    console.error('Storage remove error:', removeError)
                }
            }

            toast.success('Desain berhasil dihapus', { id: toastId })
            setShowDeleteMockupConfirm(false)
            await syncLatestOrder()
        } catch (err) {
            console.error('Delete mockup error:', err)
            const message = err instanceof Error ? err.message : 'Unknown error'
            toast.error(`Gagal menghapus desain: ${message}`, { id: toastId })
        } finally {
            setDeletingMockup(false)
        }
    }

    // Handle ganti mockup dari tab Detail — validasi lalu pakai alur upload yang sama.
    const handleMockupFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        // Reset supaya memilih file yang sama lagi tetap memicu onChange
        event.target.value = ''
        if (!file) return

        const validationError = validateImageFile(file)
        if (validationError) {
            toast.error(validationError)
            return
        }

        void handleMockupUpload(file)
    }

    // Handle upload gambar layout (pratinjau ACC customer) — hanya gambar, bukan file cetak.
    // Gambar ini yang ditampilkan di portal customer untuk disetujui.
    const handleLayoutPreviewUpload = async (file: File) => {
        setLoading(true)
        const toastId = toast.loading('Mengupload gambar layout...')
        try {
            const fileExt = (file.name.split('.').pop() || 'png').toLowerCase()
            const filePath = `layouts/${order.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('order-assets')
                .upload(filePath, file, { contentType: file.type, upsert: false })

            if (uploadError) {
                console.error('Storage error:', uploadError)
                toast.error(`Gagal upload: ${uploadError.message}`, { id: toastId })
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('order-assets')
                .getPublicUrl(filePath)

            // Gambar layout baru membatalkan ACC sebelumnya: customer harus menyetujui ulang.
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    layout_preview_url: publicUrl,
                    layout_approved_at: null,
                    layout_revision_note: null,
                    layout_revision_requested_at: null,
                })
                .eq('id', order.id)

            if (updateError) {
                console.error('Update error:', updateError)
                toast.error(`Gagal update: ${updateError.message}`, { id: toastId })
                return
            }

            toast.success('Gambar layout berhasil diupload!', { id: toastId })
            await syncLatestOrder()
        } catch (err) {
            console.error('Upload error:', err)
            const message = err instanceof Error ? err.message : 'Unknown error'
            toast.error(`Gagal upload gambar layout: ${message}`, { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    // Handle hapus gambar layout — buang file dari storage lalu kosongkan layout_preview_url
    const handleDeleteLayoutPreview = async () => {
        if (!order.layout_preview_url) return

        setDeletingLayoutPreview(true)
        const toastId = toast.loading('Menghapus gambar layout...')
        try {
            const marker = '/order-assets/'
            const markerIndex = order.layout_preview_url.indexOf(marker)
            const filePath = markerIndex !== -1
                ? decodeURIComponent(order.layout_preview_url.slice(markerIndex + marker.length))
                : null

            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    layout_preview_url: null,
                    layout_approved_at: null,
                    layout_revision_note: null,
                    layout_revision_requested_at: null,
                })
                .eq('id', order.id)

            if (updateError) {
                console.error('Update error:', updateError)
                toast.error(`Gagal menghapus: ${updateError.message}`, { id: toastId })
                return
            }

            if (filePath) {
                const { error: removeError } = await supabase.storage
                    .from('order-assets')
                    .remove([filePath])

                if (removeError) {
                    console.error('Storage remove error:', removeError)
                }
            }

            toast.success('Gambar layout berhasil dihapus', { id: toastId })
            setShowDeleteLayoutPreviewConfirm(false)
            await syncLatestOrder()
        } catch (err) {
            console.error('Delete layout preview error:', err)
            const message = err instanceof Error ? err.message : 'Unknown error'
            toast.error(`Gagal menghapus gambar layout: ${message}`, { id: toastId })
        } finally {
            setDeletingLayoutPreview(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value)
    }

    const formatDate = (date: string | null) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    }

    // Versi ringkas untuk baris status: "3 Okt 2026"
    const formatDateCompact = (date: string | null) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    // Get next stage in sequence
    const getNextStage = (): OrderStage | null => {
        const currentIndex = STAGES_ORDER.indexOf(order.stage)
        if (currentIndex < STAGES_ORDER.length - 1) {
            return STAGES_ORDER[currentIndex + 1]
        }
        return null
    }

    // Get previous stage in sequence (untuk mengoreksi salah pindah tahap)
    const getPreviousStage = (): OrderStage | null => {
        const currentIndex = STAGES_ORDER.indexOf(order.stage)
        if (currentIndex > 0) {
            return STAGES_ORDER[currentIndex - 1]
        }
        return null
    }

    // Manual completion stages that require admin checkbox confirmation
    const MANUAL_STAGES: OrderStage[] = ['proses_layout', 'antrean_produksi', 'print_press', 'cutting_jahit', 'packing']
    const isManualStage = MANUAL_STAGES.includes(order.stage as OrderStage)

    // Status tombol toggle tahap manual, mengikuti field yang memang diubah tombol ini.
    // Berbeda dari isReady: proses_layout juga butuh ACC customer, jadi isReady baru
    // bernilai true setelah layout disetujui — sementara tombol ini menandai layout_completed.
    const isManualStageComplete = (): boolean => {
        switch (order.stage as OrderStage) {
            case 'proses_layout': return order.layout_completed || Boolean(order.layout_approved_at)
            case 'antrean_produksi': return order.production_ready
            case 'print_press': return order.print_completed
            case 'cutting_jahit': return order.sewing_completed
            case 'packing': return order.packing_completed
            default: return false
        }
    }

    // Bila customer sudah ACC layout, tahap dianggap selesai dan tidak bisa dibatalkan manual.
    const layoutApprovedByCustomer = order.stage === 'proses_layout' && Boolean(order.layout_approved_at)

    // Check if can move to next stage - must complete current stage first
    const canMoveToNextStage = () => {
        const stage = order.stage as OrderStage
        switch (stage) {
            case 'customer_dp_desain':
                return order.dp_desain_verified && getNextStage() !== null
            case 'proses_desain':
                return order.mockup_url !== null && getNextStage() !== null
            case 'proses_layout':
                // ACC customer adalah syarat utama. Tanda selesai manual admin
                // tetap diterima agar order lama tidak terkunci setelah dimundurkan.
                return (Boolean(order.layout_approved_at) || order.layout_completed) && getNextStage() !== null
            case 'dp_produksi':
                // Require invoice AND DP verified to move from DP Produksi
                return order.dp_produksi_verified && orderInvoice !== null && getNextStage() !== null
            case 'antrean_produksi':
                return order.production_ready && getNextStage() !== null
            case 'print_press':
                return order.print_completed && getNextStage() !== null
            case 'cutting_jahit':
                return order.sewing_completed && getNextStage() !== null
            case 'packing':
                return order.packing_completed && getNextStage() !== null
            case 'pelunasan':
                return order.pelunasan_verified && getNextStage() !== null
            case 'pengiriman':
                return order.tracking_number !== null && order.shipped_at !== null
            default:
                return getNextStage() !== null
        }
    }

    // Handle payment verification with auto-kuitansi
    const handleVerifyPayment = async (type: 'dp_desain' | 'dp_produksi' | 'pelunasan', amount?: number) => {
        setLoading(true)
        try {
            const result = await verifyDPPayment(order.id, type, amount)

            if (!result.success) {
                toast.error(result.message)
                return
            }

            toast.success(result.message)
            await syncLatestOrder({ close: true })
        } catch (err) {
            console.error('Verify error:', err)
            toast.error('Gagal verify pembayaran')
        } finally {
            setLoading(false)
        }
    }

    // Handle stage transition with auto-SPK generation
    const handleMoveToNextStage = async () => {
        const nextStage = getNextStage()

        if (!nextStage) return

        // Validate form order filled before moving OUT of antrean_produksi
        if (order.stage === 'antrean_produksi' && !hasFormOrderData(order)) {
            toast.warning('Buat Form Order terlebih dahulu sebelum melanjutkan ke tahap produksi')
            return
        }

        setLoading(true)
        try {
            const result = await moveOrderToNextStage(order.id, order.stage, nextStage)

            if (!result.success) {
                toast.error(result.message)
                return
            }

            if (result.spkGenerated) {
                toast.success('Berhasil pindah stage! SPK otomatis di-generate 🎉')
            } else {
                toast.success('Berhasil pindah stage')
            }

            await syncLatestOrder({ close: true })
        } catch (err) {
            console.error('Move stage error:', err)
            const message = err instanceof Error ? err.message : 'Gagal pindah stage'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    // Mundur satu tahap untuk mengoreksi salah pindah.
    //
    // Sengaja TIDAK menghasilkan efek samping apa pun: SPK, pembayaran, file,
    // dan persetujuan layout dibiarkan apa adanya supaya tidak bentrok dengan
    // data yang sudah tercatat. Hanya posisi stage & waktunya yang diubah.
    const handleMoveToPreviousStage = async () => {
        const previousStage = getPreviousStage()
        if (!previousStage) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    stage: previousStage,
                    stage_entered_at: new Date().toISOString()
                })
                .eq('id', order.id)

            if (error) throw error

            toast.success(`Order dikembalikan ke ${STAGE_LABELS[previousStage]}`)
            setShowMoveBackConfirm(false)
            // Tetap buka modal agar admin bisa langsung melanjutkan koreksi.
            await syncLatestOrder()
        } catch (err) {
            console.error('Move back stage error:', err)
            toast.error('Gagal memindahkan ke stage sebelumnya')
        } finally {
            setLoading(false)
        }
    }

    // Payment status badge
    const getPaymentBadge = (verified: boolean, amount: number) => {
        // Chip status: isi tipis + tepi + titik, supaya status tetap terbaca
        // meski warnanya tidak terlihat. Teks tidak diubah.
        if (verified) {
            return <span className="inline-flex items-center gap-[6px] rounded-full border border-emerald-200 bg-emerald-50 px-[8px] py-[2px] text-sm font-medium text-emerald-700"><span className="h-[6px] w-[6px] rounded-full bg-emerald-500" aria-hidden="true" />✓ Verified</span>
        }
        if (amount > 0) {
            return <span className="inline-flex items-center gap-[6px] rounded-full border border-amber-200 bg-amber-50 px-[8px] py-[2px] text-sm font-medium text-amber-700"><span className="h-[6px] w-[6px] rounded-full bg-amber-500" aria-hidden="true" />Pending</span>
        }
        return <span className="inline-flex items-center gap-[6px] rounded-full border border-slate-200 bg-slate-50 px-[8px] py-[2px] text-sm font-medium text-slate-500"><span className="h-[6px] w-[6px] rounded-full bg-slate-400" aria-hidden="true" />-</span>
    }

    // Handle delete order
    const handleDeleteOrder = async () => {
        setDeleting(true)
        try {
            const result = await deleteOrder(order.id)
            if (!result.success) {
                toast.error(result.message)
                return
            }
            toast.success(result.message)
            setShowDeleteConfirm(false)
            onOrderDeleted?.(order.id)
            onClose()
        } catch (err) {
            console.error('Delete error:', err)
            toast.error('Gagal menghapus order')
        } finally {
            setDeleting(false)
        }
    }

    // Handle archive order
    const handleArchiveOrder = async () => {
        setArchiving(true)
        try {
            const result = await archiveOrder(order.id)
            if (!result.success) {
                toast.error(result.message)
                return
            }
            toast.success(result.message)
            setShowArchiveConfirm(false)
            onOrderDeleted?.(order.id)
            onClose()
        } catch (err) {
            console.error('Archive error:', err)
            toast.error('Gagal mengarsip order')
        } finally {
            setArchiving(false)
        }
    }

    const nextStage = getNextStage()
    const previousStage = getPreviousStage()

    // Salin link dashboard customer (berisi seluruh order customer) agar bisa
    // dikirim ke pelanggan sebagai satu gerbang berbagi link.
    const handleCopyPortalLink = async () => {
        if (!order?.customer?.id) {
            toast.error('Data customer tidak ditemukan')
            return
        }
        const result = await getCustomerPortalLink(order.customer.id)
        if (!result.success || !result.url) {
            toast.error(result.message || 'Gagal membuat link dashboard')
            return
        }
        const link = `${window.location.origin}${result.url}`
        const copied = await copyTextToClipboard(link)
        if (!copied) {
            toast.error('Gagal menyalin link dashboard')
            return
        }
        setPortalLinkCopied(true)
        setTimeout(() => setPortalLinkCopied(false), 2000)
        toast.success('Link dashboard customer disalin')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal — ukuran tetap seperti semula (max-w-2xl / max-h-[90vh]); gulir diringankan dari isi tab */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-2xl m-4 flex flex-col">
                {/* Header */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-[12px] border-b border-slate-200 px-[12px] py-[10px] sm:px-[16px] sm:py-[12px]">
                    {/* Identitas: nama/telepon + chip stage (chip tetap satu baris) */}
                    <div className="flex min-w-0 flex-wrap items-center gap-[12px]">
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-slate-900 truncate">{order.customer?.name}</h2>
                            <p className="text-base text-slate-500 truncate">{order.customer?.phone}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-[10px] py-[4px] text-sm font-medium text-slate-700">
                            <span className={`h-[6px] w-[6px] rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                            {STAGE_LABELS[order.stage]}
                        </span>
                    </div>
                    <div className="flex items-center gap-[8px] ml-auto">
                        <button
                            onClick={handleCopyPortalLink}
                            className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:h-[36px] md:w-[36px]"
                            title="Salin Link Dashboard"
                            aria-label="Salin link dashboard customer"
                        >
                            {portalLinkCopied ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <rect x="9" y="9" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={() => setShowArchiveConfirm(true)}
                            className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:h-[36px] md:w-[36px]"
                            title="Arsipkan Order"
                            aria-label="Arsipkan order"
                        >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 md:h-[36px] md:w-[36px]"
                            title="Hapus Permanen"
                            aria-label="Hapus order permanen"
                        >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                        </button>
                        <button onClick={onClose} className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:h-[36px] md:w-[36px]" aria-label="Tutup">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs - Conditional based on stage */}
                <div className="flex shrink-0 border-b border-slate-200">
                    {/* Detail tab - always show */}
                    <button
                        onClick={() => setActiveTab('detail')}
                        className={`flex-1 whitespace-nowrap px-[6px] py-[12px] text-base transition-colors border-b-2 ${activeTab === 'detail' ? 'text-brand-600 border-brand-600 font-semibold' : 'text-slate-500 border-transparent hover:text-slate-900'}`}
                    >
                        Detail
                    </button>
                    {/* Bayar tab - always show */}
                    <button
                        onClick={() => setActiveTab('payment')}
                        className={`flex-1 whitespace-nowrap px-[6px] py-[12px] text-base transition-colors border-b-2 ${activeTab === 'payment' ? 'text-brand-600 border-brand-600 font-semibold' : 'text-slate-500 border-transparent hover:text-slate-900'}`}
                    >
                        Bayar
                    </button>
                    {/* Form Order tab - show at proses_layout and onwards */}
                    {['proses_layout', 'dp_produksi', 'antrean_produksi', 'print_press', 'cutting_jahit', 'packing', 'pelunasan', 'pengiriman'].includes(order.stage) && (
                        <button
                            onClick={() => setActiveTab('form-order')}
                            className={`flex-1 whitespace-nowrap px-[6px] py-[12px] text-base transition-colors border-b-2 ${activeTab === 'form-order' ? 'text-brand-600 border-brand-600 font-semibold' : 'text-slate-500 border-transparent hover:text-slate-900'}`}
                        >
                            Form Order
                        </button>
                    )}
                    {/* Stage tab - always show */}
                    <button
                        onClick={() => setActiveTab('stage')}
                        className={`flex-1 whitespace-nowrap px-[6px] py-[12px] text-base transition-colors border-b-2 ${activeTab === 'stage' ? 'text-brand-600 border-brand-600 font-semibold' : 'text-slate-500 border-transparent hover:text-slate-900'}`}
                    >
                        Stage
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-[12px] sm:p-[16px]">
                    {/* Detail Tab */}
                    {activeTab === 'detail' && (
                        <div className="space-y-[16px]">
                            {/* Customer Info - Show at early stages */}
                            {['customer_dp_desain', 'proses_desain', 'proses_layout'].includes(order.stage) && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-[12px]">Info Customer</p>
                                    <div className="space-y-[8px]">
                                        <div className="flex items-center gap-[12px]">
                                            <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                                                {order.customer?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-base font-semibold text-slate-900 truncate">{order.customer?.name}</p>
                                                <p className="text-base text-slate-600">{order.customer?.phone}</p>
                                            </div>
                                        </div>
                                        {order.customer?.alamat && (
                                            <p className="text-base text-slate-600 pl-[52px]">
                                                <span className="text-slate-500">Alamat:</span> {order.customer.alamat}
                                            </p>
                                        )}
                                        {order.customer?.kota && (
                                            <p className="text-base text-slate-600">
                                                <span className="text-slate-500">Kota:</span> {order.customer.kota}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mockup Preview - tampilkan gambar + kontrol ganti/hapus di semua tahap */}
                            {order.mockup_url && (
                                <div className="space-y-2">
                                    <input
                                        ref={mockupFileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                                        className="hidden"
                                        onChange={handleMockupFileSelect}
                                    />
                                    <div
                                        className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100 cursor-zoom-in hover:opacity-95 transition-opacity"
                                        onClick={() => setPreviewImage(order.mockup_url)}
                                    >
                                        <Image
                                            src={order.mockup_url || ''}
                                            alt="Mockup Desain"
                                            fill
                                            className="object-contain"
                                        />
                                        {/* Label Badge */}
                                        <div className="absolute top-[8px] left-[8px] rounded-md bg-black/50 px-[8px] py-[4px] text-sm font-medium text-white backdrop-blur-sm">
                                            Mockup Desain
                                        </div>
                                        {/* Kontrol ganti/hapus mockup — bisa dipakai di tahap mana pun */}
                                        <div className="absolute top-[8px] right-[8px] flex items-center gap-[8px]">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    mockupFileInputRef.current?.click()
                                                }}
                                                disabled={loading}
                                                title="Ganti mockup"
                                                aria-label="Ganti mockup"
                                                className="flex min-h-[44px] items-center gap-[6px] rounded-md bg-black/60 px-[10px] text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[32px]"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Ganti
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowDeleteMockupConfirm(true)
                                                }}
                                                disabled={deletingMockup || loading}
                                                title="Hapus mockup"
                                                aria-label="Hapus mockup"
                                                className="flex h-[44px] w-[44px] items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-red-600/90 disabled:cursor-not-allowed disabled:opacity-50 md:h-[32px] md:w-[32px]"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Design Notes */}
                            <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                <p className="mb-[8px] flex items-center gap-[6px] text-sm font-medium uppercase tracking-wide text-slate-500">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Catatan Desain
                                </p>
                                <textarea
                                    value={designNotes}
                                    onChange={(e) => setDesignNotes(e.target.value)}
                                    placeholder="Tambahkan catatan desain..."
                                    className="input resize-none min-h-[88px]"
                                    rows={3}
                                />
                                <button
                                    onClick={async () => {
                                        setSavingNotes(true)
                                        try {
                                            const result = await updateDesignNotes(order.id, designNotes)
                                            if (result.success) {
                                                onOrderUpdated?.({ ...order, design_notes: designNotes || null })
                                                toast.success(result.message)
                                            } else {
                                                toast.error(result.message)
                                            }
                                        } catch {
                                            toast.error('Gagal menyimpan catatan')
                                        } finally {
                                            setSavingNotes(false)
                                        }
                                    }}
                                    disabled={savingNotes}
                                    className="btn-primary mt-[12px] min-h-[44px] md:min-h-[38px]"
                                >
                                    {savingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                                </button>
                            </div>

                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-[12px]">
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="mb-[4px] text-sm font-medium uppercase tracking-wide text-slate-500">Jumlah</p>
                                    <p className="text-2xl font-semibold text-slate-900 text-mono">{order.total_quantity} pcs</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="mb-[4px] text-sm font-medium uppercase tracking-wide text-slate-500">Deadline</p>
                                    <p className="text-2xl font-semibold text-slate-900 text-mono">{formatDate(orderInvoice?.deadline || order.deadline)}</p>
                                </div>
                            </div>

                            {/* Description */}
                            {order.order_description && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="mb-[8px] text-sm font-medium uppercase tracking-wide text-slate-500">Deskripsi Order</p>
                                    <p className="text-base text-slate-700 whitespace-pre-wrap">{order.order_description}</p>
                                </div>
                            )}

                            {/* Size Breakdown */}
                            {order.size_breakdown && Object.keys(order.size_breakdown).length > 0 && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="mb-[12px] text-sm font-medium uppercase tracking-wide text-slate-500">Breakdown Ukuran</p>
                                    <div className="flex flex-wrap gap-[8px]">
                                        {Object.entries(order.size_breakdown).map(([size, qty]) => (
                                            <div key={size} className="min-w-[52px] rounded-md border border-slate-200 bg-slate-50 px-[12px] py-[8px] text-center">
                                                <p className="text-sm text-slate-500">{size}</p>
                                                <p className="text-lg font-semibold text-slate-900 text-mono">{qty}</p>
                                            </div>
                                        ))}
                                        <div className="min-w-[60px] rounded-md border border-slate-300 bg-slate-100 px-[12px] py-[8px] text-center">
                                            <p className="text-sm text-slate-600">Total</p>
                                            <p className="text-lg font-semibold text-slate-900 text-mono">
                                                {Object.values(order.size_breakdown).reduce((a, b) => a + b, 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Production Notes */}
                            {order.production_notes && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="mb-[8px] flex items-center gap-[6px] text-sm font-medium uppercase tracking-wide text-slate-500">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Catatan Produksi
                                    </p>
                                    <p className="text-base text-slate-700 whitespace-pre-wrap">{order.production_notes}</p>
                                </div>
                            )}

                            {/* SPK Number */}
                            {order.spk_number && (
                                <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Nomor SPK</p>
                                        <p className="text-base font-semibold text-slate-900 text-mono">{order.spk_number}</p>
                                    </div>
                                    <FormOrderDownloadButton
                                        order={order}
                                        className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Tab */}
                    {activeTab === 'payment' && (
                        <div className="space-y-[16px]">
                            {/* Invoice Info Card - Show if invoice exists */}
                            {orderInvoice && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <div className="mb-[12px] flex items-center justify-between gap-[8px]">
                                        <div className="flex items-center gap-[8px]">
                                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-lg font-semibold text-slate-900">Invoice</span>
                                        </div>
                                        <span className="inline-flex items-center gap-[6px] rounded-full border border-emerald-200 bg-emerald-50 px-[8px] py-[2px] text-sm font-medium text-emerald-700">
                                            ✓ Dibuat
                                        </span>
                                    </div>
                                    <div className="space-y-[8px]">
                                        <div className="flex justify-between gap-[8px] text-base">
                                            <span className="text-slate-600">No. Invoice</span>
                                            <span className="font-medium text-slate-900 text-mono">{orderInvoice.no_invoice}</span>
                                        </div>
                                        <div className="flex justify-between gap-[8px] text-base">
                                            <span className="text-slate-600">Total Invoice</span>
                                            <span className="font-semibold text-slate-900 text-mono">{formatCurrency(orderInvoice.total)}</span>
                                        </div>
                                        <div className="flex justify-between gap-[8px] text-base">
                                            <span className="text-slate-600">Total Dibayar</span>
                                            <span className="font-semibold text-slate-900 text-mono">
                                                {formatCurrency(order.dp_desain_amount + order.dp_produksi_amount + order.pelunasan_amount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-[8px] border-t border-slate-200 pt-[8px] text-base">
                                            <span className="font-medium text-slate-700">Sisa Tagihan</span>
                                            {(() => {
                                                const totalDibayar = order.dp_desain_amount + order.dp_produksi_amount + order.pelunasan_amount
                                                const sisaTagihan = orderInvoice.total - totalDibayar
                                                return (
                                                    <span className="font-semibold text-slate-900 text-mono">
                                                        {formatCurrency(sisaTagihan)}
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                    <div className="mt-[12px] grid grid-cols-2 gap-[8px]">
                                        <Link
                                            href={`/invoices/${orderInvoice.id}`}
                                            className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                        >
                                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </Link>
                                        <InvoicePreviewButton
                                            invoiceId={orderInvoice.id}
                                            label="Lihat"
                                            className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Create Invoice Button - Show if invoice doesn't exist yet (accessible from any stage) */}
                            {!orderInvoice && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <div className="mb-[12px] flex items-center justify-between gap-[8px]">
                                        <div className="flex items-center gap-[8px]">
                                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-lg font-semibold text-slate-900">Invoice</span>
                                        </div>
                                        <span className="inline-flex items-center gap-[6px] rounded-full border border-amber-200 bg-amber-50 px-[8px] py-[2px] text-sm font-medium text-amber-700">
                                            <span className="h-[6px] w-[6px] rounded-full bg-amber-500" aria-hidden="true" />
                                            Belum dibuat
                                        </span>
                                    </div>
                                    <p className="mb-[12px] text-base text-slate-600">
                                        Invoice bisa dibuat kapan saja, termasuk sebelum design selesai.
                                    </p>
                                    <Link
                                        href={`/invoices/new?order_id=${order.id}`}
                                        className="flex min-h-[44px] w-full items-center justify-center gap-[8px] rounded-md border border-brand-200 bg-brand-50 px-[16px] text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 md:min-h-[38px]"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Buat Invoice
                                    </Link>
                                </div>
                            )}

                            {/* Deposit Desain - Show only at customer_dp_desain stage OR if already verified */}
                            {(order.stage === 'customer_dp_desain' || order.dp_desain_verified) && (
                                <div className={`space-y-[12px] rounded-lg border bg-white p-[16px] ${order.stage === 'customer_dp_desain' ? 'border-amber-200' : 'border-slate-200'}`}>
                                    {order.stage === 'customer_dp_desain' && (
                                        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Tindakan saat ini</p>
                                    )}
                                    <div className="flex items-center justify-between gap-[8px]">
                                        <p className="text-lg font-semibold text-slate-900">Deposit Desain</p>
                                        {getPaymentBadge(order.dp_desain_verified, order.dp_desain_amount)}
                                    </div>

                                    {order.dp_desain_verified ? (
                                        editingDP === 'dp_desain' ? (
                                            <div className="flex gap-[8px]">
                                                <div className="flex-1">
                                                    <CurrencyInput
                                                        value={parseFloat(editDPAmount) || 0}
                                                        onChange={(v) => setEditDPAmount(String(v))}
                                                        showPrefix={false}
                                                        autoFocus
                                                        className="min-h-[44px] md:min-h-[38px]"
                                                    />
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const amount = parseInt(editDPAmount) || 0
                                                        if (amount < 0) { toast.warning('Nominal tidak boleh negatif'); return }
                                                        setSavingCorrection(true)
                                                        try {
                                                            const result = await correctDPPayment(order.id, 'dp_desain', amount)
                                                            if (result.success) { toast.success(result.message); setEditingDP(null); await syncLatestOrder({ close: true }) }
                                                            else { toast.error(result.message) }
                                                        } catch { toast.error('Gagal koreksi') } finally { setSavingCorrection(false) }
                                                    }}
                                                    disabled={savingCorrection}
                                                    className="btn-primary min-h-[44px] md:min-h-[38px]"
                                                >
                                                    {savingCorrection ? '...' : 'Simpan'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingDP(null)}
                                                    className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-[8px]">
                                                <p className="text-2xl font-semibold text-slate-900 text-mono">{formatCurrency(order.dp_desain_amount)}</p>
                                                <button
                                                    onClick={() => { setEditingDP('dp_desain'); setEditDPAmount(String(order.dp_desain_amount)) }}
                                                    className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:h-[32px] md:w-[32px]"
                                                    title="Koreksi nominal"
                                                    aria-label="Koreksi nominal deposit desain"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex gap-[8px]">
                                            <div className="flex-1">
                                                <CurrencyInput
                                                    value={parseInt(dpDesainAmount || String(order.dp_desain_amount || '0')) || 0}
                                                    onChange={(v) => setDpDesainAmount(String(v))}
                                                    placeholder="0"
                                                    className="min-h-[44px] md:min-h-[38px]"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const amount = parseInt(dpDesainAmount) || 0
                                                    if (amount < 0) {
                                                        toast.warning('Nominal tidak boleh negatif')
                                                        return
                                                    }
                                                    await handleVerifyPayment('dp_desain', amount)
                                                }}
                                                disabled={loading}
                                                className="btn-primary min-h-[44px] whitespace-nowrap md:min-h-[38px]"
                                            >
                                                Simpan & Verify
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DP Produksi - Show only at dp_produksi stage OR if already verified */}
                            {(order.stage === 'dp_produksi' || order.dp_produksi_verified) && (
                                <div className={`space-y-[12px] rounded-lg border bg-white p-[16px] ${order.stage === 'dp_produksi' ? 'border-amber-200' : 'border-slate-200'}`}>
                                    {order.stage === 'dp_produksi' && (
                                        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Tindakan saat ini</p>
                                    )}
                                    <div className="flex items-center justify-between gap-[8px]">
                                        <div className="flex items-center gap-[8px]">
                                            <p className="text-lg font-semibold text-slate-900">DP Produksi</p>
                                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        {getPaymentBadge(order.dp_produksi_verified, order.dp_produksi_amount)}
                                    </div>

                                    {order.dp_produksi_verified ? (
                                        editingDP === 'dp_produksi' ? (
                                            <div className="flex gap-[8px]">
                                                <div className="flex-1">
                                                    <CurrencyInput
                                                        value={parseFloat(editDPAmount) || 0}
                                                        onChange={(v) => setEditDPAmount(String(v))}
                                                        showPrefix={false}
                                                        className="min-h-[44px] md:min-h-[38px]"
                                                        autoFocus
                                                    />
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const amount = parseInt(editDPAmount) || 0
                                                        if (amount < 0) { toast.warning('Nominal tidak boleh negatif'); return }
                                                        setSavingCorrection(true)
                                                        try {
                                                            const result = await correctDPPayment(order.id, 'dp_produksi', amount)
                                                            if (result.success) { toast.success(result.message); setEditingDP(null); await syncLatestOrder({ close: true }) }
                                                            else { toast.error(result.message) }
                                                        } catch { toast.error('Gagal koreksi') } finally { setSavingCorrection(false) }
                                                    }}
                                                    disabled={savingCorrection}
                                                    className="btn-primary min-h-[44px] md:min-h-[38px]"
                                                >
                                                    {savingCorrection ? '...' : 'Simpan'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingDP(null)}
                                                    className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-[8px]">
                                                <p className="text-2xl font-semibold text-slate-900 text-mono">{formatCurrency(order.dp_produksi_amount)}</p>
                                                <button
                                                    onClick={() => { setEditingDP('dp_produksi'); setEditDPAmount(String(order.dp_produksi_amount)) }}
                                                    className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:h-[32px] md:w-[32px]"
                                                    title="Koreksi nominal"
                                                    aria-label="Koreksi nominal DP produksi"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            {/* Kalkulator DP Produksi - bantu hitung minimal DP 50% */}
                                            <div className="space-y-[8px] rounded-md border border-slate-200 bg-slate-50 p-[12px]">
                                                <div className="flex justify-between gap-[8px] text-base">
                                                    <span className="text-slate-600">Total Invoice</span>
                                                    <span className="font-semibold text-slate-900 text-mono">{formatCurrency(totalInvoice)}</span>
                                                </div>
                                                <div className="flex justify-between gap-[8px] text-base">
                                                    <span className="text-slate-600">Minimal DP (50%)</span>
                                                    <span className="font-semibold text-slate-900 text-mono">{formatCurrency(dpProduksiMinimal)}</span>
                                                </div>
                                                <div className="flex justify-between gap-[8px] border-t border-slate-200 pt-[8px] text-base">
                                                    <span className="text-slate-600">Sisa setelah DP</span>
                                                    <span className="font-semibold text-slate-900 text-mono">
                                                        {formatCurrency(sisaSetelahDP)}
                                                    </span>
                                                </div>
                                                <div className="flex gap-[8px] pt-[4px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDpProduksiAmount(String(dpProduksiMinimal))}
                                                        disabled={loading}
                                                        className="btn-secondary flex-1 min-h-[44px] md:min-h-[36px]"
                                                    >
                                                        Isi 50% (Minimal)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDpProduksiAmount(String(totalInvoice))}
                                                        disabled={loading}
                                                        className="btn-secondary flex-1 min-h-[44px] md:min-h-[36px]"
                                                    >
                                                        Isi 100%
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-[8px]">
                                                <div className="flex-1">
                                                    <CurrencyInput
                                                        value={parseInt(dpProduksiAmount || String(order.dp_produksi_amount || '0')) || 0}
                                                        onChange={(v) => setDpProduksiAmount(String(v))}
                                                        placeholder="0"
                                                        className="min-h-[44px] md:min-h-[38px]"
                                                    />
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const amount = parseInt(dpProduksiAmount) || 0
                                                        if (amount <= 0) {
                                                            toast.warning('Masukkan nominal DP Produksi')
                                                            return
                                                        }
                                                        await handleVerifyPayment('dp_produksi', amount)
                                                    }}
                                                    disabled={loading}
                                                    className="btn-primary min-h-[44px] whitespace-nowrap md:min-h-[38px]"
                                                >
                                                    Simpan & Verify
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Pelunasan - Show only at pelunasan stage OR if already verified */}
                            {(order.stage === 'pelunasan' || order.pelunasan_verified) && (
                                <div className={`space-y-[12px] rounded-lg border bg-white p-[16px] ${order.stage === 'pelunasan' ? 'border-amber-200' : 'border-slate-200'}`}>
                                    {order.stage === 'pelunasan' && (
                                        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Tindakan saat ini</p>
                                    )}
                                    <div className="flex items-center justify-between gap-[8px]">
                                        <div className="flex items-center gap-[8px]">
                                            <p className="text-lg font-semibold text-slate-900">Pelunasan</p>
                                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        {getPaymentBadge(order.pelunasan_verified, order.pelunasan_amount)}
                                    </div>

                                    {order.pelunasan_verified ? (
                                        editingDP === 'pelunasan' ? (
                                            <div className="flex gap-[8px]">
                                                <div className="flex-1">
                                                    <CurrencyInput
                                                        value={parseFloat(editDPAmount) || 0}
                                                        onChange={(v) => setEditDPAmount(String(v))}
                                                        showPrefix={false}
                                                        className="min-h-[44px] md:min-h-[38px]"
                                                    />
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const amount = parseInt(editDPAmount) || 0
                                                        if (amount < 0) { toast.warning('Nominal tidak boleh negatif'); return }
                                                        setSavingCorrection(true)
                                                        try {
                                                            const result = await correctDPPayment(order.id, 'pelunasan', amount)
                                                            if (result.success) { toast.success(result.message); setEditingDP(null); await syncLatestOrder({ close: true }) }
                                                            else { toast.error(result.message) }
                                                        } catch { toast.error('Gagal koreksi') } finally { setSavingCorrection(false) }
                                                    }}
                                                    disabled={savingCorrection}
                                                    className="btn-primary min-h-[44px] md:min-h-[38px]"
                                                >
                                                    {savingCorrection ? '...' : 'Simpan'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingDP(null)}
                                                    className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-[8px]">
                                                <p className="text-2xl font-semibold text-slate-900 text-mono">{formatCurrency(order.pelunasan_amount)}</p>
                                                <button
                                                    onClick={() => { setEditingDP('pelunasan'); setEditDPAmount(String(order.pelunasan_amount)) }}
                                                    className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:h-[32px] md:w-[32px]"
                                                    title="Koreksi nominal"
                                                    aria-label="Koreksi nominal pelunasan"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex gap-[8px]">
                                            <div className="flex-1">
                                                <CurrencyInput
                                                    value={parseInt(pelunasanAmount || String(order.pelunasan_amount || '0')) || 0}
                                                    onChange={(v) => setPelunasanAmount(String(v))}
                                                    placeholder="0"
                                                    className="min-h-[44px] md:min-h-[38px]"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const amount = parseInt(pelunasanAmount) || 0
                                                    if (amount <= 0) {
                                                        toast.warning('Masukkan nominal Pelunasan')
                                                        return
                                                    }
                                                    await handleVerifyPayment('pelunasan', amount)
                                                }}
                                                disabled={loading}
                                                className="btn-primary min-h-[44px] whitespace-nowrap md:min-h-[38px]"
                                            >
                                                Simpan & Verify
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total */}
                            <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Total Pembayaran</p>
                                <p className="mt-[4px] text-2xl font-semibold text-slate-900 text-mono">
                                    {formatCurrency(order.dp_desain_amount + order.dp_produksi_amount + order.pelunasan_amount)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stage Tab */}
                    {activeTab === 'stage' && (
                        <div className="space-y-[16px]">
                            {/* Yang perlu dikerjakan & tahap berikutnya digabung agar ringkas */}
                            <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                <div className="flex items-center justify-between gap-[12px]">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Yang Perlu Dikerjakan</p>
                                        <p className="text-lg font-semibold text-slate-900">
                                            {stageReadiness?.action}
                                        </p>
                                        {isManualStage && (layoutApprovedByCustomer || isManualStageComplete()) && (
                                            <p className="mt-[2px] text-sm text-slate-500">
                                                {layoutApprovedByCustomer ? 'Otomatis dari ACC layout customer' : 'Sudah ditandai selesai'}
                                            </p>
                                        )}
                                    </div>
                                    {isManualStage && nextStage ? (
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={layoutApprovedByCustomer || isManualStageComplete()}
                                            aria-label="Tandai tahap selesai"
                                            onClick={async () => {
                                                setLoading(true)
                                                try {
                                                    const stage = order.stage as OrderStage
                                                    let updateField = ''
                                                    let timestampField = ''
                                                    let currentValue = false

                                                    switch (stage) {
                                                        case 'proses_layout':
                                                            updateField = 'layout_completed'
                                                            timestampField = 'layout_completed_at'
                                                            currentValue = order.layout_completed
                                                            break
                                                        case 'antrean_produksi':
                                                            updateField = 'production_ready'
                                                            timestampField = 'production_ready_at'
                                                            currentValue = order.production_ready
                                                            break
                                                        case 'print_press':
                                                            updateField = 'print_completed'
                                                            timestampField = 'print_completed_at'
                                                            currentValue = order.print_completed
                                                            break
                                                        case 'cutting_jahit':
                                                            updateField = 'sewing_completed'
                                                            timestampField = 'sewing_completed_at'
                                                            currentValue = order.sewing_completed
                                                            break
                                                        case 'packing':
                                                            updateField = 'packing_completed'
                                                            timestampField = 'packing_completed_at'
                                                            currentValue = order.packing_completed
                                                            break
                                                    }

                                                    const newValue = !currentValue
                                                    const updateData: Record<string, boolean | string | null> = {
                                                        [updateField]: newValue,
                                                        [timestampField]: newValue ? new Date().toISOString() : null
                                                    }

                                                    const { error } = await supabase
                                                        .from('orders')
                                                        .update(updateData)
                                                        .eq('id', order.id)

                                                    if (error) throw error
                                                    // Refresh di tempat tanpa menutup modal agar admin
                                                    // bisa lanjut kerja tanpa membuka order lagi.
                                                    await syncLatestOrder()
                                                } catch (err) {
                                                    console.error('Toggle stage error:', err)
                                                    toast.error('Gagal mengupdate status')
                                                } finally {
                                                    setLoading(false)
                                                }
                                            }}
                                            disabled={loading || layoutApprovedByCustomer}
                                            className={`relative h-[28px] w-[44px] shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60 ${(layoutApprovedByCustomer || isManualStageComplete()) ? 'bg-emerald-500' : 'bg-slate-300'
                                                }`}
                                        >
                                            <span className={`absolute top-[4px] left-[4px] h-[20px] w-[20px] rounded-full bg-white shadow transition-transform ${(layoutApprovedByCustomer || isManualStageComplete()) ? 'translate-x-[16px]' : ''
                                                }`} />
                                        </button>
                                    ) : (
                                        <span className={`inline-flex shrink-0 items-center gap-[6px] rounded-full border px-[8px] py-[2px] text-sm font-medium ${isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                            <span className={`h-[6px] w-[6px] rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                                            {stageReadiness?.label}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Invoice & DP Status Checklist for dp_produksi stage */}
                            {order.stage === 'dp_produksi' && (
                                <div className="space-y-[8px]">
                                    {/* Invoice Status Row */}
                                    <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-lg border border-slate-200 bg-white p-[16px]">
                                        <div className="flex min-w-0 items-center gap-[8px]">
                                            {orderInvoice ? (
                                                <svg className="w-5 h-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            <span className="text-lg font-semibold text-slate-900">
                                                Invoice
                                            </span>
                                            {orderInvoice && (
                                                <span className="truncate text-base text-slate-500 text-mono">{orderInvoice.no_invoice}</span>
                                            )}
                                        </div>
                                        {orderInvoice ? (
                                            /* Dua tombol dibungkus satu grup: kalau tidak muat (mis. layar 360 px), grup turun
                                               utuh ke baris berikutnya di dalam kartu — bukan melipat atau terpotong. */
                                            <div className="ml-auto flex shrink-0 gap-[8px]">
                                                <Link
                                                    href={`/invoices/${orderInvoice.id}`}
                                                    className="btn-secondary min-h-[44px] md:min-h-[36px]"
                                                >
                                                    Edit
                                                </Link>
                                                <InvoicePreviewButton
                                                    invoiceId={orderInvoice.id}
                                                    label="Lihat"
                                                    className="btn-secondary min-h-[44px] md:min-h-[36px]"
                                                />
                                            </div>
                                        ) : (
                                            <Link
                                                href={`/invoices/new?order_id=${order.id}`}
                                                className="btn-secondary min-h-[44px] md:min-h-[36px]"
                                            >
                                                + Buat
                                            </Link>
                                        )}
                                    </div>

                                    {/* DP Produksi Status Row */}
                                    <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-lg border border-slate-200 bg-white p-[16px]">
                                        <div className="flex items-center gap-[8px]">
                                            {order.dp_produksi_verified ? (
                                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            )}
                                            <span className="text-lg font-semibold text-slate-900">
                                                DP Produksi
                                            </span>
                                        </div>
                                        <span className={`inline-flex shrink-0 items-center gap-[6px] rounded-full border px-[8px] py-[2px] text-sm font-medium ${order.dp_produksi_verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                            <span className={`h-[6px] w-[6px] rounded-full ${order.dp_produksi_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                                            {order.dp_produksi_verified ? '✓ Verified' : 'Belum diverifikasi'}
                                        </span>
                                    </div>

                                    {/* Form Order Status Row */}
                                    {(() => {
                                        const hasFormOrder = hasFormOrderData(order)
                                        return (
                                            <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-lg border border-slate-200 bg-white p-[16px]">
                                                <div className="flex items-center gap-[8px]">
                                                    {hasFormOrder ? (
                                                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                    )}
                                                    <span className="text-lg font-semibold text-slate-900">
                                                        Form Order
                                                    </span>
                                                </div>
                                                <span className={`inline-flex shrink-0 items-center gap-[6px] rounded-full border px-[8px] py-[2px] text-sm font-medium ${hasFormOrder ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                    <span className={`h-[6px] w-[6px] rounded-full ${hasFormOrder ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                                                    {hasFormOrder ? '✓ Sudah diisi' : 'Belum diisi'}
                                                </span>
                                            </div>
                                        )
                                    })()}

                                    {/* Help text */}
                                    {(() => {
                                        if (orderInvoice && order.dp_produksi_verified && hasFormOrderData(order)) return null
                                        return (
                                            <p className="py-[8px] text-center text-base text-slate-500">
                                                {!orderInvoice ? 'Buat Invoice terlebih dahulu' :
                                                    !order.dp_produksi_verified ? 'Verifikasi DP di Tab Bayar' :
                                                        'Isi Form Order di Tab Form Order untuk melanjutkan'}
                                            </p>
                                        )
                                    })()}
                                </div>
                            )}


                            {/* Layout Section - Show from proses_layout onwards */}
                            {['proses_layout', 'dp_produksi', 'antrean_produksi', 'print_press', 'cutting_jahit', 'packing', 'pelunasan', 'pengiriman'].includes(order.stage) && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <div className="mb-[12px] flex items-center justify-between gap-[8px]">
                                        <div className="flex items-center gap-[8px]">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            <p className="text-lg font-semibold text-slate-900">
                                                File Layout
                                            </p>
                                        </div>
                                        {(layoutFiles.some((file) => file.status === 'ready') || order.layout_url) && (
                                            <span className="inline-flex shrink-0 items-center gap-[6px] rounded-full border border-emerald-200 bg-emerald-50 px-[8px] py-[2px] text-sm font-medium text-emerald-700">
                                                <span className="h-[6px] w-[6px] rounded-full bg-emerald-500" aria-hidden="true" />
                                                ✓ Tersimpan
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-[8px]">
                                        {layoutFilesLoading ? <p className="text-base text-slate-500">Memuat file layout...</p> : layoutFiles.map((file) => (
                                            <div key={file.id} className="flex flex-wrap items-center gap-[8px] rounded-md border border-slate-200 bg-slate-50 px-[12px] py-[10px]">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-base font-medium text-slate-800">{file.originalName}</p>
                                                    <p className="text-sm text-slate-500">{formatFileSize(file.sizeBytes)} · {file.status === 'ready' ? 'Tersedia' : file.status === 'uploading' ? 'Sedang diupload' : file.status === 'missing' ? 'Tidak ditemukan di R2' : file.status === 'failed' ? 'Gagal diupload' : 'Tidak tersedia'}</p>
                                                </div>
                                                {file.status === 'ready' && <>
                                                    <button onClick={() => void openLayoutFile(file, false)} disabled={layoutBusy !== null} className="btn-secondary min-h-[44px] md:min-h-[36px]">Buka</button>
                                                    <button onClick={() => void openLayoutFile(file, true)} disabled={layoutBusy !== null} className="btn-secondary min-h-[44px] md:min-h-[36px]">Download</button>
                                                    <button onClick={() => void handleCopyLayoutLink(file)} disabled={layoutBusy !== null} className="btn-secondary min-h-[44px] md:min-h-[36px]">Salin Link</button>
                                                    <button onClick={() => setLayoutFileToDelete(file)} disabled={layoutBusy !== null} className="btn-secondary min-h-[44px] text-slate-600 hover:text-red-600 md:min-h-[36px]">Hapus</button>
                                                </>}
                                            </div>
                                        ))}
                                        {!layoutFilesLoading && layoutFiles.length === 0 && !order.layout_url && <p className="text-base text-slate-500 italic">Belum ada file</p>}
                                        {!layoutFilesLoading && layoutFiles.length === 0 && order.layout_url && (
                                            <div className="flex flex-wrap items-center gap-[8px] rounded-md border border-slate-200 bg-slate-50 px-[12px] py-[10px]">
                                                <p className="flex-1 text-base text-slate-600">File Layout Lama (Google Drive)</p>
                                                <a href={order.layout_url} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-[44px] md:min-h-[36px]">Buka File</a>
                                            </div>
                                        )}
                                        <>
                                            <input ref={layoutFileInputRef} type="file" className="hidden" onChange={(event) => void handleLayoutFileSelect(event)} />
                                            <button onClick={() => layoutFileInputRef.current?.click()} disabled={layoutBusy === 'upload' || !order.brand_id} className="btn-secondary w-full min-h-[44px] md:min-h-[38px]">{layoutFiles.length > 0 ? 'Ganti File' : 'Upload File Layout'}</button>
                                            {layoutUploadProgress !== null && <div><div className="mb-[4px] flex justify-between text-sm text-slate-500"><span>Status upload</span><span className="text-mono">{layoutUploadProgress}%</span></div><div className="h-[8px] overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${layoutUploadProgress}%` }} /></div></div>}
                                        </>
                                    </div>

                                    {/* Legacy Google Drive input retired; the saved link remains as a read-only fallback above.
                                        VIEW MODE - Link sudah tersimpan
                                        <div className="flex gap-2">
                                            <a
                                                href={legacyOrder.layout_url || undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                Buka di Google Drive
                                            </a>
                                            Delete button - only on proses_layout
                                            {legacyOrder.stage === 'proses_layout' && (
                                                <button
                                                    onClick={() => setShowDeleteLayoutLinkConfirm(true)}
                                                    className="px-3 py-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Hapus Link"
                                                    aria-label="Hapus link layout"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ) : legacyOrder.stage === 'proses_layout' ? (
                                        EDIT MODE - Belum ada link (only on proses_layout)
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="url"
                                                    id="layout-drive-link"
                                                    placeholder="Paste link Google Drive..."
                                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const input = document.getElementById('layout-drive-link') as HTMLInputElement
                                                    const link = input?.value?.trim()

                                                    if (!link) {
                                                        toast.warning('Masukkan link Google Drive')
                                                        return
                                                    }

                                                    // Simple validation for Google Drive links
                                                    if (!link.includes('drive.google.com') && !link.includes('docs.google.com')) {
                                                        toast.warning('Link harus dari Google Drive')
                                                        return
                                                    }

                                                    try {
                                                        setLoading(true)
                                                        const { error } = await supabase
                                                            .from('orders')
                                                            .update({
                                                                layout_url: link,
                                                                layout_completed: true,
                                                                layout_completed_at: new Date().toISOString()
                                                            } as any)
                                                            .eq('id', legacyOrder.id)

                                                        if (error) throw error
                                                        toast.success('Link layout berhasil disimpan!')
                                                        await syncLatestOrder({ close: true })
                                                    } catch (err) {
                                                        console.error('Error saving layout link:', err)
                                                        toast.error('Gagal menyimpan link')
                                                    } finally {
                                                        setLoading(false)
                                                    }
                                                }}
                                                disabled={loading}
                                                className="px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        No link, not in proses_layout - show info
                                        <p className="text-xs text-slate-400 italic">Belum ada link layout</p>
                                    */}
                                </div>
                            )}

                            {/* Gambar Layout — pratinjau yang di-ACC customer di portal */}
                            {['proses_layout', 'antrean_produksi', 'print_press', 'cutting_jahit', 'packing', 'pelunasan', 'pengiriman'].includes(order.stage) && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <div className="mb-[12px] flex items-center justify-between gap-[8px]">
                                        <div className="flex items-center gap-[8px]">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-lg font-semibold text-slate-900">
                                                Gambar Layout (ACC Customer)
                                            </p>
                                        </div>
                                        {order.layout_approved_at ? (
                                            <span className="inline-flex shrink-0 items-center gap-[6px] rounded-full border border-emerald-200 bg-emerald-50 px-[8px] py-[2px] text-sm font-medium text-emerald-700"><span className="h-[6px] w-[6px] rounded-full bg-emerald-500" aria-hidden="true" />✓ Disetujui</span>
                                        ) : order.layout_preview_url ? (
                                            <span className="inline-flex shrink-0 items-center gap-[6px] rounded-full border border-amber-200 bg-amber-50 px-[8px] py-[2px] text-sm font-medium text-amber-700"><span className="h-[6px] w-[6px] rounded-full bg-amber-500" aria-hidden="true" />Menunggu ACC</span>
                                        ) : (
                                            <span className="inline-flex shrink-0 items-center gap-[6px] rounded-full border border-slate-200 bg-slate-50 px-[8px] py-[2px] text-sm font-medium text-slate-500"><span className="h-[6px] w-[6px] rounded-full bg-slate-400" aria-hidden="true" />Belum ada</span>
                                        )}
                                    </div>

                                    <p className="mb-[12px] text-base text-slate-500">
                                        Tampil di portal untuk ACC customer · JPG atau PNG
                                    </p>

                                    {order.layout_preview_url && (
                                        <div className="relative mb-[12px] h-40 w-full overflow-hidden rounded-md bg-slate-50">
                                            <div
                                                className="absolute inset-0 cursor-zoom-in hover:opacity-95 transition-opacity"
                                                onClick={() => setPreviewImage(order.layout_preview_url)}
                                            >
                                                <Image src={order.layout_preview_url} alt="Gambar layout" fill className="object-contain" />
                                            </div>
                                            <div className="absolute top-[8px] right-[8px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteLayoutPreviewConfirm(true)}
                                                    disabled={deletingLayoutPreview || loading}
                                                    title="Hapus gambar layout"
                                                    aria-label="Hapus gambar layout"
                                                    className="flex h-[44px] w-[44px] items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-red-600/90 disabled:cursor-not-allowed disabled:opacity-50 md:h-[32px] md:w-[32px]"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <ImageDropzone
                                        onFileSelect={handleLayoutPreviewUpload}
                                        onError={(message) => toast.error(message)}
                                        disabled={loading}
                                        label={order.layout_preview_url ? 'Ganti gambar layout' : 'Upload gambar layout'}
                                    />
                                </div>
                            )}

                            {/* Design Gatekeeper Warning for proses_desain */}
                            {order.stage === 'proses_desain' && !order.mockup_url && (
                                <div className="flex items-center gap-[12px] rounded-lg border border-amber-200 bg-amber-50 p-[16px]">
                                    <svg className="w-6 h-6 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-amber-800">Desain belum diupload</p>
                                        <p className="text-base text-slate-600">Upload desain final untuk pindah ke DP Produksi</p>
                                    </div>
                                </div>
                            )}

                            {/* Status respons customer dari portal */}
                            {order.layout_approved_at && (
                                <div className="flex items-center gap-[12px] rounded-lg border border-emerald-200 bg-emerald-50 p-[16px]">
                                    <svg className="w-6 h-6 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-emerald-700">Layout disetujui customer</p>
                                        <p className="text-base text-slate-600">
                                            Via portal · {formatDateCompact(order.layout_approved_at)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!order.layout_approved_at && order.layout_revision_requested_at && (
                                <div className="flex items-center gap-[12px] rounded-lg border border-amber-200 bg-amber-50 p-[16px]">
                                    <svg className="w-6 h-6 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.5 0L3.16 16.25A2 2 0 005 19z" />
                                    </svg>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-amber-800">Customer meminta revisi layout</p>
                                        <p className="text-base text-slate-600">
                                            {order.layout_revision_note || 'Tanpa catatan'} • {formatDate(order.layout_revision_requested_at)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Upload desain final hanya di tahap desain. Di tahap lanjutan,
                                mockup bisa diganti lewat kontrol di tab Detail. */}
                            {order.stage === 'proses_desain' && (
                                <div className="space-y-[12px] rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="text-lg font-semibold text-slate-900">Upload Desain Final</p>

                                    {order.mockup_url && (
                                        <div className="relative h-40 w-full overflow-hidden rounded-md bg-slate-50">
                                            <div
                                                className="absolute inset-0 cursor-zoom-in hover:opacity-95 transition-opacity"
                                                onClick={() => setPreviewImage(order.mockup_url)}
                                            >
                                                <Image src={order.mockup_url} alt="Desain" fill className="object-contain" />
                                            </div>
                                            <div className="absolute top-[8px] right-[8px] flex items-center gap-[8px]">
                                                <span className="inline-flex items-center gap-[6px] rounded-full border border-emerald-200 bg-emerald-50 px-[8px] py-[2px] text-sm font-medium text-emerald-700">
                                                    <span className="h-[6px] w-[6px] rounded-full bg-emerald-500" aria-hidden="true" />
                                                    ✓ Uploaded
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteMockupConfirm(true)}
                                                    disabled={deletingMockup || loading}
                                                    title="Hapus desain"
                                                    aria-label="Hapus desain"
                                                    className="flex h-[44px] w-[44px] items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-red-600/90 disabled:cursor-not-allowed disabled:opacity-50 md:h-[32px] md:w-[32px]"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <ImageDropzone
                                        onFileSelect={handleMockupUpload}
                                        onError={(message) => toast.error(message)}
                                        disabled={loading}
                                        label={order.mockup_url ? 'Ganti desain final' : 'Upload desain final'}
                                    />
                                </div>
                            )}

                            {/* Gatekeeper Warning */}
                            {(order.stage === 'dp_produksi' && !order.dp_produksi_verified) && (
                                <div className="flex items-center gap-[12px] rounded-lg border border-amber-200 bg-amber-50 p-[16px]">
                                    <svg className="w-6 h-6 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-amber-800">DP Produksi belum diverifikasi</p>
                                        <p className="text-base text-slate-600">Verifikasi pembayaran DP 50% terlebih dahulu</p>
                                    </div>
                                </div>
                            )}

                            {(order.stage === 'pelunasan' && !order.pelunasan_verified) && (
                                <div className="flex items-center gap-[12px] rounded-lg border border-amber-200 bg-amber-50 p-[16px]">
                                    <svg className="w-6 h-6 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-amber-800">Pelunasan belum diverifikasi</p>
                                        <p className="text-base text-slate-600">Verifikasi pembayaran penuh terlebih dahulu</p>
                                    </div>
                                </div>
                            )}

                            {/* Tracking Number Input for Pengiriman Stage */}
                            {order.stage === 'pengiriman' && (
                                <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
                                    <p className="mb-[8px] text-lg font-semibold text-slate-900">No. Resi / Tracking Number</p>
                                    <div className="flex gap-[8px]">
                                        <input
                                            type="text"
                                            value={trackingNumber}
                                            onChange={(e) => setTrackingNumber(e.target.value)}
                                            placeholder="JNE123456789"
                                            className="input flex-1 font-mono min-h-[44px] md:min-h-[38px]"
                                        />
                                        <button
                                            onClick={handleSaveTrackingNumber}
                                            disabled={loading || !trackingNumber.trim()}
                                            className="btn-primary min-h-[44px] md:min-h-[38px]"
                                        >
                                            {loading ? 'Saving...' : 'Simpan'}
                                        </button>
                                    </div>
                                    {order.shipped_at && (
                                        <p className="mt-[8px] text-base font-medium text-emerald-600">
                                            ✓ Dikirim: {new Date(order.shipped_at).toLocaleDateString('id-ID')}
                                        </p>
                                    )}
                                    {!order.tracking_number && (
                                        <p className="mt-[8px] text-base text-amber-600">
                                            Isi no resi dan klik Simpan untuk menandai pesanan sudah dikirim
                                        </p>
                                    )}
                                </div>
                            )}



                            {/* Aksi perpindahan tahap */}
                            {(nextStage || previousStage) && (
                                <div className="space-y-[4px] pt-[4px]">
                                    {nextStage && (
                                        <>
                                            <button
                                                onClick={handleMoveToNextStage}
                                                disabled={loading || !canMoveToNextStage()}
                                                className="flex min-h-[52px] w-full items-center justify-center gap-[8px] rounded-md bg-brand-600 px-[16px] text-base font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                                {loading ? (
                                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                ) : (
                                                    <>
                                                        Pindah ke {STAGE_LABELS[nextStage]}
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}

                                    {previousStage && (
                                        <button
                                            onClick={() => setShowMoveBackConfirm(true)}
                                            disabled={loading}
                                            className="flex min-h-[44px] w-full items-center justify-center gap-[6px] rounded-md text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                            </svg>
                                            Kembali ke {STAGE_LABELS[previousStage]}
                                        </button>
                                    )}
                                </div>
                            )}

                            {order.stage === 'pengiriman' && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-[16px] text-center">
                                    <p className="text-base font-semibold text-emerald-700">🎉 Order sudah di tahap akhir!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Form Order Tab */}
                    {activeTab === 'form-order' && (
                        <div className="space-y-[16px]">
                            <FormOrderEditor
                                order={order}
                                onSave={async (data) => {
                                    try {
                                        const specs = data.production_specs
                                        // Update total_quantity from jumlah_produksi
                                        const totalQty = specs.jumlah_produksi || 0
                                        const payload: Record<string, unknown> = {
                                            production_specs: specs,
                                            // Update total_quantity from form order
                                            total_quantity: totalQty > 0 ? totalQty : order.total_quantity,
                                        }
                                        // Jangan kirim null bila kolom nama_po tidak ada nilainya
                                        if (order.nama_po) payload.nama_po = order.nama_po

                                        const { error } = await supabase
                                            .from('orders')
                                            .update(payload)
                                            .eq('id', order.id)

                                        if (error) throw error
                                        toast.success('Form order berhasil disimpan!')
                                        await syncLatestOrder({ close: true })
                                    } catch (err) {
                                        console.error('Save form order error:', err)
                                        const message = err instanceof Error ? err.message : 'Kesalahan tidak diketahui'
                                        toast.error(`Gagal menyimpan form order: ${message}`)
                                        throw err
                                    }
                                }}
                                isLoading={loading}
                            />

                            {/* Print Form Order Button */}
                            {hasFormOrderData(order) && (
                                <div className="border-t border-slate-200 pt-[16px]">
                                    <FormOrderDownloadButton
                                        order={order}
                                        className="btn-secondary min-h-[44px] md:min-h-[38px]"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Image Preview Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 z-[101] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                        onClick={() => setPreviewImage(null)}
                        aria-label="Tutup pratinjau"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="relative w-full h-full max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <Image
                            src={previewImage}
                            alt="Preview"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            )}

            {/* Move Back Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showMoveBackConfirm}
                onClose={() => setShowMoveBackConfirm(false)}
                onConfirm={handleMoveToPreviousStage}
                title={`Kembalikan ke ${previousStage ? STAGE_LABELS[previousStage] : 'tahap sebelumnya'}?`}
                description="Order akan dipindah ke tahap sebelumnya. Pembayaran, SPK, file, dan persetujuan yang sudah ada tetap tersimpan."
                confirmText="Ya, Kembalikan"
                tone="brand"
                loading={loading}
                icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                }
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteOrder}
                title="Hapus Permanen?"
                description={`Semua data transaksi khusus untuk order ${order.customer?.name ?? ''} akan dihapus dan tidak dapat dipulihkan — termasuk invoice, item invoice, kuitansi, pembayaran terkait, dan file layout R2 milik order ini.`}
                confirmText="Hapus Permanen"
                loading={deleting}
                icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                }
            />

            {/* Archive Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                onConfirm={handleArchiveOrder}
                title="Arsipkan Order?"
                description="Order akan dikeluarkan dari proses aktif, tetapi invoice, kuitansi, pembayaran, dan riwayat order tetap tersimpan. Anda dapat memulihkannya kapan saja dari halaman Riwayat Order."
                confirmText="Ya, Arsipkan"
                tone="brand"
                loading={archiving}
                icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                }
            />

            {/* Konfirmasi hapus file layout */}
            <ConfirmDialog
                isOpen={layoutFileToDelete !== null}
                onClose={() => {
                    if (!layoutBusy) setLayoutFileToDelete(null)
                }}
                onConfirm={async () => {
                    if (!layoutFileToDelete) return
                    await deleteLayoutFile(layoutFileToDelete)
                    setLayoutFileToDelete(null)
                }}
                title="Hapus File Layout"
                description={layoutFileToDelete ? `Hapus file "${layoutFileToDelete.originalName}"?` : undefined}
                confirmText="Hapus"
                loading={layoutBusy !== null}
            />

            {/* Konfirmasi hapus link layout lama */}
            <ConfirmDialog
                isOpen={showDeleteLayoutLinkConfirm}
                onClose={() => setShowDeleteLayoutLinkConfirm(false)}
                onConfirm={async () => {
                    setShowDeleteLayoutLinkConfirm(false)
                    await deleteLayoutLink(order.id)
                }}
                title="Hapus Link Layout"
                description="Hapus link layout ini?"
                confirmText="Hapus"
            />

            {/* Konfirmasi hapus desain final */}
            <ConfirmDialog
                isOpen={showDeleteMockupConfirm}
                onClose={() => setShowDeleteMockupConfirm(false)}
                onConfirm={handleDeleteMockup}
                title="Hapus Desain Final?"
                description="File akan dihapus permanen dan order dianggap belum punya desain."
                confirmText="Ya, Hapus"
                loading={deletingMockup}
            />

            {/* Konfirmasi hapus gambar layout */}
            <ConfirmDialog
                isOpen={showDeleteLayoutPreviewConfirm}
                onClose={() => setShowDeleteLayoutPreviewConfirm(false)}
                onConfirm={handleDeleteLayoutPreview}
                title="Hapus Gambar Layout?"
                description="Gambar pratinjau layout akan dihapus permanen dan customer tidak bisa lagi melihat layout ini di portal."
                confirmText="Ya, Hapus"
                loading={deletingLayoutPreview}
            />
        </div >
    )
}
