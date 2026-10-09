import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDownloadUrl, headObject } from '@/lib/storage/r2'

export const runtime = 'nodejs'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Link publik untuk membagikan file layout.
 *
 * Route ini sengaja diletakkan di bawah /lacak karena prefix itu sudah
 * di-whitelist middleware sebagai akses tanpa login. Identifier memakai UUID
 * file (acak, tidak bisa ditebak) sehingga siapa pun yang punya link bisa
 * membukanya di mana saja. Hanya file layout berstatus ready yang dilayani.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
    const { fileId } = await params
    if (!UUID_PATTERN.test(fileId)) {
        return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    const { data, error } = await createAdminClient()
        .from('r2_files')
        .select('tenant_id, storage_key, original_name, status')
        .eq('id', fileId)
        .maybeSingle()

    const file = data as {
        tenant_id: string
        storage_key: string
        original_name: string
        status: string
    } | null

    // Batasi hanya ke file layout agar endpoint publik tidak mengekspos
    // berkas lain yang mungkin tersimpan di bucket tenant.
    if (error || !file || file.status !== 'ready' || !file.storage_key.includes('/layout/')) {
        return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    try {
        await headObject(file.tenant_id, file.storage_key)
    } catch {
        return NextResponse.json({ error: 'File tidak ditemukan di storage' }, { status: 404 })
    }

    const disposition = request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'
    const url = await getDownloadUrl(file.tenant_id, file.storage_key, file.original_name, disposition)

    // Signed URL hanya berlaku beberapa menit, jadi respons redirect tidak boleh
    // di-cache oleh browser maupun perantara.
    return NextResponse.redirect(url, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
