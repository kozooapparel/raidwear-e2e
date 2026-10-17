-- ============================================================================
-- Penomoran Rapi: internsional, phone opsional, brands.phone_normalized.
--
-- 1.  Tambah customers.country_code + buat phone nullable (admin bisa kosongkan).
-- 2.  Ganti unique constraint phone mentah → phone_normalized.
-- 3.  Perluas normalize_phone agar menerima country_code apa pun.
-- 4.  Tambah brands.phone_normalized + trigger.
-- 5.  Perbarui register_customer_request menerima country_code.
-- 6.  Perbarui get_customer_portal_by_phone agar tangani nomor non-62.
-- 7.  Perbarui get_customer_portal mengembalikan brand.phone_normalized.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- ============================================================================
-- Bagian 1: customers — country_code + phone nullable
-- ============================================================================

alter table public.customers
    add column if not exists country_code text not null default '62';

alter table public.customers
    alter column phone drop not null;

-- Hapus unique constraint pada phone mentah (digantikan phone_normalized).
alter table public.customers
    drop constraint if exists customers_phone_key;

-- ============================================================================
-- Bagian 2: normalize_phone — parameter country_code universal
-- ============================================================================

create or replace function public.normalize_phone(
    p_phone text,
    p_country_code text default '62'
)
returns text
language plpgsql
immutable
as $function$
declare
    v_digits text;
    v_cc     text;
begin
    if p_phone is null or btrim(p_phone) = '' then
        return null;
    end if;

    -- bersihkan semua karakter non-angka
    v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
    if v_digits is null or v_digits = '' then
        return null;
    end if;

    -- bersihkan country_code
    v_cc := regexp_replace(coalesce(p_country_code, '62'), '[^0-9]', '', 'g');
    if v_cc = '' then v_cc := '62'; end if;

    -- buang leading '+' jika ada
    if left(v_digits, 1) = '+' then
        v_digits := substr(v_digits, 2);
    end if;

    -- sudah diawali country_code
    if left(v_digits, length(v_cc)) = v_cc then
        -- buang eventual satu '0' tepat setelah country_code (62 0 812... → 62 812...)
        if substr(v_digits, length(v_cc) + 1, 1) = '0' then
            v_digits := v_cc || substr(v_digits, length(v_cc) + 2);
        end if;
    -- awalan 0 lokal → ganti dengan country_code
    elsif left(v_digits, 1) = '0' then
        v_digits := v_cc || substr(v_digits, 2);
    -- kasus khusus Indonesia: awalan 8 tanpa 0 (812... → 62812...)
    elsif v_cc = '62' and left(v_digits, 1) = '8' and length(v_digits) between 8 and 12 then
        v_digits := '62' || v_digits;
    -- masukan tanpa prefix → prepend country_code
    else
        v_digits := v_cc || v_digits;
    end if;

    -- validasi panjang (country_code + 5..12 digit nomor, total max 15)
    if length(v_digits) < length(v_cc) + 5 or length(v_digits) > 15 then
        return null;
    end if;

    return v_digits;
end;
$function$;

revoke all on function public.normalize_phone(text, text) from public;
grant execute on function public.normalize_phone(text, text) to authenticated, service_role;

-- ============================================================================
-- Bagian 3: trigger customers — pakai country_code + tangani phone null
-- ============================================================================

create or replace function public.set_customer_phone_normalized()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if new.phone is null or btrim(new.phone) = '' then
        new.phone_normalized := null;
    else
        new.phone_normalized := public.normalize_phone(
            new.phone,
            coalesce(new.country_code, '62')
        );
    end if;
    return new;
end;
$function$;

-- ============================================================================
-- Bagian 4: brands — phone_normalized + trigger
-- ============================================================================

alter table public.brands
    add column if not exists phone_normalized text;

-- Backfill data brand yang sudah ada (asumsikan nomor Indonesia).
update public.brands
set phone_normalized = public.normalize_phone(phone, '62')
where phone_normalized is null
  and phone is not null
  and btrim(phone) <> '';

create or replace function public.set_brand_phone_normalized()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if new.phone is null or btrim(new.phone) = '' then
        new.phone_normalized := null;
    else
        -- brand selalu negara 62 (admin Indonesia)
        new.phone_normalized := public.normalize_phone(new.phone, '62');
    end if;
    return new;
end;
$function$;

drop trigger if exists set_brand_phone_normalized on public.brands;
create trigger set_brand_phone_normalized
    before insert or update of phone on public.brands
    for each row execute function public.set_brand_phone_normalized();

-- ============================================================================
-- Bagian 5: register_customer_request — terima country_code
-- ============================================================================

create or replace function public.register_customer_request(
    p_name text,
    p_phone text,
    p_country_code text default '62'
)
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
    v_normalized := public.normalize_phone(p_phone, coalesce(p_country_code, '62'));

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
    select coalesce(phone_normalized, phone) into v_brand_phone
    from public.brands
    where is_default = true
    limit 1;

    insert into public.customers (name, phone, phone_normalized, status, country_code)
    values (v_name_clean, v_phone_clean, v_normalized, 'pending', coalesce(p_country_code, '62'));

    return jsonb_build_object(
        'success', true,
        'status', 'pending',
        'phone_normalized', v_normalized,
        'name', v_name_clean,
        'brand_phone', v_brand_phone
    );
end;
$function$;

revoke all on function public.register_customer_request(text, text, text) from public;
grant execute on function public.register_customer_request(text, text, text) to anon, authenticated, service_role;

-- ============================================================================
-- Bagian 6: get_customer_portal_by_phone — tangani nomor non-62
-- ============================================================================

create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
    v_token text;
    v_clean  text;
    v_normalized text;
begin
    if p_phone is null or btrim(p_phone) = '' then
        return null;
    end if;

    -- bersihkan non-digit
    v_clean := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- coba direct match (nomor sudah ternormalisasi di URL)
    select portal_token into v_token
    from public.customers
    where phone_normalized = v_clean
    limit 1;

    -- fallback: normalisasi dengan default 62
    if v_token is null then
        v_normalized := public.normalize_phone(p_phone, '62');
        if v_normalized is not null then
            select portal_token into v_token
            from public.customers
            where phone_normalized = v_normalized
            limit 1;
        end if;
    end if;

    if v_token is null then
        return null;
    end if;

    return public.get_customer_portal(v_token);
end;
$function$;

revoke all on function public.get_customer_portal_by_phone(text) from public;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated, service_role;

-- ============================================================================
-- Bagian 7: get_customer_portal — tambah brand.phone_normalized
-- ============================================================================

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
        'country_code', v_customer.country_code,
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
                'phone_normalized', v_brand.phone_normalized,
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

revoke all on function public.get_customer_portal(text) from public;
grant execute on function public.get_customer_portal(text) to anon, authenticated, service_role;