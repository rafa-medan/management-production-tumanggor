# 🌐 MultiCorp Enterprise Portal - Struktur Website

## 📍 Link & Navigasi Lengkap

### 🏠 **Halaman Utama (HOME)**
**File**: `index.html` atau `index-portal.html`  
**URL**: `/index.html` atau `/index-portal.html`  
**Tipe**: Public (Semua orang bisa akses)  
**Deskripsi**: 
- Landing page website
- Informasi perusahaan
- 10 Fitur unggulan
- Call to action ke login

---

## 🔐 **Sistem Login & Admin**

### 1️⃣ Halaman Login
**File**: `login.html`  
**URL**: `/login.html`  
**Tipe**: Public  
**Fitur**:
- Form login dengan validasi
- 4 Demo accounts siap pakai
- Remember me functionality
- Auto-redirect ke dashboard setelah login

**Demo Accounts**:
```
👑 Super Admin
   Username: superadmin
   Password: admin123
   
💻 Admin IT Program
   Username: admin_it
   Password: it123
   
🌐 Admin Network
   Username: admin_net
   Password: net123
   
🍜 Admin Nusantara Food
   Username: admin_food
   Password: food123
```

### 2️⃣ Dashboard Admin
**File**: `dashboard.html`  
**URL**: `/dashboard.html?user=USERNAME`  
**Tipe**: Private (Harus login)  
**Fitur**:
- 📊 Real-time statistics & analytics
- 📈 Multiple charts (Chart.js)
- 📋 Sidebar navigation
- 📧 Pesan masuk management
- 📦 Katalog produk
- 💳 Payment management
- 👤 User profile
- ⚙️ Settings & preferences
- 🔐 Security options

**Sections di Dashboard**:
1. Dashboard (Overview)
2. Pesan Masuk (Messages)
3. Katalog Produk (Products)
4. Pembayaran (Payments)
5. Analytics (Reports)
6. Profil Saya (My Profile)
7. Pengaturan (Settings)

---

## 📄 **Dokumentasi & Backend**

### 1️⃣ README
**File**: `README.md`  
**Deskripsi**: Dokumentasi lengkap project termasuk:
- Setup instructions
- Database schema
- API documentation
- Tech stack
- Live chat info
- Payment methods
- Company profile

### 2️⃣ Backend Script
**File**: `app.js`  
**Tipe**: Google Apps Script  
**Fungsi**:
- Setup sheets & database
- Login & autentikasi
- Handle pesan/order
- Get settings
- Analytics & chart data
- Email & SMS functions

---

## 📊 **Sitemap & URL Structure**

```
📁 ROOT
├── index.html                (Halaman Utama - Redirect)
├── index-portal.html         (Home Portal + Link Directory)
├── login.html                (Login Page - PUBLIC)
├── dashboard.html            (Admin Dashboard - PRIVATE)
├── app.js                    (Google Apps Script Backend)
├── README.md                 (Dokumentasi)
├── SITEMAP.md               (File ini - Struktur Website)
├── code gs.txt              (Backup Code)
└── index.txt                (Backup HTML)
```

---

## 🔗 **Quick Links**

| Halaman | URL | Tipe | Icon |
|---------|-----|------|------|
| Home Portal | `/index-portal.html` | Public | 🏠 |
| Login | `/login.html` | Public | 🔐 |
| Dashboard Super Admin | `/dashboard.html?user=superadmin` | Private | 👑 |
| Dashboard Admin IT | `/dashboard.html?user=admin_it` | Private | 💻 |
| Dashboard Admin Network | `/dashboard.html?user=admin_net` | Private | 🌐 |
| Dashboard Admin Food | `/dashboard.html?user=admin_food` | Private | 🍜 |
| Dokumentasi | `/README.md` | Public | 📖 |

---

## 🚀 **Cara Akses Website**

### **1. Local Development**
```bash
# Buka di browser
file:///d:/Website%20Rafa/WEBSITE%20MANAGEMENT%20PRODUCTION/index-portal.html
```

### **2. Hosted Online**
```
Sesuaikan dengan domain hosting Anda:
https://www.contoh-domain.com/
https://www.contoh-domain.com/login.html
https://www.contoh-domain.com/dashboard.html
```

### **3. Quick Demo**
Klik langsung ke demo:
- [Home Portal](./index-portal.html)
- [Login Page](./login.html)
- [Dashboard](./dashboard.html?user=superadmin)

---

## 🎯 **User Flow**

### **Non-Login User**
```
Home Portal
    ↓
Browse Features
    ↓
Click Login Button
    ↓
Login Page
```

### **Admin User**
```
Login Page
    ↓ (Enter credentials)
Dashboard
    ↓
- View Statistics
- Manage Messages
- View Products
- Check Payments
- See Analytics
- Update Profile
- Change Settings
    ↓
Logout
```

---

## 🔧 **Technical Stack**

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript, Bootstrap 5 |
| **Backend** | Google Apps Script |
| **Database** | Google Sheets |
| **Charts** | Chart.js |
| **Icons** | Font Awesome 6.4.0 |
| **Styling** | Custom CSS + Bootstrap |

---

## 🌐 **Deployment Options**

### **Option 1: GitHub Pages (Free)**
```
1. Upload semua file ke GitHub repository
2. Enable GitHub Pages di settings
3. Website live di: https://username.github.io/repo-name/
```

### **Option 2: Hosting Berbayar**
```
1. Upload ke hosting (Hostinger, Niagahoster, etc)
2. Configure domain
3. Deploy Google Apps Script
4. Website live di: https://domain.com/
```

### **Option 3: Local Development**
```
1. Simpan semua file di folder lokal
2. Buka index-portal.html di browser
3. Test semua fungsi
```

---

## 📋 **Checklist Deployment**

- [ ] Semua file HTML sudah di upload
- [ ] File app.js sudah di Google Apps Script
- [ ] Google Sheets database sudah siap
- [ ] Demo accounts sudah di setup
- [ ] Email & email notifications configured
- [ ] Payment methods sudah ter-list
- [ ] Domain sudah pointing ke hosting
- [ ] SSL certificate installed
- [ ] Email support address configured
- [ ] Documentation updated

---

## 💬 **Support & Maintenance**

**Website Support**: support@multicorp.com  
**Developer Support**: dev@multicorp.com  
**Hotline**: 0812-6263-9095  
**Office Hours**: 24/7

---

## 📅 **Version History**

### v1.0.0 (2026-08-31)
- ✅ Website launched
- ✅ Login system implemented
- ✅ Admin dashboard created
- ✅ All 10 features integrated
- ✅ Demo accounts ready
- ✅ Documentation complete

---

**Last Updated**: 2026-08-31  
**Status**: Production Ready ✅
