# PRD — RAIDWEAR Customer Portal (Portal Lacak Order)

| | |
|---|---|
| **Status** | Draft — menunggu persetujuan sebelum implementasi |
| **Fase** | Phase One (Frontend/UX saja, data simulasi) |
| **Akses** | `/lacak/[token]` |
| **Sumber kebenaran** | Sistem ERP RAIDWEAR yang sudah ada (workflow, istilah, aturan bisnis) |
| **Bahasa** | Dokumen & UI: Bahasa Indonesia |

Dokumen ini adalah versi ulang (adaptasi) dari PRD "RAIDWEAR Customer Portal" agar selaras dengan sistem ERP RAIDWEAR yang sudah berjalan. Semua istilah, urutan tahap, dan aturan mengikuti implementasi yang ada di repo ini, bukan asumsi baru.

---

## 1. Nama Fitur

**RAIDWEAR Customer Portal** — halaman customer-facing untuk melacak order jersey, melihat & menyetujui desain, dan memantau progress produksi.

Dijalankan sebagai lapisan customer-facing dari sistem RAIDWEAR yang sudah ada — **bukan ERP terpisah**.

---

## 2. Latar Belakang & Masalah

Setelah order masuk, customer tidak memiliki cara mandiri untuk mengetahui kondisi order-nya. Akibatnya customer berulang kali bertanya ke Customer Service mengenai:

- Order sekarang ada di tahap mana
- Desainnya sudah benar atau belum
- Apakah ada yang perlu customer lakukan (ACC desain, pembayaran)
- Kapan barang dikirim

Pertanyaan berulang ini membebani CS dan menurunkan pengalaman customer.

---

## 3. Tujuan

Memberi customer pengalaman yang profesional dan transparan setelah order, sehingga customer dapat memahami kondisi order tanpa harus menghubungi CS, dengan akses jelas ke:

- Informasi order
- Informasi & persetujuan desain
- Progress produksi (10 tahap)
- Timeline order
- Informasi pembayaran
- Informasi pengiriman
- Kontak Customer Service

**Ukuran keberhasilan:** customer dapat menjawab sendiri 4 pertanyaan inti (lihat §15) hanya dari halaman ini.

---

## 4. Prinsip Inti

Customer Portal **wajib mengikuti** sistem RAIDWEAR yang sudah ada. Jangan membuat workflow, status, aturan bisnis, atau struktur order baru yang bertentangan.

Yang harus diikuti dan digunakan kembali:

- Urutan & makna 10 tahap order (lihat §11)
- Istilah dan label yang sudah dipakai (mis. "Sudah ACC", "DP Produksi", "Form Order/SPK")
- Logika gatekeeper pembayaran (DP Produksi, Pelunasan)
- Field data order yang sudah ada (lihat §13)
- Identitas visual & brand RAIDWEAR (lihat §14)

---

## 5. Ruang Lingkup Phase One

Fase ini **hanya** UI/UX customer-facing:

- Halaman portal & layout-nya
- Informasi order
- Tampilan & review desain
- Approval desain (ACC)
- Permintaan revisi desain
- Riwayat versi desain (simulasi)
- Progress produksi (10 tahap)
- Timeline produksi
- Informasi pembayaran
- Informasi pengiriman
- Akses Customer Support
- Pengalaman responsif (mobile-first)

**Data pada Phase One adalah data simulasi (mock/hardcoded).**

---

## 6. Batasan Phase One (Tidak Boleh)

Selama Phase One, **tidak boleh**:

- Menghubungkan portal ke database
- Mengubah database / membuat migrasi
- Membuat integrasi backend / API baru untuk portal
- Mengubah workflow, dashboard, Kanban, invoice, kuitansi, SPK, Form Order, HR, payroll, brand management
- Mengubah logika bisnis yang sudah ada
- Mengubah berkas inti bersama (`src/app/**`, `src/components/**`, `src/lib/**` yang sudah ada) — cukup **menambah berkas baru** agar aman dari auto-sync fork
- Menampilkan informasi internal (lihat §7)

Seluruh pekerjaan integrasi dikerjakan pada fase terpisah setelah UI/UX disetujui.

---

## 7. Pengguna Sasaran & Batas Informasi

Sasaran: customer RAIDWEAR yang sudah punya order.

Customer **hanya** boleh melihat data order miliknya. Customer **tidak boleh** melihat:

- Customer lain
- Karyawan / data HR / payroll
- Supplier
- Harga pokok, margin, costing internal
- Catatan produksi internal
- Dashboard / data internal ERP lainnya

Prinsip: tampilkan **hanya** informasi yang relevan untuk customer. Jangan mengekspos kerumitan operasional hanya karena datanya ada di ERP.

---

## 8. Pengalaman Akses (via `/lacak/[token]`)

- Portal diakses dari tautan yang dikirim ke customer (skenario utama: dikirim via WhatsApp).
- URL berbentuk `/lacak/[token]`; token merepresentasikan satu order.
- Phase One: token & data disimulasikan. Autentikasi, keamanan token, dan kontrol akses dibahas pada fase integrasi.
- Token tidak dikenal / order tidak ditemukan → tampilkan halaman kosong yang jelas ("Order tidak ditemukan") dengan arahan menghubungi CS.
- Halaman **tidak** memakai `DashboardLayout` ERP (tanpa sidebar/menu internal), punya header brand sendiri.

---

## 9. Peta Modul & Urutan Pengerjaan

Seluruh pengalaman berada dalam satu portal, namun dipecah menjadi bagian (section) yang bisa diverifikasi terpisah.

| Module id | Tanggung jawab | Bergantung pada |
|---|---|---|
| `portal-shell` | Layout, header brand, tipografi, token warna, navigasi mobile | — |
| `order-overview` | Ringkasan order, status saat ini, progress, "aksi diperlukan" | `portal-shell` |
| `design-review` | Tampilan desain, versi, status, ACC, permintaan revisi | `order-overview` |
| `production-timeline` | Progress 10 tahap + timeline kejadian | `order-overview` |
| `payment-info` | Ringkasan DP Desain / DP Produksi / Pelunasan, sisa tagihan | `order-overview` |
| `shipping-support` | Informasi pengiriman + kontak CS | `order-overview` |

**Urutan build:** `portal-shell` → `order-overview` → `design-review`, `production-timeline`, `payment-info`, `shipping-support`.

---

## 10. Detail Fitur

### 10.1 Header & Identitas (portal-shell)
- Menampilkan logo & nama brand (identitas aplikasi dari `brands`, fallback "RAIDWEAR").
- Menampilkan nomor order / identitas order yang sedang dilihat.
- Akses cepat ke kontak CS.
- Mobile-first; nyaman dibaca di layar kecil.

### 10.2 Ringkasan Order (order-overview)
Menampilkan, dengan prioritas visual tertinggi untuk yang paling penting:
- Nomor/identitas order, nama customer
- Deskripsi order (`order_description`), jumlah (`total_quantity`)
- Status saat ini (tahap produksi)
- Progress keseluruhan (x dari 10 tahap)
- Apakah ada aksi yang diperlukan customer
- Gambar desain saat ini (jika ada)
- Deadline / estimasi (`deadline`, atau perhitungan 14 hari dari `created_at` sesuai `PRODUKSI_DURATION_DAYS`)
- Status pembayaran & pengiriman ringkas

### 10.3 Status & Progress 10 Tahap (production-timeline)
- Menggunakan **tepat** 10 tahap yang sudah ada, urutan tetap (§11).
- Customer dapat memahami: tahap selesai, tahap saat ini, tahap berikutnya, progress keseluruhan.
- Boleh menyederhanakan **kata** untuk keterbacaan, tetapi **makna & urutan** tidak berubah.

### 10.4 Aksi Diperlukan (order-overview)
- Area yang sangat terlihat yang memberi tahu customer bila perlu bertindak.
- Aksi customer mengikuti proses RAIDWEAR yang ada. Dalam system saat ini, aksi customer yang relevan:
  - **ACC / persetujuan desain** (saat tahap `proses_desain`)
  - **Pembayaran** DP Desain / DP Produksi / Pelunasan (informasional pada Phase One)
- Bila tidak ada aksi, UI menyatakan dengan jelas bahwa customer tidak perlu melakukan apa pun.

### 10.5 Review Desain (design-review)
- Menampilkan desain terkait order (`mockup_url`, dan `layout_url`/aset layout bila relevan).
- Menampilkan status desain (mengikuti logika "Sudah ACC" bila `mockup_url` terisi, "Belum ACC" bila belum).
- Menampilkan catatan desain (`design_notes`) yang relevan untuk customer.
- Versi terbaru selalu mudah dikenali.

### 10.6 Approval Desain (design-review)
- Customer dapat menyetujui desain (ACC) dari portal.
- Interaksi harus **disengaja & jelas** (mis. konfirmasi) — mencegah ACC tidak sengaja.
- Pesan harus menjelaskan bahwa dengan ACC, order lanjut sesuai workflow RAIDWEAR yang ada.
- **Phase One:** ACC disimulasikan (state lokal). Pemetaan ke mekanisme sistem (merekam mockup yang di-ACC + `design_notes`) ditentukan di fase integrasi.

### 10.7 Permintaan Revisi (design-review)
- Hanya tersedia bila desain **belum** di-ACC.
- Customer dapat menuliskan apa yang perlu diubah.
- Sederhana & fokus.
- Harus mengikuti alur desain RAIDWEAR yang ada — **tidak** membuat alur revisi terpisah.
- **Phase One:** pengiriman revisi disimulasikan (state lokal); integrasi ke `design_notes`/proses desain menyusul.

### 10.8 Riwayat Versi Desain (design-review)
- Menampilkan perbedaan versi desain; versi terkini prioritas tertinggi.
- Customer tidak boleh keliru menyetujui versi lama.
- **Catatan:** sistem saat ini menyimpan satu mockup aktif per order (`mockup_url`) + `design_notes`. Multi-versi pada Phase One adalah **simulasi UI**; mekanisme penyimpanan versi final adalah pertanyaan terbuka (§21).

### 10.9 Timeline Produksi (production-timeline)
- Timeline kejadian penting order.
- Berbasis data yang **sudah ada** di workflow (mis. `stage_entered_at`, `dp_*_verified_at`, `layout_completed_at`, `print_completed_at`, `sewing_completed_at`, `packing_completed_at`, `shipped_at`).
- **Tidak** membuat kejadian/status fiktif.
- Tujuan: customer paham perjalanan order tanpa meminta update manual ke CS.

### 10.10 Informasi Pembayaran (payment-info)
- Menampilkan informasi pembayaran yang relevan, mengikuti sistem pembayaran RAIDWEAR.
- Sumber: field order + invoice (lihat §13): `dp_desain_amount`/`dp_desain_verified`, `dp_produksi_amount`/`dp_produksi_verified`, `pelunasan_amount`/`pelunasan_verified`; invoice `no_invoice`, `sub_total`, `ppn_persen`/`ppn_amount`, `total`, `total_dibayar`, `sisa_tagihan`, `status_pembayaran`, `termin_pembayaran`.
- Ringkasan status pembayaran mengikuti logika yang ada: Lunas / DP 50% / Deposit Desain / Belum Bayar.
- Menampilkan info rekening brand (`bank_name`, `account_name`, `account_number`) agar customer bisa transfer.
- **Phase One:** tidak membuat workflow pembayaran baru, tidak mengubah invoice/kuitansi.

### 10.11 Informasi Pengiriman (shipping-support)
- Menampilkan informasi pengiriman saat tersedia: `tracking_number`, `shipped_at`.
- Alamat tujuan dari data customer (`alamat`, `kota`).
- Integrasi kurir / tracking real-time **di luar scope** Phase One.

### 10.12 Customer Support (shipping-support)
- Akses mudah menghubungi CS RAIDWEAR (WhatsApp `wa.me` dan/atau telepon, memakai nomor brand bila tersedia).
- Tujuan: mengurangi pertanyaan berulang, **bukan** menggantikan CS.

### 10.13 Mobile Experience
- Mobile adalah pengalaman utama (customer membuka dari link di aplikasi pesan).
- Prioritas mobile: hierarki informasi jelas, navigasi mudah, nyaman dibaca, mudah diinteraksi, tampilan desain & status jelas, akses cepat ke aksi.

### 10.14 Responsif
- Didukung di mobile, tablet, desktop.
- Bukan sekadar mengecilkan tampilan desktop: hierarki & pola interaksi tetap sesuai ukuran layar.

---

## 11. Pemetaan Istilah Sistem

Sepuluh tahap (urutan kanonik mengikuti `STAGES_ORDER` di [database.ts](file:///d:/APLIAKSI/RAIDWEAR/src/types/database.ts#L598-L609) dan constraint migrasi):

| # | Stage internal | Label ERP | Istilah customer (usulan) | Syarat selesai (system) |
|---|---|---|---|---|
| 1 | `customer_dp_desain` | Deposit Desain | Deposit Desain | `dp_desain_verified` |
| 2 | `proses_desain` | Proses Desain | Desain — menunggu ACC Anda | `mockup_url` terisi |
| 3 | `dp_produksi` | DP Produksi | Pembayaran DP Produksi (≥50%) | invoice + `dp_produksi_verified` + Form Order |
| 4 | `proses_layout` | Proses Layout | Penyiapan Layout | `layout_completed` |
| 5 | `antrean_produksi` | Antrean Produksi | Masuk Antrean Produksi (no. SPK) | `production_ready` |
| 6 | `print_press` | Print & Press | Proses Cetak | `print_completed` |
| 7 | `cutting_jahit` | Cutting & Jahit | Proses Cutting & Jahit | `sewing_completed` |
| 8 | `packing` | Packing | Packing & Pengecekan | `packing_completed` |
| 9 | `pelunasan` | Pelunasan | Menunggu Pelunasan | `pelunasan_verified` |
| 10 | `pengiriman` | Pengiriman | Dikirim | `tracking_number` + `shipped_at` |

Tahap gatekeeper pembayaran (mengikuti sistem): `dp_produksi` dan `pelunasan`.

Logika "aksi diperlukan" per tahap mengikuti [order-stage-readiness.ts](file:///d:/APLIAKSI/RAIDWEAR/src/lib/order-stage-readiness.ts).

---

## 12. Aturan Data & Tampilan

- Semua informasi berasal dari struktur order yang sudah ada. Jangan menambah informasi order baru hanya untuk presentasi.
- Bila istilah/fungsi sudah ada, pakai yang ada (jangan interpretasi alternatif).
- Sebelum implementasi, pelajari berkas acuan:
  - [database.ts](file:///d:/APLIAKSI/RAIDWEAR/src/types/database.ts) — struktur & field order/customer/brand/invoice
  - [order-stage-readiness.ts](file:///d:/APLIAKSI/RAIDWEAR/src/lib/order-stage-readiness.ts) — syarat kesiapan tiap tahap
  - [form-order.ts](file:///d:/APLIAKSI/RAIDWEAR/src/lib/form-order.ts) — durasi produksi 14 hari & kelengkapan Form Order
  - [KanbanBoard.tsx](file:///d:/APLIAKSI/RAIDWEAR/src/components/kanban/KanbanBoard.tsx) — urutan tahap & aturan gatekeeper
  - [brand-identity.ts](file:///d:/APLIAKSI/RAIDWEAR/src/lib/brand-identity.ts) — identitas brand publik

---

## 13. Struktur Data Simulasi

Mock mengikuti bentuk `OrderWithCustomer` yang sudah ada, agar integrasi nanti tidak perlu mendesain ulang pengalaman.

Ringkas field yang dipakai di portal (subset, sesuai ERP):

| Area | Field |
|---|---|
| Order | `id`, `order_description`, `total_quantity`, `stage`, `stage_entered_at`, `created_at`, `deadline`, `mockup_url`, `layout_url`, `design_notes`, `spk_number` |
| Desain versi | simulasi lokal (id, versi, gambar, waktu, status) |
| Progress | `layout_completed(_at)`, `production_ready(_at)`, `print_completed(_at)`, `sewing_completed(_at)`, `packing_completed(_at)` |
| Pembayaran | `dp_desain_amount`, `dp_desain_verified(_at)`, `dp_produksi_amount`, `dp_produksi_verified(_at)`, `pelunasan_amount`, `pelunasan_verified(_at)` |
| Pengiriman | `tracking_number`, `shipped_at` |
| Customer | `name`, `phone`, `alamat`, `kota` |
| Brand | `name`, `company_name`, `logo_url`, `phone`, `email`, `address`, `bank_name`, `account_name`, `account_number`, `primary_color`, `accent_color`, `secondary_color` |
| Invoice | `no_invoice`, `tanggal`, `sub_total`, `ppn_persen`, `ppn_amount`, `total`, `total_dibayar`, `sisa_tagihan`, `status_pembayaran`, `termin_pembayaran` |

Sediakan minimal 3–4 skenario mock untuk menguji adaptasi UI, mis.:
1. Menunggu ACC desain (ada aksi customer)
2. Menunggu pembayaran DP Produksi
3. Sedang produksi (tidak ada aksi)
4. Sudah dikirim (ada resi)

---

## 14. Arah Visual & Brand

- Mengikuti design system RAIDWEAR di [globals.css](file:///d:/APLIAKSI/RAIDWEAR/src/app/globals.css): warna brand merah (`--brand-primary` #dc2626, `--brand-gradient`), token surface/radius/shadow, utilitas `.surface`, `.badge`, `.btn-*`, tipografi.
- Identitas brand diambil dari `brands` (nama, logo, warna, kontak, rekening). Phase One memakai nilai simulasi dengan fallback ke identitas aplikasi.
- Kesan yang dituju: profesional, modern, premium, bersih, sederhana, terpercaya.
- Terasa terhubung dengan RAIDWEAR **tanpa** terlihat seperti dashboard ERP internal.
- Hindari kerumitan visual & dekorasi berlebihan.

---

## 15. Prioritas UX

Portal harus menjawab 4 pertanyaan ini segera:

1. **Di mana order saya?** — tahap saat ini langsung terlihat.
2. **Apakah saya perlu melakukan sesuatu?** — status aksi jelas.
3. **Apakah desain saya sudah benar?** — akses cepat ke desain terbaru & ACC.
4. **Apa yang terjadi selanjutnya?** — sisa perjalanan order jelas.

---

## 16. Definisi Selesai (Definition of Done) — Phase One

Phase One selesai bila portal menyediakan pengalaman customer-facing yang lengkap mencakup alur:

**Order → Desain → ACC → Produksi → Timeline → Pembayaran → Pengiriman**

dengan syarat:

- [ ] Mengikuti workflow, istilah, dan aturan bisnis RAIDWEAR yang ada
- [ ] Mendukung review desain
- [ ] Mendukung approval (ACC) desain
- [ ] Mendukung permintaan revisi
- [ ] Menampilkan progress produksi (10 tahap)
- [ ] Menampilkan timeline order
- [ ] Menampilkan informasi pembayaran yang relevan
- [ ] Menampilkan informasi pengiriman yang relevan
- [ ] Menyediakan akses Customer Service
- [ ] Berjalan baik di mobile & desktop
- [ ] Memakai data simulasi
- [ ] Tetap tanpa koneksi backend
- [ ] Tidak mengubah ERP yang ada

---

## 17. Boundaries

**Always (selalu):**
- Pakai istilah, urutan tahap, dan aturan kesiapan dari sistem yang ada
- Tambahkan berkas baru; jangan ubah berkas inti bersama
- Mobile-first & aksesibel (label, kontras, target sentuh memadai)
- Format mata uang `id-ID` dan tanggal Bahasa Indonesia
- Jalankan `npm run lint` dan `npm run build` sebelum menyatakan selesai

**Ask first (konfirmasi dulu):**
- Menambah dependency baru
- Mengubah berkas inti bersama bila benar-benar terpaksa
- Menentukan mekanisme versi desain final
- Menghubungkan ke data nyata / backend

**Never (jangan):**
- Menyentuh database / membuat migrasi / menjalankan perintah Supabase
- Mengubah `.github/workflows/fork-sync.yml`
- Menampilkan data internal / customer lain (lihat §7)
- Menulis rahasia apa pun ke kode atau variabel `NEXT_PUBLIC_*`
- Membuat alur revisi atau tahap produksi baru yang bertentangan dengan sistem

---

## 18. Perintah (Commands)

```bash
# Dev
npm run dev

# Lint (wajib lolos)
npm run lint

# Build (wajib lolos)
npm run build
```

---

## 19. Struktur Proyek (rencana berkas baru)

Hanya berkas **baru** (aman dari auto-sync fork):

```
src/app/lacak/[token]/
  page.tsx                 # Entry portal (server, resolve token -> mock order)
  PortalClient.tsx         # Komponen client utama (state ACC/revisi)
src/components/portal/
  PortalHeader.tsx         # Header brand + identitas order
  OrderSummary.tsx         # Ringkasan order & aksi diperlukan
  StageProgress.tsx        # Progress 10 tahap
  DesignReview.tsx         # Desain, versi, ACC, revisi
  ProductionTimeline.tsx   # Timeline kejadian
  PaymentInfo.tsx          # Informasi pembayaran
  ShippingSupport.tsx      # Pengiriman + kontak CS
src/lib/portal/
  types.ts                 # Tipe portal (subset order + mock)
  mock-orders.ts           # Data simulasi (beberapa skenario)
  stages.ts                # Pemetaan istilah customer <-> stage internal
```

Catatan: token mock dapat berupa id order contoh (mis. `demo-desain`, `demo-dp`, `demo-produksi`, `demo-kirim`).

---

## 20. Strategi Verifikasi

- `npm run lint` dan `npm run build` lolos.
- Cek manual di `npm run dev` untuk tiap skenario mock:
  - Tampilan mobile (≤640px) dan desktop
  - Alur ACC: konfirmasi jelas, tidak bisa ACC ganda
  - Alur revisi: hanya saat belum ACC
  - Progress 10 tahap konsisten dengan stage mock
  - Tidak ada data internal yang bocor ke halaman
- Tidak ada perubahan pada berkas ERP yang ada (verifikasi via `git status`).

---

## 21. Risiko & Pertanyaan Terbuka

1. **Riwayat versi desain** — sistem saat ini hanya menyimpan satu mockup aktif (`mockup_url`) + `design_notes`. Bagaimana versi desain seharusnya dipetakan saat integrasi? (Phase One: simulasi UI)
2. **Mekanisme ACC customer** — di sistem saat ini ACC tercermin dari `mockup_url` yang diisi ± catatan desain, tanpa entitas "approval customer" tersendiri. Perlu keputusan skema di fase integrasi.
3. **Token & autentikasi** — format token, masa berlaku, dan kontrol akses belum ditentukan (fase integrasi).
4. **Nomor CS & kanal** — apakah memakai nomor brand (`brands.phone`) atau nomor CS terpisah?
5. **Warna brand dinamis** — Phase One memakai tema merah bawaan; penerapan `primary_color`/`accent_color` brand per-tenant menyusul saat integrasi.

---

## 22. Instruksi Utama untuk Implementasi

1. Pelajari kode sumber & aplikasi RAIDWEAR yang ada terlebih dahulu.
2. Bangun Customer Portal di atas sistem yang sudah ada.
3. Jangan menciptakan workflow terpisah.
4. Jangan mengubah logika bisnis / ERP yang ada.
5. Jangan melakukan integrasi backend pada fase ini.
6. Fokus pada pengalaman customer-facing yang rapi & profesional, yang nantinya dapat disambungkan ke ERP RAIDWEAR.

**Sistem RAIDWEAR yang ada adalah sumber kebenaran.**
