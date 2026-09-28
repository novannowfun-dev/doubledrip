# Panduan Setup Supabase & Google Sheets — DoubleDrip Bake & Brew

Panduan ini berisi instruksi praktis untuk menghubungkan webapp **DoubleDrip** ke Supabase & Google Sheets.

---

## 1. Setup Supabase
1. Daftar/Login di [supabase.com](https://supabase.com).
2. Buat Project Baru: `doubledrip-cafe` (Region: Singapore).
3. Buka **SQL Editor**, buka file `supabase_schema.sql` yang ada di folder ini, lalu copy-paste dan klik **Run**.
4. Buka **Project Settings** > **API**, salin:
   - `Project URL`
   - `anon public key`
5. Masukkan ke file `.env` atau langsung di menu **Pengaturan** di dalam webapp.

---

## 2. Setup Google Sheets (Webhook Auto-Sync)
1. Buka [sheets.new](https://sheets.new) di browser Anda.
2. Buat header baris 1:
   `Tanggal | Shift | Kasir | Gross Sales | Diskon | Net Sales | Cash | QRIS | EDC | Delivery | Transfer | Modal Awal | Kas Keluar | Kas Fisik | Selisih Kas | Catatan | Waktu Submit`
3. Klik **Extensions** > **Apps Script**, paste kode dari `google_apps_script.js`.
4. Klik **Deploy** > **New Deployment** > Type: **Web app**.
5. Set **Who has access** ke **Anyone**, lalu Deploy dan salin Web App URL.
6. Masukkan Web App URL tersebut ke menu Pengaturan di webapp.

Setiap kali kasir input data omset, data otomatis masuk ke Supabase DAN Google Sheets secara real-time!
