-- ============================================================================
-- Customer Dashboard (bagian 2): token portal customer + RPC get_customer_portal.
--
-- Bagian 1 sudah menambahkan kolom customers.portal_token beserta index unik
-- parsialnya. Bagian ini:
--   1. Membuat generator token 5 karakter khusus customer (cek ke customers).
--   2. Membuat trigger agar customer baru otomatis mendapat token.
--   3. Backfill token untuk customer lama yang masih kosong/panjang != 5.
--   4. Membuat RPC get_customer_portal(p_token) yang me-reuse get_portal_order
--      untuk tiap order, lalu mengembalikan satu JSON { customer, brand, orders }.
--   5. Memberi hak akses eksekusi.
--
-- Token customer memakai alfabet yang sama (32 karakter tanpa I/O/0/1) dan
-- panjang yang sama (5) dengan token order, tetapi berada di namespace berbeda
-- (/portal/[token] vs /lacak/[token]) sehingga bentrok nilai tidak masalah.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- 1. Generator token 5 karakter khusus customer. Cek uniqueness dilakukan ke
--    tabel customers (bukan orders) karena token ini dipakai sebagai identitas
--    customer, bukan identitas satu order.
create or replace function public.generate_customer_portal_token()
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

        -- Ulangi bila token sudah dipakai customer lain (index unik menjamin ini).
        exit when not exists (
            select 1 from public.customers where portal_token = v_token
        );
    end loop;

    return v_token;
end;
$function$;

-- 2. Trigger BEFORE INSERT/UPDATE: isi token customer bila belum diisi.
create or replace function public.set_customer_portal_token()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if new.portal_token is null or btrim(new.portal_token) = '' then
        new.portal_token := public.generate_customer_portal_token();
    end if;
    return new;
end;
$function$;

drop trigger if exists set_customer_portal_token on public.customers;
create trigger set_customer_portal_token
    before insert or update of portal_token on public.customers
    for each row execute function public.set_customer_portal_token();

-- 3. Backfill token customer lama (kosong atau panjang != 5). Dilakukan baris
--    per baris agar token yang baru selalu unik satu sama lain.
do $$
declare
    r record;
    v_token text;
begin
    for r in
        select id
        from public.customers
        where portal_token is null or length(btrim(portal_token)) <> 5
    loop
        loop
            v_token := public.generate_customer_portal_token();
            exit when not exists (
                select 1 from public.customers where portal_token = v_token
            );
        end loop;

        update public.customers set portal_token = v_token where id = r.id;
    end loop;
end $$;

-- 4. get_customer_portal: kembalikan customer ter-mask + brand header + daftar
--    order aktif (tidak diarsipkan). Tiap order diambil lewat get_portal_order
--    agar bentuk datanya identik dengan halaman /lacak/[token] (termasuk
--    masking), sehingga lapisan frontend cukup me-reuse pemetaan yang sama.
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

    -- Daftar order aktif milik customer (terbaru dulu). get_portal_order
    -- mengembalikan null untuk token kosong, jadi token null ikut difilter.
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

-- 5. Hak akses: hanya get_customer_portal yang perlu dibuka ke anon.
revoke all on function public.get_customer_portal(text) from public;
grant execute on function public.get_customer_portal(text) to anon, authenticated, service_role;

-- Generator & trigger helper tidak perlu diekspos ke anon.
revoke all on function public.generate_customer_portal_token() from public;
grant execute on function public.generate_customer_portal_token() to authenticated, service_role;
