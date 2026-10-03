-- ============================================================================
-- Persetujuan Layout oleh Customer (revisi alur Customer Portal).
--
-- Sebelumnya yang disetujui customer adalah DESAIN (mockup). Alur diubah:
-- customer menyetujui LAYOUT yang disiapkan admin pada tahap proses_layout.
-- Karena itu admin mengunggah gambar pratinjau layout (layout_preview_url)
-- yang bisa ditampilkan di portal publik; berkas cetak tetap tersimpan di R2.
--
-- Perubahan:
-- 1. Kolom baru: gambar pratinjau layout + jejak persetujuan layout.
-- 2. Kolom jejak persetujuan desain lama dihapus (belum pernah dipakai).
-- 3. get_portal_order diperbarui: mengembalikan data layout, bukan ACC desain.
-- 4. RPC approve/revisi diganti versi layout.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- 1. Kolom baru untuk persetujuan layout.
alter table public.orders add column if not exists layout_preview_url text;
alter table public.orders add column if not exists layout_approved_at timestamptz;
alter table public.orders add column if not exists layout_revision_note text;
alter table public.orders add column if not exists layout_revision_requested_at timestamptz;

-- 2. Kolom persetujuan desain lama tidak dipakai lagi pada alur baru.
alter table public.orders drop column if exists design_approved_at;
alter table public.orders drop column if exists design_revision_note;
alter table public.orders drop column if exists design_revision_requested_at;

-- 3. Baca order untuk portal publik berdasarkan token (versi layout).
--    Mengembalikan satu objek jsonb berisi data yang memang boleh dilihat
--    customer (tanpa kolom internal seperti tenant_id / created_by).
create or replace function public.get_portal_order(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
    v_order public.orders;
    v_customer public.customers;
    v_brand public.brands;
    v_invoice public.invoices;
begin
    if p_token is null or btrim(p_token) = '' then
        return null;
    end if;

    select * into v_order
    from public.orders
    where portal_token = btrim(p_token)
    limit 1;

    if v_order.id is null then
        return null;
    end if;

    select * into v_customer
    from public.customers
    where id = v_order.customer_id;

    if v_order.brand_id is not null then
        select * into v_brand
        from public.brands
        where id = v_order.brand_id;
    end if;

    select * into v_invoice
    from public.invoices
    where order_id = v_order.id
    order by created_at desc
    limit 1;

    return jsonb_build_object(
        'token', v_order.portal_token,
        'orderNumber', coalesce(
            v_invoice.no_invoice,
            v_order.spk_number,
            'ORD-' || substr(v_order.id::text, 1, 8)
        ),
        'orderDescription', coalesce(
            nullif(v_order.order_description, ''),
            v_order.nama_po,
            'Order ' || substr(v_order.id::text, 1, 8)
        ),
        'totalQuantity', v_order.total_quantity,
        'stage', v_order.stage,
        'stageEnteredAt', v_order.stage_entered_at,
        'createdAt', v_order.created_at,
        'deadline', v_order.deadline,
        'mockupUrl', v_order.mockup_url,
        'layoutUrl', v_order.layout_url,
        'layoutPreviewUrl', v_order.layout_preview_url,
        'designNotes', v_order.design_notes,
        'spkNumber', v_order.spk_number,
        'layoutApprovedAt', v_order.layout_approved_at,
        'layoutRevisionNote', v_order.layout_revision_note,
        'layoutRevisionRequestedAt', v_order.layout_revision_requested_at,
        'customer', jsonb_build_object(
            'name', v_customer.name,
            'phone', v_customer.phone,
            'alamat', v_customer.alamat,
            'kota', v_customer.kota
        ),
        'brand', jsonb_build_object(
            'name', v_brand.name,
            'companyName', v_brand.company_name,
            'logoUrl', v_brand.logo_url,
            'phone', v_brand.phone,
            'email', v_brand.email,
            'address', v_brand.address,
            'bankName', v_brand.bank_name,
            'accountName', v_brand.account_name,
            'accountNumber', v_brand.account_number
        ),
        'payment', jsonb_build_object(
            'dpDesainAmount', v_order.dp_desain_amount,
            'dpDesainVerified', v_order.dp_desain_verified,
            'dpDesainVerifiedAt', v_order.dp_desain_verified_at,
            'dpProduksiAmount', v_order.dp_produksi_amount,
            'dpProduksiVerified', v_order.dp_produksi_verified,
            'dpProduksiVerifiedAt', v_order.dp_produksi_verified_at,
            'pelunasanAmount', v_order.pelunasan_amount,
            'pelunasanVerified', v_order.pelunasan_verified,
            'pelunasanVerifiedAt', v_order.pelunasan_verified_at,
            'invoice', case
                when v_invoice.id is null then null
                else jsonb_build_object(
                    'noInvoice', v_invoice.no_invoice,
                    'tanggal', v_invoice.tanggal,
                    'subTotal', v_invoice.sub_total,
                    'ppnPersen', v_invoice.ppn_persen,
                    'ppnAmount', v_invoice.ppn_amount,
                    'total', v_invoice.total,
                    'totalDibayar', v_invoice.total_dibayar,
                    'sisaTagihan', v_invoice.sisa_tagihan,
                    'statusPembayaran', v_invoice.status_pembayaran,
                    'terminPembayaran', v_invoice.termin_pembayaran
                )
            end
        ),
        'progress', jsonb_build_object(
            'layoutCompletedAt', v_order.layout_completed_at,
            'productionReadyAt', v_order.production_ready_at,
            'printCompletedAt', v_order.print_completed_at,
            'sewingCompletedAt', v_order.sewing_completed_at,
            'packingCompletedAt', v_order.packing_completed_at
        ),
        'shipping', jsonb_build_object(
            'trackingNumber', v_order.tracking_number,
            'courier', null,
            'shippedAt', v_order.shipped_at
        )
    );
end;
$function$;

-- 4. Customer menyetujui layout. Tahap order TIDAK diubah di sini; admin tetap
--    yang memindahkan tahap agar logika gatekeeper ERP tidak dilangkahi.
create or replace function public.approve_portal_layout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_order public.orders;
begin
    if p_token is null or btrim(p_token) = '' then
        return jsonb_build_object('success', false, 'message', 'Token tidak valid');
    end if;

    select * into v_order
    from public.orders
    where portal_token = btrim(p_token)
    limit 1;

    if v_order.id is null then
        return jsonb_build_object('success', false, 'message', 'Order tidak ditemukan');
    end if;

    if v_order.stage <> 'proses_layout' then
        return jsonb_build_object('success', false, 'message', 'Order tidak sedang dalam tahap persetujuan layout');
    end if;

    if v_order.layout_approved_at is not null then
        return jsonb_build_object('success', true, 'message', 'Layout sudah disetujui sebelumnya');
    end if;

    update public.orders
    set layout_approved_at = now(),
        layout_revision_note = null,
        layout_revision_requested_at = null,
        updated_at = now()
    where id = v_order.id;

    return jsonb_build_object('success', true, 'message', 'Layout disetujui');
end;
$function$;

-- 5. Customer mengajukan revisi layout beserta catatannya.
create or replace function public.request_portal_layout_revision(p_token text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_order public.orders;
    v_note text;
begin
    if p_token is null or btrim(p_token) = '' then
        return jsonb_build_object('success', false, 'message', 'Token tidak valid');
    end if;

    v_note := nullif(btrim(coalesce(p_note, '')), '');
    if v_note is null then
        return jsonb_build_object('success', false, 'message', 'Catatan revisi tidak boleh kosong');
    end if;

    select * into v_order
    from public.orders
    where portal_token = btrim(p_token)
    limit 1;

    if v_order.id is null then
        return jsonb_build_object('success', false, 'message', 'Order tidak ditemukan');
    end if;

    if v_order.stage <> 'proses_layout' then
        return jsonb_build_object('success', false, 'message', 'Order tidak sedang dalam tahap layout');
    end if;

    update public.orders
    set layout_revision_note = v_note,
        layout_revision_requested_at = now(),
        layout_approved_at = null,
        updated_at = now()
    where id = v_order.id;

    return jsonb_build_object('success', true, 'message', 'Permintaan revisi terkirim');
end;
$function$;

-- 6. RPC persetujuan desain lama tidak dipakai lagi.
drop function if exists public.approve_portal_design(text);
drop function if exists public.request_portal_design_revision(text, text);

-- 7. Hak akses fungsi: hanya lewat token, jadi boleh dieksekusi oleh anon.
revoke all on function public.get_portal_order(text) from public;
revoke all on function public.approve_portal_layout(text) from public;
revoke all on function public.request_portal_layout_revision(text, text) from public;

grant execute on function public.get_portal_order(text) to anon, authenticated, service_role;
grant execute on function public.approve_portal_layout(text) to anon, authenticated, service_role;
grant execute on function public.request_portal_layout_revision(text, text) to anon, authenticated, service_role;
