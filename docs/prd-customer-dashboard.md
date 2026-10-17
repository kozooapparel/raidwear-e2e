# PRD — RAIDWEAR Customer Dashboard (Hub "Order Saya")

| | |
|---|---|
| **Status** | Selesai (terimplementasi, siap uji end-to-end) |
| **Akses** | `/pesanan` (daftar mandiri) + `/pesanan/[phone]` (dashboard) |
| **Relasi** | Pelengkap [prd-customer-portal.md](./prd-customer-portal.md) (`/lacak/[token]`) |
| **Path warisan** | `/portal/[token]` tetap berfungsi sebagai redirect ke `/pesanan/[phone]` |
| **Bahasa** | Dokumen & UI: Bahasa Indonesia |

Dokumen ini mendefinisikan **Dashboard Customer**: satu halaman hub tempat customer melihat **semua order miliknya** sekaligus, diakses lewat **tautan WhatsApp tanpa login/OTP**.

---

## 1. Nama Fitur

**RAIDWEAR Customer Dashboard** — halaman "Order Saya" yang mengelompokkan seluruh order dari satu customer dalam satu tampilan, sebagai lapisan di atas halaman lacak per-order yang sudah ada.

- `/lacak/[token]` = **detail satu order** (sudah ada).
- `/pesanan/[phone]` = **daftar semua order satu customer** (fitur baru).
- `/pesanan` = **form pendaftaran mandiri** calon customer (fitur baru).
- `/portal/[token]` = **redirect kompatibilitas lama** ke `/pesanan/[phone]`.

Satu kartu order di dashboard menautkan ke detailnya di `/lacak/[token]`.

---

## 2. Latar Belakang & Masalah

Customer menerima satu tautan `/lacak/[token]` per order. Bila satu customer punya banyak order, customer harus menyimpan banyak link. Dashboard ini menjawab kebutuhan itu dengan **satu tautan per customer**.

---

## 3. Tujuan

Memberi customer **satu pintu masuk** untuk melihat semua order, tahu total yang masih perlu dibayar, tahu order mana yang butuh tindakan, dan membuka detailnya di `/lacak/[token]`.

---

## 4. Prinsip Inti

- **Tanpa login, tanpa OTP** — akses cukup dengan memegang tautan yang dikirim ke WhatsApp customer.
- **Identitas = nomor WhatsApp ternormalisasi** — satu nomor `62xxx` = satu customer = kumpulan order-nya.
- **Reuse, bukan duplikasi** — logika tahap/aksi/pembayaran memakai kode portal yang ada (`stages.ts`, `get_portal_order`).
- **Tidak menyentuh dashboard admin** — namespace URL, layout, dan data terpisah.

---

## 5. Ruang Lingkup

- Halaman hub "Order Saya" untuk customer.
- Identitas customer berbasis nomor WA (`customers.phone_normalized`, unik).
- **Anti-spam** lewat status `customers.status` (`pending`/`active`) + persetujuan admin.
- Form pendaftaran mandiri di `/pesanan`.
- Ringkasan: jumlah order, order butuh tindakan, total sisa tagihan.
- Daftar order (kartu) dengan status ringkas + link ke detail.
- Tombol hubungi CS (WhatsApp/email).

**Di luar scope:** login/OTP, edit data customer dari dashboard, multi-brand lintas batas brand.

---

## 6. Batasan (Tidak Boleh)

- Tidak menambahkan auth/OTP/SMS pada fase ini.
- Tidak memakai URL `/dashboard/*` untuk customer.
- Tidak menampilkan order customer lain atau data internal.
- Tidak mengubah halaman `/lacak/[token]` yang sudah berjalan.
- Tidak menulis rahasia di kode maupun `NEXT_PUBLIC_*`.

---

## 7. Pengguna & Batas Informasi

Customer **hanya** boleh melihat: data dirinya (ter-mask), daftar order miliknya, kontak CS brand.

Customer **tidak boleh** melihat: customer lain, karyawan/HR/payroll/supplier, harga pokok/margin/costing internal, catatan produksi internal, menu ERP admin.

Masking `mask_tail` tetap dipakai karena akses = kepemilikan link dan link bisa bocor.

---

## 8. Model Akses (WA Link, Tanpa OTP)

### 8.1 Alur akses customer yang sudah aktif

```
Admin (menu Customers)
  → klik "Salin Link Portal"
  → sistem menghasilkan URL: https://<host>/pesanan/<phone_normalized>
  → admin kirim URL itu ke WA customer (manual)
  → customer klik → langsung masuk dashboard "Order Saya"
```

### 8.2 Alur pendaftaran mandiri (calon customer baru, anti-spam)

```
Calon customer buka /pesanan
  → isi nama + nomor WA
  → sistem membuat customer berstatus "pending" (tidak langsung aktif)
  → calon customer diarahkan ke WA admin (click-to-chat)
  → admin membuka menu Customers > tab "Menunggu Persetujuan"
  → admin klik "Approve"
  → status berubah "active"
  → admin salin & kirim link /pesanan/[phone] ke WA customer
```

- Customer yang **ditambahkan langsung oleh admin** melalui form admin default `active` (tanpa perlu approve).
- Hanya customer yang **mendaftar mandiri** yang wajib melewati persetujuan admin.

### 8.3 Skenario

- `/pesanan/[phone]` dengan nomor tidak dikenal → `notFound()` (halaman "tidak ditemukan").
- `/pesanan/[phone]` dengan status `pending` → halaman "menunggu persetujuan" + tombol WA admin.
- `/pesanan/[phone]` dengan status `active` → dashboard order.
- `/portal/[token]` lama → redirect ke `/pesanan/[phone]` (fallback `notFound()` bila tidak ada).

---

## 9. Identitas Customer (Nomor WA)

- Format kanonik `62` + 9–12 digit; normalisasi: buang non-digit, `0`→`62`, `8`→`628`, `62`/`+62`→`62...`.
- `customers.phone_normalized` diisi otomatis (trigger/normalisasi), unik (index parsial where not null).
- Customer tanpa nomor WA valid tidak bisa dibuatkan link akses.

---

## 10. Peta Modul

| Modul | Tanggung jawab |
|---|---|
| `customer-identity` | Normalisasi phone + unique + `portal_token` (5 char) + `status` |
| `customer-portal-rpc` | RPC baca portal (by phone & by token), register pending, approve |
| `register-form` | Halaman `/pesanan` (form daftar mandiri) |
| `portal-shell` | Header brand + sapaan + tombol CS |
| `customer-summary` | Ringkasan 3 metrik |
| `order-list` | Daftar kartu order → link ke `/lacak/[token]` |
| `admin-approve` | Tab "Menunggu Persetujuan" + tombol Approve + salin link |

---

## 11. Detail Fitur

- **Header & identitas**: logo/nama brand + sapaan nama ter-mask + tombol kontak CS; mobile-first.
- **Ringkasan**: `Order aktif`, `Perlu tindakan` (dari `getPortalAction`), `Sisa tagihan` (dari `getPaymentSummary`).
- **Daftar order**: kartu berisi nomor/deskripsi order, chip tahap (`CUSTOMER_STAGE_LABELS`), status pembayaran, badge "Perlu tindakan", link ke `/lacak/[tokenOrder]`. Urutan: butuh-tindakan dulu, lalu terbaru.
- **Status kosong**: pesan ramah + tombol hubungi CS.
- **Status menunggu**: halaman "menunggu persetujuan admin" untuk customer `pending`.

---

## 12. Pemetaan Istilah (Reuse)

Gunakan ulang: `CUSTOMER_STAGE_LABELS`, `getPortalAction`, `getPaymentSummary`, `get_portal_order`, `mapPortalOrder`, `PortalHeader`.

---

## 13. Aturan Data & Tampilan

- Semua info dari struktur yang ada (order, customer, invoice, brand).
- Field order memakai `orders.portal_token` agar bisa di-link ke `/lacak`.
- Format Rupiah `id-ID`, tanggal Bahasa Indonesia, mobile-first.

---

## 14. Skema & RPC (Telah diterapkan)

### 14.1 Kolom `customers`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `phone_normalized` | text | Hasil normalisasi nomor WA (unik, nullable) |
| `portal_token` | text | Token kompatibilitas lama (5 char, unik) |
| `status` | text | `pending` / `active` (default `active`) |

### 14.2 RPC

- `get_customer_portal(p_token)` — `SECURITY DEFINER`, `STABLE`; `{status, phone_normalized, customer, brand, orders}`; akses `anon`.
- `get_customer_portal_by_phone(p_phone)` — sama, lookup via nomor; akses `anon`.
- `register_customer_request(p_name, p_phone)` — buat customer `pending`; akses `anon`.
- `approve_customer(p_customer_id)` — `pending` → `active`; akses **hanya `authenticated`/`service_role`** (dikunci dari `anon`).

---

## 15. Pemisahan dari Dashboard Admin

| Aspek | Admin | Customer dashboard |
|---|---|---|
| URL | `/dashboard/*` | `/pesanan/*` (dan `/lacak/*` untuk detail) |
| Layout | `DashboardLayout` (sidebar ERP) | Portal shell sendiri (tanpa sidebar) |
| Auth | Login Supabase | Tanpa login (link) |
| Middleware | Wajib login | `/pesanan` dan `/portal` publik |
| Data | Semua data internal | Hanya milik customer, ter-mask |

---

## 16. Definisi Selesai (Definition of Done)

- [x] Customer aktif bisa membuka `/pesanan/[phone]` dan melihat semua order tanpa login.
- [x] Form `/pesanan` membuat customer `pending` dan mengarahkan ke WA admin.
- [x] Halaman "menunggu persetujuan" tampil untuk customer `pending`.
- [x] Admin bisa Approve di menu Customers (tab Menunggu Persetujuan).
- [x] Ringkasan 3 metrik benar; kartu menautkan ke `/lacak/[token]`.
- [x] Data customer ter-mask; tidak ada data internal/customer lain.
- [x] `/portal/[token]` redirect ke `/pesanan/[phone]`.
- [x] `approve_customer` tidak bisa dipanggil role `anon`.
- [x] Admin dapat menyalin link portal dari halaman customer.
- [x] `npm run lint` dan `npm run build` lolos (error lint yang tersisa adalah error lama di file lain, bukan dari fitur ini).

---

## 17. Boundaries

**Always:** reuse istilah/logika tahap dari sistem; tambah migrasi baru + idempotent; mobile-first; lint & build lolos.

**Ask first:** mengubah file inti bersama (`middleware.ts`, halaman admin) bila terpaksa.

**Never:** menulis rahasia; mengubah `fork-sync.yml`; menampilkan data internal/customer lain.

---

## 18. Struktur Berkas

```
src/app/pesanan/
  page.tsx                 # Form daftar mandiri (client)
  [phone]/page.tsx         # Dashboard / halaman menunggu (server)
src/app/portal/[token]/page.tsx   # Redirect legacy -> /pesanan/[phone]
src/components/portal/
  PortalDashboardClient.tsx
  CustomerSummary.tsx
  OrderList.tsx
  OrderCard.tsx
src/lib/portal/
  customer-queries.ts      # getCustomerPortalByPhone / ByToken
src/lib/actions/customers.ts  # getCustomerPortalLink, approveCustomer
supabase/migrations/
  20261017010000_customer_identity_normalization.sql
  20261017020000_customer_portal_token_and_rpc.sql
  20261017030000_customer_status_and_phone_portal.sql
  20261017040000_revoke_approve_customer_anon.sql
```

---

## 19. Strategi Verifikasi

- `npm run lint` dan `npm run build`.
- Skenario end-to-end: daftar mandiri → pending → halaman menunggu → admin Approve → dashboard aktif.
- `/portal/[token]` redirect benar ke `/pesanan/[phone]`.
- `approve_customer` dengan anon key → `401 permission denied`.
