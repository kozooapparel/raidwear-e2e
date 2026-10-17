-- ============================================================================
-- Customer Dashboard (bagian 1): normalisasi nomor WA + identitas customer.
--
-- Menambahkan kolom phone_normalized (anchor identitas untuk dashboard customer)
-- dan portal_token (token akses 5 karakter) ke tabel customers. Melakukan
-- normalisasi nomor telepon yang sudah ada, lalu menggabungkan (merge) baris
-- customer yang ternyata orang yang sama (nomor ternormalisasi sama).
--
-- Idempotent: aman dijalankan berulang (ADD COLUMN IF NOT EXISTS, index parsial
-- if not exists, dan merge hanya berjalan bila masih ada duplikat).
-- ============================================================================

-- 1. Fungsi normalisasi nomor telepon ke format kanonik 62xxx.
--    Hasil null bila input tidak dapat dikenali, sehingga nomor yang tidak
--    valid tidak ikut digabungkan / di-unique-kan.
create or replace function public.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
as $function$
declare
    v_digits text;
begin
    if p_phone is null then
        return null;
    end if;

    -- buang semua karakter non-angka (spasi, garis, plus, tanda kurung, dll)
    v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

    if v_digits is null or v_digits = '' then
        return null;
    end if;

    -- awalan 0 lokal (mis. 0812) -> 62
    if left(v_digits, 1) = '0' then
        v_digits := '62' || substr(v_digits, 2);
    -- awalan 8 tanpa 0 (mis. 812) -> 62
    elsif left(v_digits, 1) = '8' then
        v_digits := '62' || v_digits;
    -- sudah berawalan 62
    elsif left(v_digits, 2) = '62' then
        -- buang tepat satu angka 0 tepat setelah 62 (mis. 620812 -> 62812)
        if substr(v_digits, 3, 1) = '0' then
            v_digits := '62' || substr(v_digits, 4);
        end if;
    else
        -- format tidak dikenali; kembalikan null agar tidak salah gabung
        return null;
    end if;

    -- validasi panjang wajar nomor internasional 62 + 7..13 digit
    if left(v_digits, 2) <> '62' or length(v_digits) < 9 or length(v_digits) > 15 then
        return null;
    end if;

    return v_digits;
end;
$function$;

-- 2. Tambah kolom identitas (aman bila sudah ada).
alter table public.customers
    add column if not exists phone_normalized text,
    add column if not exists portal_token text;

-- 3. Backfill phone_normalized untuk data lama.
update public.customers
set phone_normalized = public.normalize_phone(phone)
where phone_normalized is null;

-- 4. Merge duplikat: untuk tiap grup phone_normalized yang sama (non-null),
--    pilih satu baris survivor (paling lama), pindahkan orders + invoices ke
--    survivor, lalu hapus baris duplikat. FK orders/invoices memakai ON DELETE
--    RESTRICT, sehingga reassign HARUS dilakukan sebelum delete.
do $$
declare
    rec record;
    v_survivor uuid;
begin
    for rec in
        select phone_normalized
        from public.customers
        where phone_normalized is not null
        group by phone_normalized
        having count(*) > 1
    loop
        -- survivor = created_at paling lama, tie-break id terkecil
        select id into v_survivor
        from public.customers
        where phone_normalized = rec.phone_normalized
        order by created_at asc nulls last, id asc
        limit 1;

        -- pindahkan orders milik duplikat ke survivor
        update public.orders o
        set customer_id = v_survivor
        where o.customer_id in (
            select c.id
            from public.customers c
            where c.phone_normalized = rec.phone_normalized
              and c.id <> v_survivor
        );

        -- pindahkan invoices milik duplikat ke survivor
        update public.invoices i
        set customer_id = v_survivor
        where i.customer_id in (
            select c.id
            from public.customers c
            where c.phone_normalized = rec.phone_normalized
              and c.id <> v_survivor
        );

        -- hapus baris duplikat
        delete from public.customers c
        where c.phone_normalized = rec.phone_normalized
          and c.id <> v_survivor;
    end loop;
end $$;

-- 5. Unique index parsial. phone_normalized hanya di-unique-kan untuk nilai
--    non-null (customer tanpa nomor valid tetap boleh lebih dari satu).
create unique index if not exists customers_phone_normalized_uniq
    on public.customers (phone_normalized)
    where phone_normalized is not null;

create unique index if not exists customers_portal_token_uniq
    on public.customers (portal_token)
    where portal_token is not null;

-- 6. Trigger: jaga phone_normalized tetap sinkron saat nomor dimasukkan/diubah
--    lewat aplikasi (yang saat ini menyimpan nomor mentah).
create or replace function public.set_customer_phone_normalized()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    new.phone_normalized := public.normalize_phone(new.phone);
    return new;
end;
$function$;

drop trigger if exists set_customer_phone_normalized on public.customers;
create trigger set_customer_phone_normalized
    before insert or update of phone on public.customers
    for each row execute function public.set_customer_phone_normalized();

-- 7. Helper normalisasi tidak perlu dibuka ke anon.
revoke all on function public.normalize_phone(text) from public;
grant execute on function public.normalize_phone(text) to authenticated, service_role;
