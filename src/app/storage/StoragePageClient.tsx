'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui'
import { PageHeader, EmptyState, DefaultEmptyIcon } from '@/components/ui/ds'

type Connection = {
    connected: boolean
    accountId?: string
    bucketName?: string
    endpoint?: string
    storageLimitBytes?: number | null
    updatedAt?: string
}

type Summary = { usedBytes: number; fileCount: number }
type StorageFile = {
    id: string
    originalName: string
    sizeBytes: number
    orderLabel: string | null
    uploadedAt: string | null
    status: string
}

type FormValues = {
    accountId: string
    bucketName: string
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
    storageLimitGb: string
}

const emptyForm: FormValues = { accountId: '', bucketName: '', accessKeyId: '', secretAccessKey: '', endpoint: '', storageLimitGb: '' }

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

function formatDate(value: string | null) {
    return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Request gagal')
    return body as T
}

export default function StoragePageClient() {
    const [connection, setConnection] = useState<Connection>({ connected: false })
    const [summary, setSummary] = useState<Summary>({ usedBytes: 0, fileCount: 0 })
    const [files, setFiles] = useState<StorageFile[]>([])
    const [form, setForm] = useState<FormValues>(emptyForm)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showConnectionSettings, setShowConnectionSettings] = useState(false)
    const [confirmDisconnect, setConfirmDisconnect] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<StorageFile | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [connectionData, filesData] = await Promise.all([
                request<{ connection: Connection }>('/api/storage/connection'),
                request<{ summary: Summary; files: StorageFile[] }>('/api/storage/files'),
            ])
            setConnection(connectionData.connection)
            setSummary(filesData.summary)
            setFiles(filesData.files)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat halaman penyimpanan file')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void refresh() }, [refresh])

    const updateField = (field: keyof FormValues, value: string) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const openConnectionSettings = () => {
        setShowConnectionSettings(true)
        setNotice(null)
    }

    const testConnection = async () => {
        setBusy('test')
        setNotice(null); setError(null)
        try {
            const connectionPayload = { ...form, storageLimitBytes: form.storageLimitGb ? Math.round(Number(form.storageLimitGb) * 1024 ** 3) : null }
            await request('/api/storage/connection', {
                method: 'POST',
                body: JSON.stringify(connection.connected ? { action: 'testSaved' } : { action: 'test', connection: connectionPayload }),
            })
            setNotice('Penyimpanan file berhasil diuji dan siap digunakan.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Pemeriksaan koneksi gagal')
        } finally {
            setBusy(null)
        }
    }

    const save = async (event: FormEvent) => {
        event.preventDefault()
        setBusy('save')
        setNotice(null); setError(null)
        try {
            const connectionPayload = { ...form, storageLimitBytes: form.storageLimitGb ? Math.round(Number(form.storageLimitGb) * 1024 ** 3) : null }
            const result = await request<{ connection: Connection }>('/api/storage/connection', {
                method: 'POST', body: JSON.stringify({ action: 'save', connection: connectionPayload }),
            })
            setConnection(result.connection)
            setForm(emptyForm)
            setShowConnectionSettings(false)
            setNotice('Penyimpanan file berhasil dihubungkan.')
            await refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan koneksi')
        } finally {
            setBusy(null)
        }
    }

    const disconnect = async () => {
        setConfirmDisconnect(false)
        setBusy('disconnect')
        setNotice(null); setError(null)
        try {
            await request('/api/storage/connection', { method: 'DELETE' })
            setConnection({ connected: false })
            setShowConnectionSettings(false)
            setNotice('Penyimpanan file telah diputus. File yang sudah ada tetap aman.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memutus penyimpanan file')
        } finally {
            setBusy(null)
        }
    }

    const download = async (file: StorageFile) => {
        setBusy(`download-${file.id}`)
        setError(null)
        try {
            const result = await request<{ url: string }>(`/api/storage/files/${file.id}/download`, { method: 'POST' })
            window.location.assign(result.url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal menyiapkan download file')
            await refresh()
        } finally {
            setBusy(null)
        }
    }

    const remove = async () => {
        if (!pendingDelete) return
        const file = pendingDelete
        setPendingDelete(null)
        setBusy(`delete-${file.id}`)
        setError(null)
        try {
            const result = await request<{ summary: Summary }>('/api/storage/files', {
                method: 'DELETE', body: JSON.stringify({ fileId: file.id }),
            })
            setFiles((current) => current.filter((item) => item.id !== file.id))
            setSummary(result.summary)
            setNotice('File telah dihapus.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal menghapus file')
        } finally {
            setBusy(null)
        }
    }

    const scrollToFiles = () => document.getElementById('daftar-file')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const progress = connection.storageLimitBytes ? Math.min(100, (summary.usedBytes / connection.storageLimitBytes) * 100) : 0
    const isNearLimit = Boolean(connection.storageLimitBytes && progress >= 80)

    return (
        <div className="space-y-6">
            <PageHeader
                title="Penyimpanan File"
                description="Simpan file produksi secara aman di cloud."
            />

            {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {!connection.connected ? (
                    <div className="flex flex-wrap items-center justify-between gap-5">
                        <div>
                            <h2 className="font-semibold text-slate-900">Penyimpanan File</h2>
                            <p className="mt-1 text-sm font-medium text-red-600">🔴 Belum Terhubung</p>
                            <p className="mt-3 max-w-xl text-sm text-slate-500">Hubungkan penyimpanan cloud untuk menyimpan file layout dan file produksi.</p>
                        </div>
                        <button onClick={openConnectionSettings} className="btn-primary">
                            Hubungkan Penyimpanan
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="font-semibold text-slate-900">Penyimpanan File</h2>
                                <p className="mt-1 text-sm font-medium text-emerald-600">🟢 Terhubung</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button onClick={scrollToFiles} className="btn-secondary">Kelola File</button>
                                <button onClick={openConnectionSettings} className="btn-secondary">Pengaturan Koneksi</button>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <p className="text-2xl font-bold text-slate-900">{formatBytes(summary.usedBytes)} <span className="text-sm font-medium text-slate-500">terpakai</span></p>
                                <p className="text-sm text-slate-600">{summary.fileCount} file</p>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${isNearLimit ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${progress}%` }} /></div>
                            {connection.storageLimitBytes ? (
                                <p className={`mt-2 text-xs ${isNearLimit ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
                                    {isNearLimit ? `Penyimpanan hampir penuh. ${progress.toFixed(0)}% dari batas ${formatBytes(connection.storageLimitBytes)} sudah digunakan.` : `${progress.toFixed(1)}% dari batas ${formatBytes(connection.storageLimitBytes)} digunakan.`}
                                </p>
                            ) : <p className="mt-2 text-xs text-slate-500">Batas kapasitas belum diatur. Anda dapat mengaturnya pada Pengaturan Koneksi.</p>}
                        </div>
                    </div>
                )}
            </section>

            {showConnectionSettings && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">Pengaturan Koneksi</h2>
                            <p className="mt-1 text-sm text-slate-500">Bagian ini hanya diperlukan saat menghubungkan atau mengganti penyimpanan cloud.</p>
                        </div>
                        <button onClick={() => setShowConnectionSettings(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Tutup</button>
                    </div>

                    {connection.connected && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Penyimpanan saat ini sudah terhubung. Isi seluruh data berikut hanya jika ingin mengganti koneksi.</p>}
                    <form onSubmit={save} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {([
                            ['accountId', 'Account ID', 'text'],
                            ['bucketName', 'Nama Bucket', 'text'],
                            ['accessKeyId', 'Access Key ID', 'text'],
                            ['secretAccessKey', 'Secret Access Key', 'password'],
                            ['endpoint', 'Endpoint', 'url'],
                            ['storageLimitGb', 'Batas Penyimpanan (GB, opsional)', 'number'],
                        ] as Array<[keyof FormValues, string, string]>).map(([field, label, type]) => (
                            <label key={field} className={field === 'endpoint' || field === 'storageLimitGb' ? 'md:col-span-2' : ''}>
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                                <input required={field !== 'storageLimitGb'} type={type} value={form[field]} onChange={(event) => updateField(field, event.target.value)}
                                    placeholder={field === 'endpoint' ? 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com' : field === 'storageLimitGb' ? 'Contoh: 100' : undefined}
                                    autoComplete="off" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                            </label>
                        ))}
                        <div className="flex flex-wrap gap-3 md:col-span-2">
                            {!connection.connected && <button type="button" onClick={testConnection} disabled={busy !== null} className="btn-secondary disabled:opacity-50">{busy === 'test' ? 'Memeriksa…' : 'Test Koneksi'}</button>}
                            <button type="submit" disabled={busy !== null} className="btn-primary disabled:opacity-50">{busy === 'save' ? 'Menyimpan…' : connection.connected ? 'Simpan Koneksi Baru' : 'Simpan'}</button>
                            {connection.connected && <button type="button" onClick={testConnection} disabled={busy !== null} className="btn-secondary disabled:opacity-50">{busy === 'test' ? 'Memeriksa…' : 'Test Koneksi Saat Ini'}</button>}
                            {connection.connected && <button type="button" onClick={() => setConfirmDisconnect(true)} disabled={busy !== null} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{busy === 'disconnect' ? 'Memutuskan…' : 'Putuskan Koneksi'}</button>}
                        </div>
                    </form>
                    <p className="mt-4 text-xs text-slate-400">Teknologi penyimpanan: Cloudflare R2.</p>
                </section>
            )}

            <section id="daftar-file" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Daftar File</h2><button onClick={() => void refresh()} disabled={loading} className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">Refresh</button></div>
                {loading ? <p className="px-5 py-8 text-sm text-slate-500">Memuat file…</p> : files.length === 0 ? <EmptyState variant="compact" icon={<DefaultEmptyIcon />} title="Belum ada file tersimpan" /> : (
                    <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Nama file</th><th className="px-5 py-3">Ukuran</th><th className="px-5 py-3">Order terkait</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">
                        {files.map((file) => <tr key={file.id}><td className="px-5 py-3 font-medium text-slate-900"><p className="max-w-xs truncate">{file.originalName}</p></td><td className="px-5 py-3 text-slate-600">{formatBytes(file.sizeBytes)}</td><td className="px-5 py-3 text-slate-600">{file.orderLabel || '-'}</td><td className="px-5 py-3 text-slate-600">{formatDate(file.uploadedAt)}</td><td className="px-5 py-3"><div className="flex justify-end gap-3"><button onClick={() => void download(file)} disabled={busy !== null || file.status !== 'ready'} className="font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">Download</button><button onClick={() => setPendingDelete(file)} disabled={busy !== null} className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Hapus</button></div></td></tr>)}
                    </tbody></table></div>
                )}
            </section>

            <ConfirmDialog
                isOpen={confirmDisconnect}
                onClose={() => setConfirmDisconnect(false)}
                onConfirm={() => void disconnect()}
                title="Putuskan penyimpanan file?"
                description="File yang sudah tersimpan tidak akan dihapus."
                confirmText="Putuskan"
                tone="danger"
                loading={busy === 'disconnect'}
            />

            <ConfirmDialog
                isOpen={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => void remove()}
                title={pendingDelete ? `Hapus file “${pendingDelete.originalName}”?` : 'Hapus file ini?'}
                description="Order, customer, dan invoice tidak akan dihapus."
                confirmText="Hapus"
                tone="danger"
                loading={busy?.startsWith('delete-') ?? false}
            />
        </div>
    )
}
