'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateAttendance, deleteAttendance } from '../actions'
import { toast } from 'sonner'
import { ConfirmDialog, SelectBox } from '@/components/ui'
import { PageHeader, EmptyState, DefaultEmptyIcon } from '@/components/ui/ds'

interface AttendanceLog {
    id: string
    employee_id: string
    date: string
    check_in: string
    check_out: string | null
    effective_hours: number | null
    overtime_hours: number
    overtime_type: string | null
    deficit_hours: number
    forgot_checkout: boolean
    employee: {
        full_name: string
        nik: string
        department: string
    }
}

export default function CorrectionsList({ logs }: { logs: AttendanceLog[] }) {
    const router = useRouter()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    // Tipe lembur untuk baris yang sedang diedit (SelectBox tidak ikut FormData)
    const [overtimeType, setOvertimeType] = useState('')
    // Record absensi yang menunggu konfirmasi hapus
    const [pendingDelete, setPendingDelete] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)

    const handleEdit = (log: AttendanceLog) => {
        setEditingId(log.id)
        setOvertimeType(log.overtime_type || '')
    }

    const handleSave = async (e: React.FormEvent<HTMLFormElement>, logId: string) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await updateAttendance(logId, formData)

        if (result.success) {
            toast.success('Absensi berhasil dikoreksi!')
            setEditingId(null)
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal update absensi')
        }

        setLoading(false)
    }

    const handleDelete = async () => {
        if (!pendingDelete) return

        setProcessing(true)
        const result = await deleteAttendance(pendingDelete)

        if (result.success) {
            toast.success('Absensi berhasil dihapus!')
            router.refresh()
        } else {
            toast.error(result.error || 'Gagal hapus absensi')
        }

        setProcessing(false)
        setPendingDelete(null)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatTime = (timestamp: string | null) => {
        if (!timestamp) return '-'
        return new Date(timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Koreksi Absensi"
                description="Edit atau hapus record absensi (Owner only)"
            />

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Record Absensi (30 Hari Terakhir)
                </h2>

                {logs.length > 0 ? (
                    <div className="space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                {editingId === log.id ? (
                                    <form onSubmit={(e) => handleSave(e, log.id)} className="space-y-3">
                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Check In</label>
                                                <input
                                                    type="datetime-local"
                                                    name="check_in"
                                                    required
                                                    defaultValue={log.check_in.slice(0, 16)}
                                                    className="w-full px-2 py-1 text-sm rounded border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Check Out</label>
                                                <input
                                                    type="datetime-local"
                                                    name="check_out"
                                                    defaultValue={log.check_out?.slice(0, 16) || ''}
                                                    className="w-full px-2 py-1 text-sm rounded border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Overtime Type</label>
                                                {/* Nilai SelectBox dikirim lewat hidden input agar tetap ikut FormData */}
                                                <SelectBox
                                                    options={[
                                                        { value: '', label: 'Normal' },
                                                        { value: 'weekday', label: 'Weekday OT' },
                                                        { value: 'holiday', label: 'Holiday' },
                                                    ]}
                                                    value={overtimeType}
                                                    onChange={setOvertimeType}
                                                    searchable={false}
                                                    size="sm"
                                                    ariaLabel="Tipe lembur"
                                                />
                                                <input type="hidden" name="overtime_type" value={overtimeType} />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 btn-primary btn-sm"
                                                >
                                                    Simpan
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    disabled={loading}
                                                    className="btn-secondary btn-sm"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 grid grid-cols-5 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500">Karyawan</p>
                                                <p className="font-medium text-slate-900">{log.employee.full_name}</p>
                                                <p className="text-xs text-slate-500">{log.employee.nik}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Tanggal</p>
                                                <p className="font-medium text-slate-900">{formatDate(log.date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Jam Masuk</p>
                                                <p className="font-medium text-slate-900">{formatTime(log.check_in)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Jam Pulang</p>
                                                <p className="font-medium text-slate-900">{formatTime(log.check_out)}</p>
                                                {log.forgot_checkout && (
                                                    <span className="text-xs text-brand-600">🤖 Auto</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Efektif / Lembur</p>
                                                <p className="font-medium text-slate-900">
                                                    {log.effective_hours?.toFixed(1) || '-'} / {log.overtime_hours.toFixed(1)}
                                                </p>
                                                {log.deficit_hours > 0 && (
                                                    <span className="text-xs text-amber-600">⚠️ -{log.deficit_hours.toFixed(1)}h</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(log)}
                                                className="p-2 rounded hover:bg-brand-50 text-brand-600 transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setPendingDelete(log.id)}
                                                className="p-2 rounded hover:bg-red-50 text-red-600 transition-colors"
                                                title="Hapus"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        variant="compact"
                        icon={<DefaultEmptyIcon />}
                        title="Tidak ada record absensi"
                    />
                )}
            </div>

            {/* Konfirmasi hapus record absensi */}
            <ConfirmDialog
                isOpen={pendingDelete !== null}
                onClose={() => { if (!processing) setPendingDelete(null) }}
                onConfirm={handleDelete}
                title="Hapus record absensi ini?"
                description="Tindakan ini tidak bisa dibatalkan."
                confirmText="Hapus"
                tone="danger"
                loading={processing}
            />
        </div>
    )
}
