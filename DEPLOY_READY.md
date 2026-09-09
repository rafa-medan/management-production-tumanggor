# Persiapan Deploy Online

Dokumen ini berisi langkah paling penting agar website dan backend siap dipindahkan ke hosting online tanpa menambah fitur baru.

## 1. Persiapan GitHub

Pastikan repo Anda sudah berisi file berikut:

- package.json
- render.yaml
- local-server.js
- index.html
- login.html
- .env.example
- .gitignore

Jangan upload file berikut ke repo:

- local-data/
- local-data/backups/
- .env
- .env.local
- file sensitif seperti credential, token, password, atau dokumen internal

## 2. Buat service di Render

1. Login ke Render.
2. Klik New -> Web Service.
3. Connect repositori GitHub Anda.
4. Gunakan konfigurasi berikut:

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

Health Check Path:

```bash
/health
```

## 3. Environment variables Render

Masukkan variabel berikut di panel Render Environment:

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=10000
SESSION_SECRET=nilai_acak_min_32_karakter
CORS_ORIGIN=https://domain-frontend-anda.com
```

Jika Anda sudah punya database live, tambahkan:

```bash
DATABASE_URL=postgresql://...
```

## 4. Verifikasi backend live

Setelah deploy, cek URL Render Anda:

```bash
https://nama-service.render.com/health
```

Harus memberi respons seperti:

```json
{"status":"ok","service":"management-production-local-api"}
```

## 5. Arahkan frontend ke URL live

Setelah backend live aktif, ganti URL API di file frontend:

- index.html
- login.html

Ubah dari localhost atau URL lama menjadi URL backend Render Anda, misalnya:

```javascript
const API_BASE = 'https://nama-service.render.com';
```

Lalu semua request login, register, chat, dan notifikasi harus ke URL live tersebut.

## 6. Smoke test setelah online

Setelah frontend mengarah ke URL live, lakukan pengecekan singkat:

1. Login superadmin
2. Login admin divisi
3. Registrasi internal
4. Dashboard terbuka
5. Chat AI menjawab dengan benar
6. Form notifikasi tidak error
7. Cek halaman kartu nama tidak rusak

## 7. Hal yang masih memerlukan akun eksternal

Fitur berikut tidak bisa aktif tanpa akun provider atau nilai nyata dari pihak ketiga:

- SMS provider
- WhatsApp provider
- SMTP email production
- domain/HTTPS live

## 8. Status akhir

Website sudah siap untuk masuk tahap online deployment, tetapi belum sepenuhnya live full sampai:

- domain tersedia
- hosting aktif
- API backend live
- credential eksternal siap

Semua yang berhubungan dengan fitur inti sudah siap dan diverifikasi lokal.
