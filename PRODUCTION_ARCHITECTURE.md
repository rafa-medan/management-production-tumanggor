# Arsitektur Produksi Management Production Tumanggor

Dokumen ini menetapkan rancangan produksi tanpa mengubah desain atau fitur website.

## Rancangan Terpilih

- Frontend: Cloudflare Pages
- DNS, CDN, HTTPS, WAF, dan DDoS: Cloudflare
- Backend: Node.js API pada cloud server/container
- Database: PostgreSQL managed dengan encryption at rest
- File/KTP/bukti pembayaran: object storage private dengan signed URL
- Monitoring: health check, error tracking, metrics, dan alert
- Legacy sementara: Google Apps Script/Spreadsheet tetap berjalan sampai migrasi selesai

## Alur Trafik

```text
Pengunjung
  -> Cloudflare DNS/CDN/WAF/DDoS/HTTPS
  -> Cloudflare Pages (HTML/CSS/JS)
  -> api.domain.tld
  -> Load balancer/reverse proxy
  -> Node.js API instances
  -> PostgreSQL + private object storage
```

## Urutan Implementasi

1. Daftarkan domain dan Cloudflare.
2. Aktifkan proxy Cloudflare, TLS mode Full (strict), WAF managed rules, dan rate limiting.
3. Deploy frontend statis ke Cloudflare Pages.
4. Buat server Node.js production terpisah dari `local-server.js`.
5. Pindahkan akun, produk, pesan, pembayaran, dan settings dari JSON ke PostgreSQL melalui migrasi teruji.
6. Pindahkan file/KTP/bukti pembayaran ke object storage private.
7. Ganti URL API frontend dari endpoint lokal ke `https://api.domain.tld` melalui environment configuration.
8. Tambahkan load balancer dan minimal dua instance Node.js setelah API stateless.
9. Jalankan backup terenkripsi, monitoring, health checks, dan load test bertahap.
10. Migrasikan Google Apps Script secara bertahap setelah API production stabil.

## Kebijakan Keamanan

- Semua koneksi publik wajib HTTPS/TLS.
- Password hanya disimpan sebagai hash kuat; secret hanya melalui environment/secret manager.
- Database tidak boleh terbuka ke internet umum.
- KTP, NIK, dan bukti pembayaran tidak boleh berada di URL publik.
- Signed URL harus memiliki masa berlaku pendek.
- WAF dan rate limit diterapkan pada login, registrasi, reset password, upload, dan endpoint mahal.
- Audit log disimpan append-only dan di-backup terpisah.
- Jangan mengunggah `local-data`, backup, password, atau credential ke Cloudflare Pages/repository publik.

## Target Kapasitas

Puluhan ribu pengguna tidak boleh diklaim sebelum load test. Target awal yang harus diuji:

- 100 concurrent users
- 1.000 concurrent users
- 10.000 concurrent users
- spike test dan recovery test

Hasil load test menentukan jumlah instance API, ukuran database, connection pool, cache, dan batas Cloudflare.

## Batasan Saat Ini

- Server lokal hanya untuk development dan berjalan di `127.0.0.1`.
- Belum ada domain atau akun Cloudflare yang terhubung.
- Belum ada provider cloud dan PostgreSQL production.
- Google Apps Script/Spreadsheet masih menjadi jalur legacy dan belum dimigrasikan.
- Dokumen ini tidak mengaktifkan DDoS/WAF secara otomatis; aktivasi membutuhkan akses ke layanan deployment.
