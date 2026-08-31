# 🏢 MultiCorp Enterprise Portal

![Status](https://img.shields.io/badge/Status-Production-green) ![Version](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-Proprietary-red)

Sistem manajemen enterprise terpadu dengan 10 fitur lengkap untuk mengelola bisnis multi-divisi dengan integrasi teknologi, jaringan, dan layanan kuliner.

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Struktur Proyek](#struktur-proyek)
- [Setup & Instalasi](#setup--instalasi)
- [Konfigurasi](#konfigurasi)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Tim Developer](#tim-developer)

---

## ⭐ Fitur Utama

### 1. **Video Divisi & Testimoni** 🎥
- Upload video dari Google Drive
- Galeri testimoni klien
- Support multiple divisi

### 2. **Contact Person Perusahaan** 👥
- Informasi kontak lengkap HQ
- Hotline 24 jam
- Email support
- Alamat kantor

### 3. **Social Media Management** 📱
- URL media sosial per divisi (YouTube, Facebook, Instagram, TikTok)
- Social media publik terintegrasi
- Link shortener

### 4. **Live Chat 24/7** 💬
- Admin support 24 jam dengan info nama & WhatsApp
- Auto-translate multi-bahasa
- Real-time messaging

### 5. **Katalog Produk & Harga** 📦
- Daftar produk per divisi
- Price list dinamis
- Filter & search functionality

### 6. **Metode Pembayaran** 💳
- **Bank Transfers**: BCA, BRI, BNI
- **E-Wallet**: GoPay, DANA
- **COD** (Cash on Delivery)
- Panduan pembayaran lengkap

### 7. **Company Profile** 🎓
- Visi & Misi
- Tujuan perusahaan
- Tahun berdiri (2018)
- Sejarah & pencapaian

### 8. **Grafik Data Penjualan** 📊
- Chart harian, bulanan, tahunan
- Real-time analytics
- Export data

### 9. **Developer Info** 💻
- Informasi pembuat website
- Tahun pembuatan (2026)
- Support & maintenance info

### 10. **Panduan Order** 📝
- Step-by-step instructions
- Form order online
- Tracking pemesanan

---

## 🏗️ Struktur Proyek

```
WEBSITE MANAGEMENT PRODUCTION/
├── index.html              # Halaman utama website
├── app.js                  # Backend Google Apps Script
├── README.md               # Dokumentasi ini
├── code gs.txt            # Backup code Google Apps Script
└── index.txt              # Backup HTML file
```

### File Descriptions

| File | Deskripsi |
|------|-----------|
| `index.html` | Frontend portal dengan design modern gold & dark theme |
| `app.js` | Backend logic untuk Google Sheets integration |
| `README.md` | Dokumentasi lengkap project |

---

## 🚀 Setup & Instalasi

### Prasyarat
- Google Apps Script account
- Google Sheets
- Web hosting (untuk deploy)
- Modern web browser

### Langkah 1: Setup Google Apps Script

```
1. Buka Google Sheets
2. Klik Tools → Script Editor
3. Copy file app.js ke Google Apps Script
4. Jalankan function setupSheets() untuk inisialisasi database
5. Deploy sebagai Web App
```

### Langkah 2: Deploy Web App

```
1. Di Script Editor: Deploy → New Deployment
2. Pilih "Web app"
3. Execute as: Anda sendiri
4. Accessible to: Siapa saja
5. Copy deployment URL
```

### Langkah 3: Update HTML

```html
<!-- Ganti [YOUR_SCRIPT_URL] dengan URL dari step 2 -->
<script>
const API_URL = '[YOUR_SCRIPT_URL]';
</script>
```

### Langkah 4: Deploy Frontend

```
1. Upload index.html ke web hosting
2. Atau gunakan GitHub Pages untuk hosting gratis
3. Test koneksi dengan Google Apps Script
```

---

## ⚙️ Konfigurasi

### Settings Sheet

Semua konfigurasi dapat diubah melalui Sheet "Settings":

```
KEY | VALUE
LOGO_URL | [URL Logo Perusahaan]
BG_URL | [URL Background Image]
CONTACT_PERSON | {"hotline": "...", "email": "..."}
SOCMED_PUBLIC | {"youtube": "...", "facebook": "..."}
REKENING_INFO | {"BCA": "...", "BRI": "..."}
COMPANY_PROFILE | {"visi": "...", "misi": [...]}
```

### Default Admin Users

| Username | Password | Role | Divisi |
|----------|----------|------|--------|
| superadmin | admin123 | SUPER_ADMIN | ALL |
| admin_it | it123 | ADMIN_DIVISI | IT Program |
| admin_net | net123 | ADMIN_DIVISI | Network |
| admin_food | food123 | ADMIN_DIVISI | Nusantara Food |

### Divisi

1. **IT Program** - Solusi Teknologi Informasi
2. **Network** - Infrastruktur Jaringan Komunikasi
3. **Nusantara Food** - Layanan Kuliner Nusantara

---

## 📡 API Documentation

### POST Requests

#### 1. Login
```javascript
POST /script/url

Body: {
  "action": "LOGIN",
  "username": "superadmin",
  "password": "admin123"
}

Response: {
  "status": "success",
  "user": {
    "username": "superadmin",
    "nama": "Super Administrator",
    "role": "SUPER_ADMIN",
    "divisi": "ALL",
    "email": "superadmin@multicorp.com"
  }
}
```

#### 2. Submit Pesan/Order
```javascript
POST /script/url

Body: {
  "action": "SUBMIT_PESAN",
  "divisi": "IT Program",
  "nama": "John Doe",
  "email": "john@example.com",
  "telepon": "0812-1234-5678",
  "pesan": "Saya ingin konsultasi IT"
}

Response: {
  "status": "success",
  "id": "MSG-1725080400000",
  "timestamp": "2026-08-31T12:00:00Z"
}
```

#### 3. Get Settings
```javascript
POST /script/url

Body: {
  "action": "GET_SETTINGS"
}

Response: {
  "LOGO_URL": "...",
  "CONTACT_PERSON": {...},
  "SOCMED_PUBLIC": {...},
  "REKENING_INFO": {...}
}
```

#### 4. Get Chart Data
```javascript
POST /script/url

Body: {
  "action": "GET_CHART_DATA"
}

Response: {
  "divisiCount": {"IT Program": 5, "Network": 3},
  "dailyCount": {"Sat Aug 31 2026": 8},
  "totalPesan": 12
}
```

---

## 💾 Database Schema

### Sheet: Pesan (Messages/Orders)
| Column | Type | Deskripsi |
|--------|------|-----------|
| ID | String | ID unik pesan (MSG-timestamp) |
| Timestamp | DateTime | Waktu pesan dikirim |
| Divisi | String | Divisi yang diminta |
| Nama | String | Nama pengirim |
| Email | String | Email pengirim |
| Telepon | String | No. telpon pengirim |
| Pesan | String | Isi pesan |
| Status | String | Status: NEW, PROCESSING, COMPLETED |

### Sheet: Users
| Column | Type | Deskripsi |
|--------|------|-----------|
| Username | String | Username login |
| Password | String | Password (encrypted recommended) |
| Nama | String | Nama lengkap |
| Role | String | SUPER_ADMIN, ADMIN_DIVISI, CUSTOMER |
| Divisi | String | Divisi terkait |
| Telepon | String | Nomor telepon |
| Email | String | Email |
| Alamat | String | Alamat |
| Institusi | String | Institusi/Perusahaan |
| Jabatan | String | Jabatan |
| KodeVerifikasi | String | Kode verifikasi |
| StatusVerifikasi | String | VERIFIED, PENDING |

### Sheet: ClientsPartners
| Column | Type | Deskripsi |
|--------|------|-----------|
| Username | String | Username login |
| Password | String | Password |
| Nama | String | Nama klien/partner |
| Role | String | PARTNER, CUSTOMER |
| Telepon | String | Kontak |
| Email | String | Email |
| Alamat | String | Alamat |
| Institusi | String | Institusi |
| Jabatan | String | Jabatan |
| KodeVerifikasi | String | Kode verifikasi |
| StatusVerifikasi | String | Status verifikasi |

### Sheet: Settings
| Column | Type | Deskripsi |
|--------|------|-----------|
| Key | String | Nama setting |
| Value | String/JSON | Nilai setting |

---

## 🎨 Design Theme

### Color Palette
```
Primary Gold: #d4af37
Gold Light: #f3e5ab
Gold Accent: #e5c158
Dark Background: #0a0a0b
Card Background: #141416
Text Primary: #ffffff
Text Muted: #d1d5db
```

### Responsive Design
- Mobile-first approach
- Tablet optimized
- Desktop enhanced experience
- Dark theme by default

---

## 📞 Live Chat Admin

### Operasional 24/7

| Admin | Divisi | WhatsApp | Jam Kerja |
|-------|--------|----------|-----------|
| Budi Hartanto | IT Program | 0812-1111-2222 | 06:00 - 18:00 |
| Siti Nurhaliza | Network | 0812-3333-4444 | 09:00 - 21:00 |
| Rezza Habibi | Nusantara Food | 0812-5555-6666 | 08:00 - 20:00 |

---

## 💳 Metode Pembayaran

### Bank Transfers
- **BCA**: 123-456-7890 (a.n MultiCorp)
- **BRI**: 0987-6543-21 (a.n MultiCorp)
- **BNI**: 555-444-333 (a.n MultiCorp)

### E-Wallet
- **GoPay**: 0812-6263-9095
- **DANA**: 0812-6263-9095

### Kontak Support
- **Hotline**: 0812-6263-9095
- **Email**: support@multicorp.com
- **Lokasi**: Gd. MultiCorp Lt. 10, Jakarta

---

## 🌐 Social Media

### Public Links
- YouTube: https://youtube.com/@multicorp
- Facebook: https://facebook.com/multicorp
- Instagram: https://instagram.com/multicorp
- TikTok: https://tiktok.com/@multicorp

### Per Divisi
- **IT Program**: @multicorp_it
- **Network**: @multicorp_net
- **Nusantara Food**: @nusantara.food

---

## 📊 Panduan Order

### 10 Langkah Pemesanan:

1. **Pilih Divisi & Layanan** - Browse katalog produk
2. **Hubungi Support** - Atau isi form "Pesan"
3. **Isi Form Lengkap** - Nama, email, telepon, kebutuhan
4. **Terima Quotation** - Dalam 24 jam
5. **Approve Proposal** - Review & setujui
6. **Lakukan Pembayaran** - Pilih metode
7. **Kirim Bukti Bayar** - Via form atau WhatsApp
8. **Proses Dimulai** - Sesuai timeline
9. **Update Progress** - Laporan berkala
10. **Feedback & Review** - Testimoni Anda

---

## 👨‍💼 Company Profile

**MultiCorp Enterprise** | Est. 2018

### Visi
Menjadi korporasi terdepan di Asia Tenggara yang mengintegrasikan inovasi teknologi dan layanan terbaik dalam setiap aspek bisnis.

### Misi
1. Memberikan layanan berkualitas tinggi yang melebihi ekspektasi
2. Berinovasi tanpa henti dalam mengembangkan solusi bisnis
3. Membangun hubungan jangka panjang dengan mitra dan pelanggan
4. Memberdayakan tim dengan pelatihan berkelanjutan

### Tujuan
Meningkatkan efisiensi operasional dan kepuasan pelanggan melalui solusi terintegrasi yang inovatif dan berkelanjutan.

---

## 👨‍💻 Tim Developer

**Dibuat oleh**: MultiCorp IT System Team  
**Tahun**: 2026  
**Version**: 1.0.0  
**Email Support**: dev@multicorp.com

### Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Charts**: Chart.js
- **Icons**: Font Awesome 6.4.0

---

## 📝 License

© 2026 MultiCorp Enterprise. All rights reserved.

Proprietary Software - Unauthorized copying, modification, or distribution is prohibited.

---

## 📞 Support & Feedback

- **Website Support**: support@multicorp.com
- **Developer Support**: dev@multicorp.com
- **Hotline**: 0812-6263-9095
- **Office Hours**: 24/7

---

## 🔄 Version History

### v1.0.0 (2026-08-31)
- ✅ Initial release
- ✅ 10 core features implemented
- ✅ Google Sheets integration
- ✅ Live chat functionality
- ✅ Payment gateway integration
- ✅ Real-time analytics
- ✅ Responsive design

---

## 📚 Additional Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Bootstrap 5 Docs](https://getbootstrap.com/docs/5.3/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Font Awesome Icons](https://fontawesome.com/)

---

**Last Updated**: 2026-08-31  
**Maintained by**: MultiCorp IT System Team  
**Status**: Active Production ✅

