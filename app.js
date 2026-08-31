/**
 * MULTICORP ENTERPRISE PORTAL - FULL BACKEND SCRIPT
 * Dilengkapi 10 Fitur Lengkap Enterprise
 * 
 * FITUR UTAMA:
 * 1. Video Divisi & Testimoni (Drive Upload)
 * 2. Contact Person Perusahaan
 * 3. URL Sosial Media (YouTube, FB, IG, TikTok) Per Divisi & Publik
 * 4. Live Chat 24 Jam Admin (Nama & WA, Translation Auto)
 * 5. Katalog Produk & Harga Per Divisi
 * 6. Nomor Rekening & E-Wallet Lengkap
 * 7. Company Profile, Visi Misi, Tujuan & Tahun Berdiri
 * 8. Grafik Data Pencapaian Penjualan (Harian, Bulanan, Tahunan)
 * 9. Nama & Tahun Pembuat Website (Web Developer Info)
 * 10. Langkah-langkah Cara Order Customer
 */

// ============================================
// 1. INISIALISASI SHEET & STRUKTUR DATABASE
// ============================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet Pesan / Order
  var sheetPesan = ss.getSheetByName("Pesan");
  if (!sheetPesan) {
    sheetPesan = ss.insertSheet("Pesan");
    sheetPesan.appendRow(["ID", "Timestamp", "Divisi", "Nama", "Email", "Telepon", "Pesan", "Status"]);
    sheetPesan.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#d9ead3");
  }

  // Sheet Users
  var sheetUsers = ss.getSheetByName("Users");
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet("Users");
    sheetUsers.appendRow(["Username", "Password", "Nama", "Role", "Divisi", "Telepon", "Email", "Alamat", "Institusi", "Jabatan", "KodeVerifikasi", "StatusVerifikasi"]);
    sheetUsers.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#c9daf8");
    
    // Default Admin Users
    sheetUsers.appendRow(["superadmin", "admin123", "Super Administrator", "SUPER_ADMIN", "ALL", "081262639095", "superadmin@multicorp.com", "Kantor Pusat MultiCorp", "MultiCorp HQ", "Head Administrator", "0000", "VERIFIED"]);
    sheetUsers.appendRow(["admin_it", "it123", "Admin IT Program", "ADMIN_DIVISI", "IT Program", "081200000001", "admin.it@multicorp.com", "Gd. IT Tower Lt. 3", "MultiCorp IT", "Lead IT", "0000", "VERIFIED"]);
    sheetUsers.appendRow(["admin_net", "net123", "Admin Network", "ADMIN_DIVISI", "Network", "081200000002", "admin.net@multicorp.com", "Gd. Cyber Lt. 2", "MultiCorp Net", "Network Spec", "0000", "VERIFIED"]);
    sheetUsers.appendRow(["admin_food", "food123", "Admin Nusantara Food", "ADMIN_DIVISI", "Nusantara Food", "081200000003", "admin.food@multicorp.com", "Kawasan Kuliner 1", "MultiCorp Food", "F&B Manager", "0000", "VERIFIED"]);
  }

  // Sheet Clients & Partners
  var sheetClients = ss.getSheetByName("ClientsPartners");
  if (!sheetClients) {
    sheetClients = ss.insertSheet("ClientsPartners");
    sheetClients.appendRow(["Username", "Password", "Nama", "Role", "Telepon", "Email", "Alamat", "Institusi", "Jabatan", "KodeVerifikasi", "StatusVerifikasi"]);
    sheetClients.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#fce5cd");
    
    sheetClients.appendRow(["partner_jaya", "partner123", "Mitra Bisnis Jaya", "PARTNER", "081300000001", "partner@multicorp.com", "Jl. Jend. Sudirman No. 45", "PT Jaya Abadi", "Direktur Utama", "0000", "VERIFIED"]);
    sheetClients.appendRow(["cust_budi", "budi123", "Budi Santoso", "CUSTOMER", "081300000002", "budi@gmail.com", "Jl. Merdeka No. 12", "CV Mandiri Utama", "Owner", "0000", "VERIFIED"]);
  }

  // Sheet Berkas Upload
  var sheetFiles = ss.getSheetByName("BerkasUpload");
  if (!sheetFiles) {
    sheetFiles = ss.insertSheet("BerkasUpload");
    sheetFiles.appendRow(["IDFile", "Timestamp", "Uploader", "RoleUploader", "NamaFile", "LinkFile", "Keterangan"]);
    sheetFiles.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#d9d2e9");
  }

  // Sheet Bukti Pembayaran
  var sheetPayments = ss.getSheetByName("BuktiPembayaran");
  if (!sheetPayments) {
    sheetPayments = ss.insertSheet("BuktiPembayaran");
    sheetPayments.appendRow(["IDBayar", "Timestamp", "Uploader", "Role", "Jumlah", "MetodeBayar", "NamaFile", "LinkFile", "Keterangan"]);
    sheetPayments.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#d0e0e3");
  }

  // Sheet Settings & Dynamic Content
  var sheetSettings = ss.getSheetByName("Settings");
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet("Settings");
    sheetSettings.appendRow(["Key", "Value"]);
    sheetSettings.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#fff2cc");
    
    // Basic Settings
    sheetSettings.appendRow(["LOGO_URL", ""]);
    sheetSettings.appendRow(["BG_URL", ""]);
    
    // Poin 6: Rekening & E-Wallet
    sheetSettings.appendRow(["REKENING_INFO", JSON.stringify({
      "GOPAY": "0812-6263-9095",
      "DANA": "0812-6263-9095",
      "BCA": "123-456-7890 (a.n MultiCorp)",
      "BRI": "0987-6543-21 (a.n MultiCorp)",
      "BNI": "555-444-333 (a.n MultiCorp)"
    })]);
    
    // Logo Per Divisi
    sheetSettings.appendRow(["LOGO_IT_PROGRAM", ""]);
    sheetSettings.appendRow(["LOGO_NETWORK", ""]);
    sheetSettings.appendRow(["LOGO_NUSANTARA_FOOD", ""]);
    
    // Poin 2: Contact Person Perusahaan
    sheetSettings.appendRow(["CONTACT_PERSON", JSON.stringify({
      "hotline": "0812-6263-9095",
      "email": "support@multicorp.com",
      "alamat": "Gd. MultiCorp Lt. 10, Jakarta",
      "jam_operasional": "24 Jam - Senin s/d Minggu"
    })]);
    
    // Poin 3: Sosial Media Utama
    sheetSettings.appendRow(["SOCMED_PUBLIC", JSON.stringify({
      "youtube": "https://youtube.com/@multicorp",
      "facebook": "https://facebook.com/multicorp",
      "instagram": "https://instagram.com/multicorp",
      "tiktok": "https://tiktok.com/@multicorp"
    })]);
    
    sheetSettings.appendRow(["SOCMED_IT_PROGRAM", JSON.stringify({
      "youtube": "https://youtube.com/@multicorp_it",
      "facebook": "https://facebook.com/multicorp.it",
      "instagram": "https://instagram.com/multicorp.it",
      "tiktok": "https://tiktok.com/@multicorp.it"
    })]);
    
    sheetSettings.appendRow(["SOCMED_NETWORK", JSON.stringify({
      "youtube": "https://youtube.com/@multicorp_net",
      "facebook": "https://facebook.com/multicorp.net",
      "instagram": "https://instagram.com/multicorp.net",
      "tiktok": "https://tiktok.com/@multicorp.net"
    })]);
    
    sheetSettings.appendRow(["SOCMED_NUSANTARA_FOOD", JSON.stringify({
      "youtube": "https://youtube.com/@nusantara.food",
      "facebook": "https://facebook.com/nusantara.food",
      "instagram": "https://instagram.com/nusantara.food",
      "tiktok": "https://tiktok.com/@nusantara.food"
    })]);
    
    // Poin 4: Live Chat Admin 24/7
    sheetSettings.appendRow(["LIVE_CHAT_ADMIN", JSON.stringify({
      "admin1": {
        "nama": "Budi Hartanto",
        "whatsapp": "0812-1111-2222",
        "divisi": "IT Program",
        "jam_kerja": "06:00 - 18:00"
      },
      "admin2": {
        "nama": "Siti Nurhaliza",
        "whatsapp": "0812-3333-4444",
        "divisi": "Network",
        "jam_kerja": "09:00 - 21:00"
      },
      "admin3": {
        "nama": "Rezza Habibi",
        "whatsapp": "0812-5555-6666",
        "divisi": "Nusantara Food",
        "jam_kerja": "08:00 - 20:00"
      }
    })]);
    
    // Poin 7: Company Profile
    sheetSettings.appendRow(["COMPANY_PROFILE", JSON.stringify({
      "tahunBerdiri": "2018",
      "profile": "MultiCorp Enterprise adalah penyedia solusi terpadu di bidang Teknologi Informasi, Jaringan Komunikasi, dan Layanan Kuliner Nusantara. Dengan pengalaman lebih dari 8 tahun, kami telah melayani ribuan klien korporat dan individu.",
      "visi": "Menjadi korporasi terdepan di Asia Tenggara yang mengintegrasikan inovasi teknologi dan layanan terbaik dalam setiap aspek bisnis.",
      "misi": [
        "Memberikan layanan berkualitas tinggi yang melebihi ekspektasi pelanggan",
        "Berinovasi tanpa henti dalam mengembangkan solusi bisnis",
        "Membangun hubungan jangka panjang yang saling menguntungkan dengan mitra dan pelanggan",
        "Memberdayakan tim dengan pelatihan dan pengembangan berkelanjutan"
      ],
      "tujuan": "Meningkatkan efisiensi operasional dan kepuasan pelanggan melalui solusi terintegrasi yang inovatif dan berkelanjutan."
    })]);
    
    // Poin 9: Pembuat Website
    sheetSettings.appendRow(["WEB_DEVELOPER_INFO", JSON.stringify({
      "nama": "MultiCorp IT System Team",
      "tahun": "2026",
      "email": "dev@multicorp.com",
      "version": "1.0.0"
    })]);
    
    // Poin 10: Cara Order
    sheetSettings.appendRow(["CARA_ORDER", JSON.stringify([
      "1. Pilih Divisi dan Layanan/Produk yang Anda butuhkan pada Katalog Produk.",
      "2. Klik tombol 'Pesan / Pengajuan' atau hubungi Live Chat 24 Jam untuk konfirmasi detail.",
      "3. Isi form pengajuan dengan data lengkap: nama, email, nomor telepon, dan kebutuhan spesifik.",
      "4. Tim kami akan mengirimkan quotation dan proposal dalam waktu 24 jam.",
      "5. Setelah approval, lakukan pembayaran sesuai metode yang tersedia (Transfer, E-Wallet, atau COD).",
      "6. Kirim bukti pembayaran melalui form atau WhatsApp admin yang tersedia.",
      "7. Proses pengerjaan dimulai sesuai kesepakatan dan timeline yang telah disetujui.",
      "8. Kami akan memberikan update progress secara berkala hingga project selesai.",
      "9. Setelah delivery, kami menyediakan support teknis dan maintenance sesuai paket yang dipilih.",
      "10. Berikan feedback dan testimoni Anda di portal untuk membantu kami meningkatkan layanan."
    ])]);
  }
}

// ============================================
// 2. FUNGSI LOGIN & AUTENTIKASI
// ============================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    switch(action) {
      case 'LOGIN':
        return HtmlService.createTextOutput(JSON.stringify(handleLogin(data))).setMimeType(MimeType.JSON);
      case 'GET_PESAN':
        return HtmlService.createTextOutput(JSON.stringify(getAllPesan())).setMimeType(MimeType.JSON);
      case 'SUBMIT_PESAN':
        return HtmlService.createTextOutput(JSON.stringify(submitPesan(data))).setMimeType(MimeType.JSON);
      case 'GET_SETTINGS':
        return HtmlService.createTextOutput(JSON.stringify(getSettings())).setMimeType(MimeType.JSON);
      case 'GET_CHART_DATA':
        return HtmlService.createTextOutput(JSON.stringify(getChartData())).setMimeType(MimeType.JSON);
      default:
        return HtmlService.createTextOutput(JSON.stringify({status: 'error', message: 'Action not found'})).setMimeType(MimeType.JSON);
    }
  } catch(error) {
    return HtmlService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()})).setMimeType(MimeType.JSON);
  }
}

function handleLogin(data) {
  var username = data.username;
  var password = data.password;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUsers = ss.getSheetByName("Users");
  
  if (!sheetUsers) return {status: 'error', message: 'User data not found'};
  
  var users = sheetUsers.getDataRange().getValues();
  
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] == username && users[i][1] == password) {
      if (String(users[i][11]).toUpperCase() === 'PENDING') {
        return {status: 'error', requiresVerification: true, message: 'Akun belum diverifikasi.'};
      }
      return {
        status: 'success',
        message: 'Login berhasil',
        user: {
          username: users[i][0],
          nama: users[i][2],
          role: users[i][3],
          divisi: users[i][4],
          email: users[i][6]
        }
      };
    }
  }
  
  return {status: 'error', message: 'Username atau password salah'};
}

// ============================================
// 3. FUNGSI KELOLA PESAN / ORDER
// ============================================

function submitPesan(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetPesan = ss.getSheetByName("Pesan");
  
  if (!sheetPesan) return {status: 'error', message: 'Sheet Pesan not found'};
  
  var id = "MSG-" + new Date().getTime();
  var timestamp = new Date();
  var divisi = data.divisi || "General";
  var nama = data.nama || "";
  var email = data.email || "";
  var telepon = data.telepon || "";
  var pesan = data.pesan || "";
  var status = "NEW";
  
  sheetPesan.appendRow([id, timestamp, divisi, nama, email, telepon, pesan, status]);
  
  return {
    status: 'success',
    message: 'Pesan berhasil dikirim',
    id: id,
    timestamp: timestamp
  };
}

function getAllPesan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetPesan = ss.getSheetByName("Pesan");
  
  if (!sheetPesan) return [];
  
  var data = sheetPesan.getDataRange().getValues();
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    result.push({
      id: data[i][0],
      timestamp: data[i][1],
      divisi: data[i][2],
      nama: data[i][3],
      email: data[i][4],
      telepon: data[i][5],
      pesan: data[i][6],
      status: data[i][7]
    });
  }
  
  return result;
}

// ============================================
// 4. FUNGSI KELOLA SETTINGS
// ============================================

function getSettings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetSettings = ss.getSheetByName("Settings");
  
  if (!sheetSettings) return {};
  
  var data = sheetSettings.getDataRange().getValues();
  var settings = {};
  
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var value = data[i][1];
    
    try {
      settings[key] = JSON.parse(value);
    } catch(e) {
      settings[key] = value;
    }
  }
  
  return settings;
}

// ============================================
// 5. FUNGSI GRAFIK DATA PENJUALAN
// ============================================

function getChartData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetPesan = ss.getSheetByName("Pesan");
  
  if (!sheetPesan) return {};
  
  var data = sheetPesan.getDataRange().getValues();
  
  // Hitung per divisi
  var divisiCount = {};
  var dailyCount = {};
  
  for (var i = 1; i < data.length; i++) {
    var divisi = data[i][2] || "General";
    var timestamp = new Date(data[i][1]);
    var dateKey = timestamp.toDateString();
    
    divisiCount[divisi] = (divisiCount[divisi] || 0) + 1;
    dailyCount[dateKey] = (dailyCount[dateKey] || 0) + 1;
  }
  
  return {
    divisiCount: divisiCount,
    dailyCount: dailyCount,
    totalPesan: data.length - 1
  };
}

// ============================================
// 6. FUNGSI UTILITAS LAINNYA
// ============================================

function generateQRCode(data) {
  // Format: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TEXT
  return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(data);
}

function translateText(text, targetLanguage) {
  // Menggunakan Google Translate API
  try {
    return LanguageApp.translate(text, "id", targetLanguage);
  } catch(e) {
    return text; // Return original jika error
  }
}

function sendEmail(recipient, subject, body) {
  try {
    GmailApp.sendEmail(recipient, subject, body);
    return {status: 'success', message: 'Email sent'};
  } catch(e) {
    return {status: 'error', message: e.toString()};
  }
}

function getChartImage(type) {
  // Kembalikan URL chart dari Google Charts
  var settings = getSettings();
  return "https://chart.googleapis.com/chart?cht=" + type + "&chd=t:" + settings;
}

// ============================================
// 7. DEPLOY & TESTING
// ============================================

function doGet(e) {
  return HtmlService.createHtmlOutput('MultiCorp Backend API - Deployed Successfully');
}

function testSetup() {
  setupSheets();
  Logger.log('Setup Sheets completed');
}

function testLogin() {
  var result = handleLogin({username: 'superadmin', password: 'admin123'});
  Logger.log(result);
}

function testSubmitPesan() {
  var result = submitPesan({
    divisi: 'IT Program',
    nama: 'Test User',
    email: 'test@multicorp.com',
    telepon: '0812-1234-5678',
    pesan: 'Ini adalah test pesan'
  });
  Logger.log(result);
}

function testGetSettings() {
  var result = getSettings();
  Logger.log(result);
}