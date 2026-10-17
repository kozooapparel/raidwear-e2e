-- ============================================================================
-- Customer Dashboard (bagian 3): status customer + portal berbasis nomor WA.
--
-- 1. Tambah kolom customers.status ('pending' | 'active') sebagai gerbang
--    anti-spam untuk daftar mandiri. Customer buatan admin default 'active'.
-- 2. Perbarui get_customer_portal agar mengembalikan status + phone_normalized.
-- 3. Tambah get_customer_portal_by_phone(p_phone) untuk /pesanan/[phone].
-- 4. Tambah register_customer_request() untuk form daftar mandiri (anon).
-- 5. Tambah approve_customer() untuk admin menyetujui calon customer.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- 1. Kolom status. Customer lama otomatis aktif (tidak perlu persetujuan).
alter table public.customers
    add column if not exists status text not null default 'active';

update public.customers set status = 'active' where status is null;

-- 2. get_customer_portal: tambah status + phone_normalized (untuk redirect
--    /portal ke /pesanan) tanpa mengubah kontrak lain.
create or replace function public.get_customer_portal(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
    v_customer public.customers;
    v_brand public.brands;
    v_orders jsonb;
begin
    if p_token is null or btrim(p_token) = '' then
        return null;
    end if;

    select * into v_customer
    from public.customers
    where portal_token = btrim(p_token)
    limit 1;

    if v_customer.id is null then
        return null;
    end if;

    -- Brand header: ambil dari order aktif terbaru; fallback ke brand default.
    select b.* into v_brand
    from public.orders o
    join public.brands b on b.id = o.brand_id
    where o.customer_id = v_customer.id
      and o.is_archived = false
      and o.brand_id is not null
    order by o.created_at desc
    limit 1;

    if v_brand.id is null then
        select * into v_brand
        from public.brands
        where is_default = true
        limit 1;
    end if;

    -- Daftar order aktif milik customer (terbaru dulu).
    select coalesce(
        jsonb_agg(
            public.get_portal_order(o.portal_token)
            order by o.created_at desc
        ),
        '[]'::jsonb
    )
    into v_orders
    from public.orders o
    where o.customer_id = v_customer.id
      and o.is_archived = false
      and o.portal_token is not null;

    return jsonb_build_object(
        'token', v_customer.portal_token,
        'status', v_customer.status,
        'phone_normalized', v_customer.phone_normalized,
        'customer', jsonb_build_object(
            'name', public.mask_tail(v_customer.name, 4),
            'phone', public.mask_tail(v_customer.phone, 6),
            'alamat', public.mask_tail(v_customer.alamat, 10),
            'kota', v_customer.kota
        ),
        'brand', case
            when v_brand.id is null then null
            else jsonb_build_object(
                'name', v_brand.name,
                'companyName', v_brand.company_name,
                'logoUrl', v_brand.logo_url,
                'phone', v_brand.phone,
                'email', v_brand.email,
                'address', v_brand.address,
                'bankName', v_brand.bank_name,
                'accountName', v_brand.account_name,
                'accountNumber', v_brand.account_number
            )
        end,
        'orders', v_orders
    );
end;
$function$;

-- get_customer_portal perlu diakses anon (dashboard customer via token).
revoke all on function public.get_customer_portal(text) from public;
grant execute on function public.get_customer_portal(text) to anon, authenticated, service_role;

-- 3. Lookup berdasarkan nomor WA ternormalisasi. Me-reuse get_customer_portal
--    agar bentuk datanya identik (status, customer, brand, orders).
create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
    v_token text;
    v_normalized text;
begin
    v_normalized := public.normalize_phone(p_phone);
    if v_normalized is null then
        return null;
    end if;

    select portal_token into v_token
    from public.customers
    where phone_normalized = v_normalized
    limit 1;

    if v_token is null then
        return null;
    end if;

    return public.get_customer_portal(v_token);
end;
$function$;

revoke all on function public.get_customer_portal_by_phone(text) from public;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated, service_role;

-- 4. Pendaftaran mandiri. Hanya membuat customer berstatus 'pending'; customer
--    'active' tidak pernah dibuat lewat jalur ini. Nomor WA ternormalisasi
--    menjamin tidak ada duplikat.
create or replace function public.register_customer_request(p_name text, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
    v_name_clean text;
    v_phone_clean text;
    v_normalized text;
    v_existing public.customers;
    v_brand_phone text;
begin
    v_name_clean := btrim(p_name);
    v_phone_clean := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
    v_normalized := public.normalize_phone(p_phone);

    if v_name_clean = '' or v_phone_clean = '' or v_normalized is null then
        return jsonb_build_object(
            'success', false,
            'message', 'Nama dan nomor WA wajib diisi dengan format yang benar.'
        );
    end if;

    select * into v_existing
    from public.customers
    where phone_normalized = v_normalized
    limit 1;

    if v_existing.id is not null then
        return jsonb_build_object(
            'success', false,
            'message', case
                when v_existing.status = 'active' then
                    'Nomor ini sudah terdaftar. Hubungi admin untuk mendapatkan link akses.'
                else
                    'Nomor ini sedang menunggu persetujuan admin.'
            end,
            'status', v_existing.status,
            'phone_normalized', v_existing.phone_normalized
        );
    end if;

    -- Nomor WA admin untuk tombol "Lanjut ke WhatsApp" (brand default).
    select phone into v_brand_phone
    from public.brands
    where is_default = true
    limit 1;

    insert into public.customers (name, phone, phone_normalized, status)
    values (v_name_clean, v_phone_clean, v_normalized, 'pending');

    return jsonb_build_object(
        'success', true,
        'status', 'pending',
        'phone_normalized', v_normalized,
        'name', v_name_clean,
        'brand_phone', v_brand_phone
    );
end;
$function$;

revoke all on function public.register_customer_request(text, text) from public;
grant execute on function public.register_customer_request(text, text) to anon, authenticated, service_role;

-- 5. Persetujuan admin: ubah 'pending' menjadi 'active'. Hanya untuk pengguna
--    terautentikasi (admin), tidak dibuka ke anon.
create or replace function public.approve_customer(p_customer_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
    v_customer public.customers;
begin
    select * into v_customer
    from public.customers
    where id = p_customer_id
      and status = 'pending'
    limit 1;

    if v_customer.id is null then
        return jsonb_build_object(
            'success', false,
            'message', 'Customer tidak ditemukan atau sudah disetujui.'
        );
    end if;

    update public.customers
    set status = 'active'
    where id = p_customer_id
      and status = 'pending';

    return jsonb_build_object(
        'success', true,
        'status', 'active',
        'phone_normalized', v_customer.phone_normalized,
        'portal_token', v_customer.portal_token,
        'name', v_customer.name
    );
end;
$function$;

revoke all on function public.approve_customer(uuid) from public;
grant execute on function public.approve_customer(uuid) to authenticated, service_role;
