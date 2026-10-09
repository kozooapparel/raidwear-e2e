# Panduan Upgrade: Portal Lacak Customer

Panduan ini untuk **instance fork** RAIDWEAR yang ingin mendapatkan fitur
portal lacak customer (`/lacak/[token]`) beserta ACC layout.

> Penting: update kode dari upstream **tidak otomatis** mengubah database
> Supabase Anda. Langkah migrasi di bawah **wajib dijalankan manual**.

## 1. Tarik kode terbaru

```bash
git pull origin master
npm install
```

Tidak ada environment variable baru dan tidak ada dependency npm baru —
fitur ini memakai Supabase client dan RPC yang sudah ada.

## 2. Jalankan migrasi database

### Cara termudah — sekali paste (disarankan)

1. Buka Supabase Dashboard → **SQL Editor** → New query.
2. Salin **seluruh isi** `supabase/portal-upgrade-all-in-one.sql`.
3. Tempel, lalu klik **Run**.

Satu file, satu kali jalan, tidak perlu CLI dan tidak perlu urut-urutan.
Berkas itu sudah menggabungkan ketiga migrasi sesuai urutan yang benar.

### Cara Supabase CLI

```bash
supabase link --project-ref <ref-project-supabase-anda>
supabase db push
```

`db push` menjalankan ketiga migrasi sesuai urutan timestamp. Pilih ini bila
Anda sudah memakai alur migrasi berbasis CLI.

Semua pernyataan **idempotent** — aman dijalankan ulang bila ragu.

## 3. Prasyarat skema

Migrasi ini mengasumsikan tabel `orders`, `customers`, `brands`, `invoices`
sudah ada dengan kolom seperti `layout_url`, `layout_completed_at`,
`mockup_url`, `design_notes`, dan `spk_number` (dari migrasi upstream
sebelumnya).

Bila fork Anda tertinggal migrasi upstream atau sudah mengubah skema sendiri,
jalankan dari tes di environment staging terlebih dahulu.

## 4. Hal yang perlu diperhatikan

- **Menghapus kolom/fungsi lama.** Migrasi `010000` menghapus kolom
  `design_approved_at`, `design_revision_note`, `design_revision_requested_at`
  dan fungsi `approve_portal_design` / `request_portal_design_revision`. Bila
  kolom/fungsi itu belum pernah ada, langkah ini otomatis dilewati (aman).
  Backup database bila ada kekhawatiran.
- **Portal bersifat publik.** Migrasi memberi hak eksekusi fungsi pembaca
  portal ke role `anon`. Siapa pun yang mengetahui token 5 karakter dapat
  melihat data order, sehingga data pribadi customer (nama, telepon, alamat)
  sudah disamarkan sebagian. Data brand (kontak & rekening) **tidak**
  disamarkan karena memang dipakai customer untuk menghubungi admin dan
  pembayaran, jadi pastikan kolomnya tidak diisi data sensitif.
- **Gambar pratinjau.** Portal menampilkan gambar dari domain yang diizinkan
  di `next.config.ts` (`images.remotePatterns`). Bila Anda memakai domain R2 /
  storage sendiri, tambahkan hostname-nya di sana.
- **Token 5 karakter.** Token lama (32 karakter) otomatis diganti saat migrasi
  `020000` dijalankan. URL lacak yang sudah Anda kirim ke customer sebelumnya
  akan berubah — ambil token baru dari order.

## 5. Verifikasi

1. Buka satu order, salin token dari kolom `portal_token`.
2. Akses `/lacak/<token>` di aplikasi Anda.
3. Pastikan halaman tampil, layar layout & pembayaran muncul.
4. Saat order berstatus `proses_layout` dan gambar pratinjau layout ada,
   tombol "Setujui Layout" harus berfungsi.
