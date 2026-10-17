-- ============================================================================
-- Customer Dashboard (perbaikan izin): kunci approve_customer dari role anon.
--
-- Supabase memberi default privileges EXECUTE pada fungsi yang dibuat role
-- `postgres` langsung ke anon/authenticated/service_role. Karena itu `revoke
-- all ... from public` saja tidak cukup; role anon masih memegang grant
-- langsung sehingga tetap bisa memanggil approve_customer memakai anon key.
--
-- Izin yang benar:
--   - authenticated, service_role : boleh (approve dilakukan admin).
--   - anon                         : DILARANG.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

revoke execute on function public.approve_customer(uuid) from anon;
revoke execute on function public.approve_customer(uuid) from public;
grant execute on function public.approve_customer(uuid) to authenticated, service_role;
