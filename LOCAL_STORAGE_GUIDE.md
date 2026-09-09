# Penyimpanan Lokal Website

Website ini dapat dijalankan dalam mode lokal tanpa Google Apps Script atau layanan berbayar.

## Menjalankan

1. Pastikan Node.js sudah terpasang.
2. Jalankan `START_SERVER.bat`.
3. Buka `http://127.0.0.1:8000/index-portal.html`.
4. Jangan membuka file HTML dengan `file://` jika ingin perubahan tersimpan ke folder project.

## Lokasi Data

Semua data yang ditulis oleh dashboard disimpan di folder `local-data`:

- `products.json`: katalog dan kontak produk
- `settings.json`: pengaturan perusahaan, rekening, dan branding
- `sales.json`: data penjualan
- `payments.json`: bukti pembayaran
- `files.json`: berkas yang diunggah
- `messages.json`: riwayat chat lokal
- `audit-log.json`: catatan aktivitas
- `notifications.json`: notifikasi order dan pembayaran di dashboard
- `users.json`: akun login lokal
- `backups/`: maksimal 20 backup terakhir per file sebelum perubahan

File `products-data.json` tetap menjadi data awal/fallback dan tidak dihapus.

## Catatan

- Server hanya dapat diakses dari komputer ini melalui `127.0.0.1`.
- Browser storage tetap dipakai sebagai fallback saat server lokal tidak aktif.
- Salin folder `local-data` untuk membuat backup.
- Backup otomatis dibuat sebelum setiap penulisan data melalui server lokal.
- Login melalui `127.0.0.1` memakai endpoint lokal dan membaca `users.json`.
- Super Admin dapat mengatur status aktif dan izin admin divisi dari Dashboard > Pengaturan.
- Izin yang tersedia: Upload, Contact, Products, Payments, dan Analytics.
- Setiap akun dapat mengunggah tanda tangan sendiri dari Dashboard > Profil Saya.
- QR kartu nama berisi kode verifikasi identitas akun; foto tanda tangan tetap disimpan per akun.
- Pastikan seluruh akun di `users.json` memakai password kuat sebelum penggunaan nyata.
- Jangan mengunggah `local-data` ke hosting publik karena dapat berisi data pengguna dan bukti pembayaran.
- Data lokal belum dapat dibagikan otomatis antar komputer.
