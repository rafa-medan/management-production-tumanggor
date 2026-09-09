# Setup Staging Render

Panduan ini untuk staging, bukan cutover production. Sistem lokal tetap berjalan seperti biasa.

## 1. Buat PostgreSQL

1. Login ke Render.
2. Pilih **New > PostgreSQL**.
3. Nama: `mpt-staging-db`.
4. Pilih region terdekat dengan target pengguna.
5. Gunakan paket paling kecil untuk pengujian awal.
6. Setelah database aktif, buka koneksi internal Render.
7. Jalankan isi `database/schema.sql` menggunakan koneksi staging.

Jangan menaruh connection string di repository atau file HTML.

## 2. Buat API Service

API production belum boleh diarahkan langsung ke `local-server.js` karena file JSON dan session memory belum cocok untuk multi-instance. Buat service API setelah adapter PostgreSQL selesai.

Konfigurasi target:

```text
Service type: Web Service
Runtime: Node
Build command: npm ci
Start command: npm start
Health path: /health
```

## 3. Secrets Render

Masukkan melalui Render Environment, bukan source code:

```text
NODE_ENV=staging
HOST=0.0.0.0
DATABASE_URL=<Internal Database URL dari Render>
SESSION_SECRET=<random secret minimal 32 byte>
CORS_ORIGIN=<URL frontend staging>
OBJECT_STORAGE_ENDPOINT=<private object storage endpoint>
OBJECT_STORAGE_BUCKET=<private bucket>
OBJECT_STORAGE_ACCESS_KEY=<secret>
OBJECT_STORAGE_SECRET_KEY=<secret>
```

## 4. Smoke Test Staging

- Health endpoint merespons `200`.
- Login `superadmin` berhasil.
- Tidak ada password plaintext pada response.
- Login admin divisi hanya melihat data divisinya.
- Partner/customer memiliki divisi layanan yang benar.
- Lock pada kegagalan ke-5 tetap berlaku.
- Reaktivasi hanya bisa dilakukan oleh admin yang berwenang.
- Upload KTP dan bukti pembayaran menghasilkan object key private.
- Signed URL file memiliki masa berlaku pendek.
- Audit log tidak menyimpan password, token, NIK penuh, atau isi KTP.

## 5. Larangan Sebelum Migrasi Selesai

- Jangan menghapus server lokal.
- Jangan mengubah URL frontend aktif.
- Jangan menonaktifkan Google Apps Script.
- Jangan mengunggah `local-data/` atau `backups/`.
- Jangan mengklaim dukungan puluhan ribu pengguna sebelum load test.

## Status

- Akun Render: belum dibuat.
- Database staging: belum dibuat.
- API staging: belum dibuat.
- Domain: belum tersedia.
- URL Render sementara dapat digunakan untuk pengujian setelah service benar-benar dibuat.
