# Rencana Deployment Render

Target: memindahkan website dari server lokal ke arsitektur production tanpa mengubah desain atau alur fitur.

## Komponen

- Frontend: Cloudflare Pages atau static hosting.
- API: Render Web Service berbasis Node.js.
- Database: Render PostgreSQL.
- File privat: object storage compatible S3, bukan folder `local-data`.
- DNS/WAF/TLS: Cloudflare setelah domain tersedia.

## Tahap Aman

### 1. Persiapan repository

Jangan upload:

- `local-data/`
- `local-data/backups/`
- file credential atau password
- arsip ZIP yang berisi data internal
- `akun mpt.txt` atau file sejenis

Source production harus memakai environment variables untuk:

- `DATABASE_URL`
- `SESSION_SECRET`
- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`
- `CORS_ORIGIN`

### 2. PostgreSQL

Buat schema terpisah untuk:

- users dan roles
- products dan settings
- messages dan sales
- payments dan files
- audit logs
- identity verification

Migrasi JSON wajib diuji ke database staging terlebih dahulu. File KTP dan bukti pembayaran tidak disimpan sebagai URL publik.

### 3. API Render

API production harus:

- listen pada `process.env.PORT` dan host `0.0.0.0`;
- memakai session store terpusat, bukan `Map` memory-only;
- memakai PostgreSQL transaction untuk perubahan akun dan status;
- memiliki health endpoint `/health`;
- membatasi CORS ke origin frontend;
- menerapkan rate limit login, reset password, upload, dan endpoint mahal;
- memakai signed URL singkat untuk file privat;
- mengirim log tanpa password, NIK penuh, token, atau isi KTP.

Perintah awal Render:

```text
Build Command: npm install
Start Command: npm start
```

### 4. Frontend

URL API production harus dikonfigurasi melalui satu nilai environment/build, misalnya:

```text
https://api.example-domain.tld
```

Jangan mengarahkan frontend production ke `127.0.0.1` atau `/api` lokal secara permanen.

### 5. Cloudflare setelah domain tersedia

- Tambahkan domain ke Cloudflare.
- Arahkan DNS API ke Render.
- Aktifkan proxy Cloudflare.
- TLS: Full (strict).
- Aktifkan managed WAF rules.
- Tambahkan rate limit untuk login, reset password, registrasi, upload, dan API mahal.
- Aktifkan cache hanya untuk asset statis/public; jangan cache response akun, pembayaran, KTP, atau API privat.

### 6. Pengujian sebelum go-live

Uji staging dengan urutan:

1. Login semua role.
2. Registrasi partner/customer dengan pilihan divisi.
3. Lock setelah 5 kegagalan dan reaktivasi sesuai divisi.
4. Reset password pada kegagalan ke-3/4.
5. Upload KTP, signature, dan bukti pembayaran.
6. Pastikan user tidak dapat membaca data user lain.
7. Backup dan restore database.
8. Load test 100, 1.000, lalu 10.000 concurrent users.
9. Spike test dan recovery test.

## Status Saat Ini

- Provider: Render dipilih.
- Domain: belum tersedia.
- Database PostgreSQL production: belum dibuat.
- API production: belum dimigrasikan dari `local-server.js`.
- Cloudflare WAF/CDN/TLS: belum dapat diaktifkan tanpa domain.
- Google Apps Script: tetap legacy sementara.
