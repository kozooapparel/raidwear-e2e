-- ============================================================================
-- Token portal pendek (5 karakter) + masking data pribadi.
--
-- Sebelumnya token portal dibuat dari gen_random_uuid() tanpa tanda hubung
-- sehingga panjangnya 32 karakter dan URL terasa terlalu panjang. Token kini
-- dipendekkan menjadi 5 karakter dari alfabet 32 karakter (tanpa I/O/0/1 yang
-- mudah tertukar saat dibaca manusia).
--
-- Konsekuensi keamanan: 32^5 = 33.554.432 kombinasi, jauh lebih mudah ditebak
-- daripada 128 bit sebelumnya. Karena portal dapat dibuka tanpa login, data
-- pribadi customer pada RPC get_portal_order disamarkan (masking) dengan
-- menampilkan sebagian karakter awal lalu "***".
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- 1. Generator token 5 karakter. Alfabet 32 karakter, huruf I/O dan angka 0/1
--    dibuang agar tidak ambigu. Dipakai oleh trigger di bawah (bukan default
--    kolom) supaya bisa diulang saat terjadi bentrok token.
create or replace function public.generate_portal_token()
returns text
language plpgsql
volatile
as $function$
declare
    v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_token text;
    i integer;
begin
    loop
        v_token := '';
        for i in 1..5 loop
            v_token := v_token || substr(v_alphabet, 1 + floor(random() * 32)::int, 1);
        end loop;

        -- Ulangi bila token sudah dipakai order lain (index unik menjamin ini).
        exit when not exists (
            select 1 from public.orders where portal_token = v_token
        );
    end loop;

    return v_token;
end;
$function$;

-- 2. Default kolom lama (32 karakter) dilepas; pengisian dialihkan ke trigger.
alter table public.orders alter column portal_token drop default;

-- 3. Trigger BEFORE INSERT: isi token otomatis bila belum diisi pemanggil.
create or replace function public.set_order_portal_token()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if new.portal_token is null or btrim(new.portal_token) = '' then
        new.portal_token := public.generate_portal_token();
    end if;
    return new;
end;
$function$;

drop trigger if exists set_order_portal_token on public.orders;
create trigger set_order_portal_token
    before insert on public.orders
    for each row execute function public.set_order_portal_token();

-- 4. Backfill: ganti token lama (32 karakter / kosong) dengan token 5 karakter.
--    Dilakukan baris per baris agar token yang baru selalu unik satu sama lain.
do $$
declare
    r record;
    v_token text;
begin
    for r in
        select id
        from public.orders
        where portal_token is null or length(btrim(portal_token)) <> 5
    loop
        loop
            v_token := public.generate_portal_token();
            exit when not exists (
                select 1 from public.orders where portal_token = v_token
            );
        end loop;

        update public.orders set portal_token = v_token where id = r.id;
    end loop;
end $$;

-- 5. Helper masking: sisakan p_keep karakter awal lalu tambahkan "***".
create or replace function public.mask_tail(p_value text, p_keep integer default 4)
returns text
language sql
immutable
as $function$
    select case
        when p_value is null or btrim(p_value) = '' then p_value
        when length(btrim(p_value)) <= p_keep then '***'
        else left(btrim(p_value), p_keep) || '***'
    end;
$function$;

-- 6. get_portal_order: versi layout + masking data pribadi customer.
--    Data brand (kontak & rekening) TIDAK disamarkan karena memang harus
--    terlihat customer untuk menghubungi admin dan melakukan pembayaran.
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
            'name', public.mask_tail(v_customer.name, 4),
            'phone', public.mask_tail(v_customer.phone, 6),
            'alamat', public.mask_tail(v_customer.alamat, 10),
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

-- 7. Hak akses: hanya get_portal_order yang perlu dibuka ke anon.
revoke all on function public.get_portal_order(text) from public;
grant execute on function public.get_portal_order(text) to anon, authenticated, service_role;

-- Generator & helper internal tidak perlu diekspos ke anon.
revoke all on function public.generate_portal_token() from public;
revoke all on function public.mask_tail(text, integer) from public;
grant execute on function public.generate_portal_token() to authenticated, service_role;
grant execute on function public.mask_tail(text, integer) to authenticated, service_role;
