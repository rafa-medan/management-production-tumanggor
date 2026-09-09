const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'local-data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const sessions = new Map();
const loginAttempts = new Map();
const ALLOWED_FILES = new Set([
  'products',
  'settings',
  'sales',
  'payments',
  'files',
  'messages',
  'audit-log',
  'notifications'
]);

const SENSITIVE_PATTERNS = [
  /password|passwd|kata sandi|api[_ -]?key|token|secret|rahasia|internal|confidential|struktur perusahaan|strategi bisnis|gaji|payroll|rekening bank|nomor rekening|nik|ktp|kode rahasia|dokumen internal|data pelanggan|data karyawan/i,
  /\b(pin|otp|cvv|security code)\b/i,
  /\b(supplier|vendor|pricing internal|harga internal|biaya internal)\b/i
];

const CUSTOMER_POLICY = `Anda adalah AI customer support untuk Managament Production Multicorp. Jawab seperti customer support yang ramah dan natural. Hanya boleh membahas layanan publik, FAQ umum, kontak umum, dan kebutuhan umum di bidang IT, jaringan, dan kuliner. Jangan pernah membahas rahasia perusahaan, strategi bisnis, data internal, harga internal, struktur organisasi internal, password, API key, token, kode rahasia, data pelanggan, dokumen internal, atau hal yang sensitif. Jika pengguna bertanya tentang hal yang sensitif atau tidak bisa dibagikan, jawab singkat dan aman: "Informasi tersebut tidak dapat dibagikan secara umum."`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

function dataPath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function ensureDataFile(name, fallback) {
  const file = dataPath(name);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

function readData(name) {
  ensureDataFile(name, {});
  try {
    const raw = fs.readFileSync(dataPath(name), 'utf8');
    const normalized = raw.replace(/^\uFEFF/, '').trim();
    return JSON.parse(normalized || 'null');
  } catch (error) {
    if (name === 'products') {
      return JSON.parse(fs.readFileSync(path.join(ROOT, 'products-data.json'), 'utf8'));
    }
    if (name === 'settings') return {};
    if (['sales', 'payments', 'files', 'messages', 'audit-log', 'notifications'].includes(name)) return [];
    throw error;
  }
}

function writeData(name, value) {
  if (fs.existsSync(dataPath(name))) {
    const backupName = `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.copyFileSync(dataPath(name), path.join(BACKUP_DIR, backupName));
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(`${name}-`) && file.endsWith('.json'))
      .sort()
      .reverse();
    backups.slice(20).forEach(file => fs.unlinkSync(path.join(BACKUP_DIR, file)));
  }

  const temporaryPath = `${dataPath(name)}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(temporaryPath, dataPath(name));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (typeof passwordHash !== 'string' || !passwordHash.startsWith('scrypt$')) return false;
  const [, salt, expectedHash] = passwordHash.split('$');
  if (!salt || !expectedHash) return false;
  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function migrateUserPasswords() {
  const users = readData('users');
  const requiresMigration = users.some(user => typeof user.password === 'string');
  if (!requiresMigration) return;
  writeData('users', users.map(({ password, ...user }) => ({
    ...user,
    passwordHash: hashPassword(password)
  })));
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  response.end(JSON.stringify(value));
}

function hasAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin || origin === 'null') return true;
  return true;
}

function requireAllowedOrigin(request, response) {
  if (hasAllowedOrigin(request)) return true;
  sendJson(response, 403, { error: 'Origin tidak diizinkan' });
  return false;
}

function getSessionTokenFromRequest(request) {
  const authHeader = request.headers.authorization || '';
  if (/^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  const cookieHeader = request.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)mpt_session=([^;]+)/i);
  if (cookieMatch) {
    return decodeURIComponent(cookieMatch[1]).trim();
  }

  return '';
}

function setSessionCookie(response, token) {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `mpt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MAX_AGE / 1000)}${secureFlag}`
  );
}

function getSessionFromRequest(request) {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || Date.now() - session.createdAt >= SESSION_MAX_AGE) {
    if (session) sessions.delete(token);
    return null;
  }
  return session;
}

function getLoginAttemptKey(request, username) {
  const address = request.socket?.remoteAddress || 'unknown';
  return `${address}|${String(username || '').trim().toLowerCase()}`;
}

function isLoginRateLimited(key) {
  const attempt = loginAttempts.get(key);
  if (!attempt || Date.now() - attempt.firstAttemptAt >= LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(key) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || now - attempt.firstAttemptAt >= LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }
  attempt.count += 1;
}

function canWriteData(session, resource) {
  if (['SUPER_ADMIN', 'ADMIN_DIVISI', 'ANGGOTA', 'ANGGOTA_DIVISI', 'ANGGOTA_SUPER_ADMIN', 'STAFF'].includes(session.role)) {
    if (session.role === 'SUPER_ADMIN' || session.role === 'ANGGOTA_SUPER_ADMIN') return true;
    const permissions = session.permissions || [];
    if (!permissions.length) return true;
    const permissionByResource = {
      products: 'PRODUCTS',
      settings: 'CONTACT',
      sales: 'ANALYTICS',
      payments: 'PAYMENTS',
      files: 'UPLOAD'
    };
    const requiredPermission = permissionByResource[resource];
    return !requiredPermission || permissions.includes(requiredPermission);
  }
  return ['PARTNER', 'CUSTOMER'].includes(session.role) &&
    ['payments', 'files', 'messages'].includes(resource);
}

function isOwnedRecord(session, record) {
  if (!record || typeof record !== 'object') return false;
  const ownerValues = [
    record.username,
    record.user,
    record.owner,
    record.createdBy,
    record.uploader,
    record.pengirim,
    record.sender
  ].filter(Boolean).map(value => String(value).toLowerCase());
  const identities = [session.username, session.name].filter(Boolean)
    .map(value => String(value).toLowerCase());
  return identities.some(identity => ownerValues.includes(identity) ||
    ownerValues.some(owner => owner.includes(`(${identity})`)));
}

function canReadData(session, resource) {
  if (!session) return resource === 'products';
  if (['SUPER_ADMIN', 'ADMIN_DIVISI', 'ANGGOTA', 'ANGGOTA_DIVISI', 'ANGGOTA_SUPER_ADMIN', 'STAFF'].includes(session.role)) return true;
  if (['products', 'settings'].includes(resource)) return true;
  return ['payments', 'files', 'messages', 'notifications'].includes(resource);
}

function mergeOwnedRecords(session, resource, incoming, existing) {
  if (!['payments', 'files', 'messages'].includes(resource)) return incoming;
  const existingIds = new Set(existing.map(record => record && record.id).filter(Boolean));
  const additions = incoming.filter(record =>
    record && !existingIds.has(record.id) && isOwnedRecord(session, record)
  );
  return existing.concat(additions);
}

function validateDataShape(resource, value) {
  const arrayResources = new Set(['sales', 'payments', 'files', 'messages', 'audit-log', 'notifications']);
  if (arrayResources.has(resource) && !Array.isArray(value)) {
    throw new Error(`${resource} data must be an array`);
  }
  if (['products', 'settings'].includes(resource) && (value === null || Array.isArray(value) || typeof value !== 'object')) {
    throw new Error(`${resource} data must be an object`);
  }

  if (['payments', 'files'].includes(resource)) {
    const records = Array.isArray(value) ? value : [];
    const allowedDataUrl = /^data:(application\/pdf|image\/(png|jpeg|jpg|webp)|video\/(mp4|webm|quicktime));base64,/i;
    records.forEach(record => {
      if (!record || typeof record !== 'object') throw new Error(`${resource} record is invalid`);
      const fileValue = record.file || record.link;
      if (fileValue && !/^(https:\/\/|http:\/\/)/i.test(String(fileValue)) && !allowedDataUrl.test(String(fileValue))) {
        throw new Error(`${resource} contains an unsupported file URL`);
      }
      if (record.nama && /[\\/\0]/.test(String(record.nama))) {
        throw new Error(`${resource} contains an invalid file name`);
      }
      if (record.namaFile && /[\\/\0]/.test(String(record.namaFile))) {
        throw new Error(`${resource} contains an invalid file name`);
      }
    });
  }
}

function normalizeSupplierPhone(value) {
  const phone = String(value || '').replace(/\D/g, '');
  return phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
}

function resolveNotificationRecipients(body) {
  const users = readData('users') || [];
  const explicitRecipients = Array.isArray(body?.targets)
    ? body.targets
    : (body?.targetUsername ? [body.targetUsername] : []);

  if (body?.phone || body?.to) {
    return [String(body.phone || body.to || '')];
  }

  if (explicitRecipients.length > 0) {
    return explicitRecipients.map(value => {
      if (typeof value === 'string' && value.includes('@')) {
        const user = users.find(item => String(item.email || '').toLowerCase() === value.toLowerCase());
        return user?.phone || '';
      }
      if (typeof value === 'string') {
        const user = users.find(item => item.username === value || item.phone === value);
        return user?.phone || value;
      }
      return '';
    }).filter(Boolean);
  }

  if (body?.targetRole) {
    return users
      .filter(user => user.role === body.targetRole && user.enabled !== false && user.phone)
      .map(user => user.phone);
  }

  return [String(body?.phone || body?.to || '')].filter(Boolean);
}

function getNotificationProviderConfig() {
  const settings = readData('settings') || {};
  return {
    smsProvider: process.env.SMS_PROVIDER || settings.SMS_PROVIDER || 'telkomsel',
    whatsappProvider: process.env.WHATSAPP_PROVIDER || settings.WHATSAPP_PROVIDER || 'generic',
    smsApiUrl: process.env.SMS_API_URL || settings.SMS_API_URL || '',
    whatsappWebhookUrl: process.env.WHATSAPP_WEBHOOK_URL || settings.WHATSAPP_WEBHOOK_URL || '',
    whatsappToken: process.env.WHATSAPP_API_TOKEN || settings.WHATSAPP_API_TOKEN || '',
    smsApiToken: process.env.SMS_API_TOKEN || settings.SMS_API_TOKEN || '',
    smsApiUser: process.env.SMS_API_USER || settings.SMS_API_USER || '',
    smsApiPassword: process.env.SMS_API_PASSWORD || settings.SMS_API_PASSWORD || '',
    whatsappApiUser: process.env.WHATSAPP_API_USER || settings.WHATSAPP_API_USER || '',
    whatsappApiPassword: process.env.WHATSAPP_API_PASSWORD || settings.WHATSAPP_API_PASSWORD || '',
    smsFrom: process.env.SMS_FROM || settings.SMS_FROM || '',
    whatsappFrom: process.env.WHATSAPP_FROM || settings.WHATSAPP_FROM || '',
    emailHost: process.env.EMAIL_SMTP_HOST || settings.EMAIL_SMTP_HOST || '',
    emailPort: Number(process.env.EMAIL_SMTP_PORT || settings.EMAIL_SMTP_PORT || 587),
    emailUser: process.env.EMAIL_SMTP_USER || settings.EMAIL_SMTP_USER || '',
    emailPassword: process.env.EMAIL_SMTP_PASSWORD || settings.EMAIL_SMTP_PASSWORD || '',
    emailFrom: process.env.EMAIL_FROM || settings.EMAIL_FROM || '',
    emailSecure: String(process.env.EMAIL_SMTP_SECURE || settings.EMAIL_SMTP_SECURE || 'false').toLowerCase() === 'true'
  };
}

async function sendEmailViaSmtp(config, targetEmail, subject, body) {
  if (!nodemailer || !config.emailHost || !config.emailUser || !config.emailPassword) {
    return { status: 'skipped' };
  }
  try {
    const transport = nodemailer.createTransport({
      host: config.emailHost,
      port: Number(config.emailPort || 587),
      secure: Boolean(config.emailSecure),
      auth: {
        user: config.emailUser,
        pass: config.emailPassword
      }
    });
    await transport.sendMail({
      from: config.emailFrom || config.emailUser,
      to: targetEmail,
      subject,
      text: body
    });
    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', error: error.message };
  }
}

function buildProviderHeaders(url, provider, token, user, password, defaultHeaders = {}) {
  const headers = { ...defaultHeaders };
  const lowerUrl = String(url || '').toLowerCase();
  if (token) {
    if (lowerUrl.includes('twilio.com') || provider === 'twilio') {
      const encoded = Buffer.from(`${user || 'api'}:${token}`).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  if (user && password && !headers.Authorization) {
    const encoded = Buffer.from(`${user}:${password}`).toString('base64');
    headers.Authorization = `Basic ${encoded}`;
  }
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function buildSmsPayload(provider, to, message, title, from) {
  const cleanMessage = String(message || '').trim();
  const cleanTo = String(to || '').replace(/\D/g, '');
  const normalized = cleanTo.startsWith('0') ? `62${cleanTo.slice(1)}` : cleanTo;

  switch (provider) {
    case 'twilio':
      return {
        To: `+${normalized}`,
        Body: cleanMessage,
        ...(from ? { From: from } : {})
      };
    case 'textlocal':
      return {
        numbers: [normalized],
        content: cleanMessage,
        sender: from || 'MPT'
      };
    case 'messagebird':
      return {
        originator: from || 'MPT',
        recipients: [normalized],
        body: cleanMessage
      };
    case 'telkomsel':
      return {
        msisdn: normalized,
        message: cleanMessage,
        sender: from || 'MPT',
        title: title || 'Pemberitahuan'
      };
    default:
      return {
        to: normalized,
        message: cleanMessage,
        title: title || 'Pemberitahuan'
      };
  }
}

function buildWhatsappPayload(provider, to, message, title, from) {
  const cleanMessage = String(message || '').trim();
  const cleanTo = String(to || '').replace(/\D/g, '');
  const normalized = cleanTo.startsWith('0') ? `62${cleanTo.slice(1)}` : cleanTo;

  switch (provider) {
    case 'wati':
      return {
        recipient_type: 'individual',
        to: normalized,
        type: 'text',
        text: { body: cleanMessage },
        ...(from ? { from: from } : {})
      };
    case 'whatsapp-business':
      return {
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'text',
        text: { body: cleanMessage },
        ...(from ? { from: from } : {})
      };
    default:
      return {
        to: normalized,
        message: cleanMessage,
        title: title || 'Pemberitahuan'
      };
  }
}

function queueLocalNotification(record) {
  const notifications = readData('notifications');
  const next = Array.isArray(notifications) ? notifications : [];
  next.push({
    id: `NOTIFY-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...record,
    createdAt: new Date().toISOString(),
    status: 'queued'
  });
  writeData('notifications', next.slice(-200));
}

function sendProviderRequest(url, payload, options = {}) {
  return new Promise(resolve => {
    if (!url) return resolve({ status: 'skipped' });
    const parsedUrl = new URL(url);
    const requestOptions = {
      method: options.method || 'POST',
      headers: options.headers || { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    };
    const request = https.request(parsedUrl, requestOptions, (response) => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode >= 200 && response.statusCode < 300 ? 'sent' : 'failed', body }));
    });
    request.on('error', () => resolve({ status: 'failed' }));
    request.write(JSON.stringify(payload));
    request.end();
  });
}

async function handleNotificationSend(request, response) {
  if (request.url.split('?')[0] !== '/api/notifications/send' || request.method !== 'POST') {
    sendJson(response, 404, { error: 'Unknown notification route' });
    return;
  }

  try {
    if (!requireAllowedOrigin(request, response)) return;
    const body = JSON.parse(await collectBody(request));
    const channels = body?.channels || {};
    const message = String(body?.message || '').trim();
    const to = String(body?.to || body?.emailTo || '').trim();
    const title = String(body?.title || 'Pemberitahuan').trim();
    const providerConfig = getNotificationProviderConfig();
    const recipientPhones = resolveNotificationRecipients(body).map(phone => normalizeSupplierPhone(phone || to || ''));
    const finalRecipients = recipientPhones.filter(Boolean);
    const targetEmail = String(body?.email || body?.emailTo || to || '').trim();

    if (!message) {
      sendJson(response, 400, { status: 'error', message: 'Pesan notifikasi wajib diisi.' });
      return;
    }

    const enabledChannels = {
      sms: Boolean(channels.sms),
      whatsapp: Boolean(channels.whatsapp),
      email: Boolean(channels.email)
    };

    const queued = [];
    const activeRecipients = finalRecipients.length ? finalRecipients : [normalizeSupplierPhone(to || body?.phone || '')].filter(Boolean);

    if (enabledChannels.sms) {
      for (const normalizedPhone of activeRecipients) {
        const smsUrl = providerConfig.smsApiUrl;
        const smsPayload = buildSmsPayload(providerConfig.smsProvider, normalizedPhone, message, title, providerConfig.smsFrom);
        const headers = buildProviderHeaders(smsUrl, providerConfig.smsProvider, providerConfig.smsApiToken, providerConfig.smsApiUser, providerConfig.smsApiPassword, {
          Accept: 'application/json'
        });
        const result = await sendProviderRequest(smsUrl, smsPayload, { headers });
        queued.push({ channel: 'sms', status: result.status, to: normalizedPhone || 'pending' });
        if (!smsUrl) {
          queueLocalNotification({ channel: 'sms', title, message, to: normalizedPhone || 'pending', status: 'queued' });
        }
      }
    }

    if (enabledChannels.whatsapp) {
      for (const normalizedPhone of activeRecipients) {
        const waUrl = providerConfig.whatsappWebhookUrl;
        const waPayload = buildWhatsappPayload(providerConfig.whatsappProvider, normalizedPhone, message, title, providerConfig.whatsappFrom);
        const headers = buildProviderHeaders(waUrl, providerConfig.whatsappProvider, providerConfig.whatsappToken, providerConfig.whatsappApiUser, providerConfig.whatsappApiPassword, {
          Accept: 'application/json'
        });
        const result = await sendProviderRequest(waUrl, waPayload, { headers });
        queued.push({ channel: 'whatsapp', status: result.status, to: normalizedPhone || 'pending' });
        if (!waUrl) {
          queueLocalNotification({ channel: 'whatsapp', title, message, to: normalizedPhone || 'pending', status: 'queued' });
        }
      }
    }

    if (enabledChannels.email) {
      const emailTarget = targetEmail || (body?.emailTo ? String(body.emailTo) : '') || (body?.to && /@/.test(String(body.to)) ? String(body.to) : '');
      if (emailTarget) {
        const emailResult = await sendEmailViaSmtp(providerConfig, emailTarget, title, message);
        queued.push({ channel: 'email', status: emailResult.status, to: emailTarget });
        if (emailResult.status !== 'sent') {
          queueLocalNotification({ channel: 'email', title, message, to: emailTarget, status: 'queued' });
        }
      } else {
        queueLocalNotification({ channel: 'email', title, message, to: 'pending', status: 'queued' });
      }
    }

    if (!enabledChannels.sms && !enabledChannels.whatsapp && !enabledChannels.email) {
      queueLocalNotification({ channel: 'local', title, message, to: activeRecipients[0] || to || 'internal', status: 'queued' });
    }

    sendJson(response, 200, {
      status: 'success',
      queued,
      configured: {
        sms: Boolean(providerConfig.smsApiUrl),
        whatsapp: Boolean(providerConfig.whatsappWebhookUrl)
      },
      message: 'Notifikasi diproses. Jika provider belum dikonfigurasi, data akan tersimpan sebagai antrian lokal.'
    });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

function normalizeChatMessage(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findSensitiveMatches(message) {
  const normalized = normalizeChatMessage(message);
  return SENSITIVE_PATTERNS.filter(pattern => pattern.test(normalized));
}

function buildLocalGuardedReply(message) {
  const text = normalizeChatMessage(message);
  if (!text) return 'Halo! Saya siap membantu kebutuhan Anda dengan ramah dan cepat. Coba jelaskan kebutuhan Anda secara singkat.';

  if (/(halo|hai|hello|hallo|selamat (pagi|siang|sore|malam|datang|tidur))/i.test(message)) {
    const timeMatch = message.match(/selamat\s+(pagi|siang|sore|malam)/i);
    const greeting = timeMatch ? `Selamat ${timeMatch[1]}!` : 'Halo!';
    return `${greeting} Saya AI support Managament Production Multicorp. Saya siap membantu kebutuhan Anda seputar layanan IT, jaringan, atau kuliner. Silakan sebutkan kebutuhan Anda dengan jelas.`;
  }

  if (/(terima kasih|makasih|thanks|thank you)/i.test(message)) {
    return 'Sama-sama. Saya siap membantu kembali kapan saja. Cukup jelaskan kebutuhan Anda, dan kami akan bantu dengan solusi yang paling sesuai.';
  }

  if (/(hubungi|kontak|wa|whatsapp|customer service|cs|admin|chat admin|langsung chat)/i.test(message)) {
    return 'Tentu. Anda bisa langsung menghubungi tim support kami melalui WhatsApp untuk penjelasan yang lebih detail. Saya juga bisa membantu menjelaskan layanan sebelum Anda menghubungi kami.';
  }

  if (/(website|aplikasi|sistem|software|it|program|digital|developer)/i.test(message)) {
    return 'Layanan IT Program kami mencakup pembuatan website, aplikasi, sistem, dan support digital sesuai kebutuhan bisnis Anda. Saya bisa bantu menjelaskan skema paling cocok untuk kebutuhan Anda.';
  }

  if (/(jaringan|network|wifi|internet|server|vpn|cloud|lan)/i.test(message)) {
    return 'Untuk kebutuhan jaringan, kami siap membantu setup jaringan, WiFi, server, keamanan jaringan, dan maintenance infrastruktur. Jelaskan kondisi dan kebutuhan Anda agar kami bisa merekomendasikan solusi yang tepat.';
  }

  if (/(kuliner|food|catering|menu|makanan|restoran|nasi)/i.test(message)) {
    return 'Layanan Nusantara Food kami mencakup catering, menu spesial, dan kebutuhan kuliner sesuai kebutuhan bisnis Anda. Saya bisa membantu menjelaskan pilihan yang paling sesuai.';
  }

  if (/(harga|biaya|paket|quote|tarif|budget|price)/i.test(message)) {
    return 'Detail harga dan paket biasanya disesuaikan dengan kebutuhan Anda. Silakan jelaskan kebutuhan, skala, dan targetnya agar kami bisa memberikan rekomendasi yang lebih tepat.';
  }

  if (/(error|bug|gagal|masalah|tidak bisa|rusak|problem)/i.test(message)) {
    return 'Saya memahami kendala yang Anda hadapi. Jelaskan kronologi singkatnya, dan kami akan membantu mencari solusi terbaik dari tim support kami.';
  }

  if (findSensitiveMatches(message).length > 0) {
    return 'Informasi tersebut tidak dapat dibagikan secara umum. Jika Anda memerlukan bantuan terkait layanan kami, saya bisa membantu menjelaskan solusi yang aman dan sesuai kebutuhan.';
  }

  return 'Terima kasih atas pertanyaannya. Saya bisa membantu menjelaskan layanan kami untuk IT, jaringan, dan kuliner dengan cara yang sederhana dan jelas. Silakan jelaskan kebutuhan Anda secara singkat.';
}

function redactSensitiveText(value) {
  return String(value || '').replace(/(password|api[_ -]?key|token|secret|rekening|nik|ktp)/gi, '[data terlindungi]');
}

async function handleChatAnswer(request, response) {
  if (request.url.split('?')[0] !== '/api/chat/answer' || request.method !== 'POST') {
    sendJson(response, 404, { error: 'Unknown chat route' });
    return;
  }

  try {
    if (!requireAllowedOrigin(request, response)) return;
    const body = JSON.parse(await collectBody(request));
    const message = typeof body.message === 'string' ? body.message : '';
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      sendJson(response, 400, { status: 'error', message: 'Pesan tidak boleh kosong.' });
      return;
    }

    const sensitiveHits = findSensitiveMatches(cleanMessage);
    if (sensitiveHits.length > 0) {
      sendJson(response, 200, {
        status: 'success',
        mode: 'guarded',
        reply: 'Informasi tersebut tidak dapat dibagikan secara umum. Saya bisa membantu menjelaskan layanan publik kami dengan cara yang aman dan jelas.'
      });
      return;
    }

    const geminiReply = await new Promise((resolve) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        resolve(null);
        return;
      }
      const payload = {
        contents: [{
          role: 'user',
          parts: [{ text: `${CUSTOMER_POLICY}\n\nUser: ${redactSensitiveText(cleanMessage)}` }]
        }]
      };

      const bodyText = JSON.stringify(payload);
      const req = https.request(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data || '{}');
            const text = parsed?.candidates?.[0]?.content?.parts?.map(part => part.text).join(' ') || '';
            resolve(text ? text.trim() : null);
          } catch (error) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.write(bodyText);
      req.end();
    });

    const finalReply = geminiReply && !findSensitiveMatches(geminiReply).length
      ? geminiReply
      : buildLocalGuardedReply(cleanMessage);

    sendJson(response, 200, {
      status: 'success',
      mode: geminiReply ? 'gemini' : 'guarded',
      reply: finalReply
    });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleChatHistory(request, response) {
  if (request.url.split('?')[0] !== '/api/chat/history') {
    sendJson(response, 404, { error: 'Unknown chat history route' });
    return;
  }

  try {
    if (request.method === 'GET') {
      const chats = Array.isArray(readData('messages')) ? readData('messages') : [];
      sendJson(response, 200, { status: 'success', chats: chats.slice(-200) });
      return;
    }

    if (request.method === 'POST') {
      if (!requireAllowedOrigin(request, response)) return;
      const body = JSON.parse(await collectBody(request));
      const incoming = Array.isArray(body?.messages) ? body.messages : body && typeof body === 'object' && body.text ? [body] : [];
      const current = Array.isArray(readData('messages')) ? readData('messages') : [];
      const normalized = incoming
        .filter(item => item && typeof item === 'object' && typeof item.text === 'string')
        .map(item => ({
          id: item.id || `CHAT-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          sender: String(item.sender || 'Customer').trim() || 'Customer',
          senderType: ['customer', 'admin', 'bot'].includes(item.senderType) ? item.senderType : 'customer',
          text: String(item.text).trim().slice(0, 500),
          timestamp: item.timestamp || new Date().toISOString(),
          replied: Boolean(item.replied)
        }))
        .filter(item => item.text.length > 0);

      const next = [...current, ...normalized].slice(-200);
      writeData('messages', next);
      sendJson(response, 200, { status: 'success', saved: next.length, chats: next.slice(-200) });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleAuth(request, response) {
  if (request.url.split('?')[0] !== '/api/auth/login' || request.method !== 'POST') {
    sendJson(response, 404, { error: 'Unknown local auth route' });
    return;
  }

  try {
    if (!requireAllowedOrigin(request, response)) return;
    const data = JSON.parse(await collectBody(request));
    const attemptKey = getLoginAttemptKey(request, data.username);
    if (isLoginRateLimited(attemptKey)) {
      response.setHeader('Retry-After', String(Math.ceil(LOGIN_ATTEMPT_WINDOW / 1000)));
      sendJson(response, 429, { status: 'error', message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' });
      return;
    }
    const users = readData('users');
    const user = users.find(item => item.username === data.username);

    if (!user || !['SUPER_ADMIN', 'ADMIN_DIVISI', 'ANGGOTA', 'ANGGOTA_DIVISI', 'ANGGOTA_SUPER_ADMIN', 'STAFF', 'PARTNER', 'CUSTOMER'].includes(user.role)) {
      recordFailedLogin(attemptKey);
      sendJson(response, 401, { status: 'error', message: 'Username atau password salah' });
      return;
    }

    if (user && user.enabled === false) {
      const message = user.lockedReason === 'LOGIN_FAILURE'
        ? 'Akun terkunci setelah 5 kali kesalahan login. Hubungi administrator untuk mengaktifkan kembali.'
        : 'Akun sedang nonaktif. Hubungi administrator.';
      sendJson(response, 403, { status: 'error', message, locked: user.lockedReason === 'LOGIN_FAILURE' });
      return;
    }

    if (user && !verifyPassword(data.password, user.passwordHash)) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
      const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts);
      recordFailedLogin(attemptKey);

      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.enabled = false;
        user.lockedReason = 'LOGIN_FAILURE';
        user.lockedAt = new Date().toISOString();
        writeData('users', users);
        sendJson(response, 403, {
          status: 'error',
          message: 'Akun terkunci setelah 5 kali kesalahan login. Hubungi administrator untuk mengaktifkan kembali.',
          locked: true
        });
        return;
      }

      writeData('users', users);
      sendJson(response, 401, {
        status: 'error',
        message: 'Username atau password salah',
        failedAttempts: user.failedLoginAttempts,
        remainingAttempts,
        warning: user.failedLoginAttempts >= 3
          ? 'Peringatan: sudah 3 kali salah. Gunakan Lupa Password atau hubungi administrator.'
          : ''
      });
      return;
    }

    if (!user) {
      recordFailedLogin(attemptKey);
      sendJson(response, 401, { status: 'error', message: 'Username atau password salah' });
      return;
    }

    if (user.failedLoginAttempts || user.lockedReason || user.lockedAt) {
      user.failedLoginAttempts = 0;
      delete user.lockedReason;
      delete user.lockedAt;
      writeData('users', users);
    }
    loginAttempts.delete(attemptKey);

    const token = crypto.randomUUID();
    sessions.set(token, {
      username: user.username,
      role: user.role,
      permissions: user.permissions || [],
      createdAt: Date.now()
    });
    setSessionCookie(response, token);
    sendJson(response, 200, {
      status: 'success',
      token,
      user: {
        username: user.username,
        role: user.role,
        name: user.name,
        divisi: user.divisi,
        jabatan: user.jabatan || '',
        email: user.email || '',
        phone: user.phone || '',
        enabled: user.enabled !== false,
        permissions: user.permissions || [],
        token
      }
    });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleRegistration(request, response) {
  if (request.url.split('?')[0] !== '/api/auth/register' || request.method !== 'POST') {
    sendJson(response, 404, { error: 'Unknown local registration route' });
    return;
  }

  try {
    if (!requireAllowedOrigin(request, response)) return;
    const data = JSON.parse(await collectBody(request));
    const normalizedRole = data.role === 'STAFF' ? 'ANGGOTA' : data.role;
    const allowedDivisions = new Set(['IT Program', 'Network', 'Nusantara Food', 'ALL']);
    const publicRoles = new Set(['PARTNER', 'CUSTOMER']);
    const internalRoles = new Set(['ADMIN_DIVISI', 'ANGGOTA', 'ANGGOTA_DIVISI', 'ANGGOTA_SUPER_ADMIN', 'STAFF']);
    const isInternalRequest = internalRoles.has(normalizedRole) || normalizedRole === 'SUPER_ADMIN';

    const inviteCode = String(data.inviteCode || '').trim();
    const requiredInviteByRole = {
      SUPER_ADMIN: 'MPT-SUPERADMIN-2026',
      ANGGOTA_SUPER_ADMIN: 'MPT-ANGGOTA-SUPERADMIN-2026',
      ADMIN_DIVISI: 'MPT-ADMIN-DIVISI-2026',
      ANGGOTA: 'MPT-ANGGOTA-DIVISI-2026',
      ANGGOTA_DIVISI: 'MPT-ANGGOTA-DIVISI-2026',
      STAFF: 'MPT-STAFF-2026'
    };

    if (isInternalRequest) {
      const expectedCode = requiredInviteByRole[normalizedRole] || 'MPT-INVITE-2026';
      if (!inviteCode) {
        sendJson(response, 400, { status: 'error', message: 'Kode undangan dari superadmin wajib diisi untuk pendaftaran tim internal.' });
        return;
      }
      if (inviteCode !== expectedCode) {
        sendJson(response, 400, { status: 'error', message: 'Kode undangan tidak valid untuk role yang dipilih.' });
        return;
      }
    }

    if (!publicRoles.has(data.role) && !isInternalRequest) {
      sendJson(response, 400, { status: 'error', message: 'Role atau divisi pendaftaran tidak valid.' });
      return;
    }

    if ((publicRoles.has(data.role) && !allowedDivisions.has(data.divisi)) || (isInternalRequest && !allowedDivisions.has(data.divisi))) {
      sendJson(response, 400, { status: 'error', message: 'Role atau divisi pendaftaran tidak valid.' });
      return;
    }

    if (!data.username || !data.password || !data.name || !data.email || !data.phone) {
      sendJson(response, 400, { status: 'error', message: 'Data pendaftaran belum lengkap.' });
      return;
    }

    const users = readData('users');
    const username = String(data.username).trim();
    if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      sendJson(response, 409, { status: 'error', message: 'Username sudah terdaftar.' });
      return;
    }

    const internalUser = ['ADMIN_DIVISI', 'ANGGOTA', 'ANGGOTA_DIVISI', 'ANGGOTA_SUPER_ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(normalizedRole);
    const newUser = {
      username,
      role: normalizedRole,
      name: String(data.name).trim(),
      jabatan: data.jabatan || '',
      email: String(data.email).trim(),
      phone: String(data.phone).trim(),
      divisi: data.divisi,
      enabled: !internalUser,
      permissions: normalizedRole === 'ADMIN_DIVISI'
        ? ['UPLOAD', 'CONTACT', 'PRODUCTS', 'PAYMENTS', 'ANALYTICS']
        : (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ANGGOTA_SUPER_ADMIN'
          ? ['UPLOAD', 'CONTACT', 'PRODUCTS', 'PAYMENTS', 'ANALYTICS', 'SETTINGS']
          : ['PAYMENTS']),
      passwordHash: hashPassword(String(data.password)),
      ...(internalUser ? { approvalStatus: 'PENDING', pendingApproval: true } : {}),
      ...(data.company ? { company: String(data.company).trim() } : {}),
      ...(data.address ? { address: String(data.address).trim() } : {})
    };

    users.push(newUser);
    writeData('users', users);
    sendJson(response, 201, {
      status: 'success',
      message: internalUser
        ? 'Pendaftaran berhasil. Akun menunggu persetujuan superadmin.'
        : 'Pendaftaran berhasil. Silakan login.'
    });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleAdminUsers(request, response) {
  if (request.url.split('?')[0] !== '/api/admin/users') {
    sendJson(response, 404, { error: 'Unknown user management route' });
    return;
  }

  try {
    if (request.method !== 'GET' && !requireAllowedOrigin(request, response)) return;
    const session = getSessionFromRequest(request);
    if (!session || !['SUPER_ADMIN', 'ADMIN_DIVISI'].includes(session.role)) {
      sendJson(response, 403, { error: 'Administrator authorization required' });
      return;
    }

    if (request.method === 'GET') {
      const allUsers = readData('users');
      const visibleUsers = session.role === 'SUPER_ADMIN'
        ? allUsers
        : allUsers.filter(user => {
            if (user.username === session.username) return true;
            if (['PARTNER', 'CUSTOMER', 'ANGGOTA', 'STAFF', 'ADMIN_DIVISI'].includes(user.role)) {
              return user.divisi === session.divisi || user.username === session.username;
            }
            return false;
          });
      const users = visibleUsers.map(({ password, passwordHash, ktpData, nik, ...safeUser }) => ({
        ...safeUser,
        nikMasked: nik ? `************${String(nik).slice(-4)}` : '',
        hasKtp: Boolean(ktpData)
      }));
      sendJson(response, 200, users);
      return;
    }

    if (request.method === 'PUT') {
      if (session.role !== 'SUPER_ADMIN') {
        sendJson(response, 403, { error: 'Only Super Admin can edit account settings' });
        return;
      }
      const users = JSON.parse(await collectBody(request));
      if (!Array.isArray(users)) throw new Error('User data must be an array');
      const currentUsers = readData('users');
      const incomingUsers = new Map(users.map(user => [user.username, user]));
      if (incomingUsers.size !== currentUsers.length || currentUsers.some(user => !incomingUsers.has(user.username))) {
        throw new Error('Account structure cannot be changed from this panel');
      }
      const updatedUsers = currentUsers.map(currentUser => {
        const incomingUser = incomingUsers.get(currentUser.username);
        const updatedUser = {
          ...currentUser,
          enabled: incomingUser.enabled !== false,
          permissions: Array.isArray(incomingUser.permissions) ? incomingUser.permissions : currentUser.permissions
        };
        if (updatedUser.enabled !== false) {
          updatedUser.failedLoginAttempts = 0;
          delete updatedUser.lockedReason;
          delete updatedUser.lockedAt;
        }
        return updatedUser;
      });
      writeData('users', updatedUsers);
      sendJson(response, 200, { status: 'success' });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

async function handleAccountReactivation(request, response) {
  if (request.url.split('?')[0] !== '/api/admin/users/reactivate' || request.method !== 'POST') {
    sendJson(response, 404, { error: 'Unknown account reactivation route' });
    return;
  }

  try {
    if (!requireAllowedOrigin(request, response)) return;
    const session = getSessionFromRequest(request);
    if (!session || !['SUPER_ADMIN', 'ADMIN_DIVISI'].includes(session.role)) {
      sendJson(response, 403, { error: 'Administrator authorization required' });
      return;
    }

    const data = JSON.parse(await collectBody(request));
    const users = readData('users');
    const target = users.find(user => user.username === data.username);
    if (!target) {
      sendJson(response, 404, { error: 'Account not found' });
      return;
    }

    const canReactivate = session.role === 'SUPER_ADMIN' ||
      (['PARTNER', 'CUSTOMER'].includes(target.role) && target.divisi === session.divisi);
    if (!canReactivate) {
      sendJson(response, 403, { error: 'Account is outside your assigned division' });
      return;
    }

    target.enabled = true;
    target.failedLoginAttempts = 0;
    delete target.lockedReason;
    delete target.lockedAt;
    writeData('users', users);
    sendJson(response, 200, { status: 'success', message: 'Account reactivated' });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleOwnSignature(request, response) {
  if (request.url.split('?')[0] !== '/api/profile/signature' || !['GET', 'PUT'].includes(request.method)) {
    sendJson(response, 404, { error: 'Unknown signature route' });
    return;
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    sendJson(response, 403, { error: 'Login required' });
    return;
  }

  try {
    if (request.method === 'GET') {
      const users = readData('users');
      const user = users.find(item => item.username === session.username);
      if (!user) {
        sendJson(response, 404, { error: 'User not found' });
        return;
      }
      sendJson(response, 200, { status: 'success', signatureData: user.signatureData || '' });
      return;
    }

    if (!requireAllowedOrigin(request, response)) return;
    const data = JSON.parse(await collectBody(request));
    if (typeof data.signatureData !== 'string' || data.signatureData.length > 3 * 1024 * 1024) {
      throw new Error('Signature image is missing or too large');
    }
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(data.signatureData) && !/^signature-[a-z0-9-]+\.svg$/.test(data.signatureData)) {
      throw new Error('Only image signatures are supported');
    }
    const users = readData('users');
    const user = users.find(item => item.username === session.username);
    if (!user) throw new Error('User not found');
    user.signatureData = data.signatureData;
    writeData('users', users);
    sendJson(response, 200, { status: 'success' });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleOwnPassword(request, response) {
  if (request.url.split('?')[0] !== '/api/profile/password' || request.method !== 'PUT') {
    sendJson(response, 404, { error: 'Unknown password route' });
    return;
  }
  const session = getSessionFromRequest(request);
  if (!session) {
    sendJson(response, 403, { error: 'Login required' });
    return;
  }
  try {
    if (!requireAllowedOrigin(request, response)) return;
    const data = JSON.parse(await collectBody(request));
    if (typeof data.newPassword !== 'string' || data.newPassword.length < 8) {
      throw new Error('Password baru minimal 8 karakter.');
    }
    const users = readData('users');
    const user = users.find(item => item.username === session.username);
    if (!user || !verifyPassword(String(data.currentPassword || ''), user.passwordHash)) {
      sendJson(response, 401, { status: 'error', message: 'Password lama salah.' });
      return;
    }
    user.passwordHash = hashPassword(data.newPassword);
    user.failedLoginAttempts = 0;
    delete user.lockedReason;
    delete user.lockedAt;
    writeData('users', users);
    sendJson(response, 200, { status: 'success', message: 'Password berhasil diubah.' });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function handleOwnIdentity(request, response) {
  if (request.url.split('?')[0] !== '/api/profile/identity' || !['GET', 'PUT'].includes(request.method)) {
    sendJson(response, 404, { error: 'Unknown identity route' });
    return;
  }
  const session = getSessionFromRequest(request);
  if (!session) {
    sendJson(response, 403, { error: 'Login required' });
    return;
  }
  try {
    const users = readData('users');
    const user = users.find(item => item.username === session.username);
    if (!user) {
      sendJson(response, 404, { error: 'User not found' });
      return;
    }
    if (request.method === 'GET') {
      sendJson(response, 200, {
        status: 'success',
        jabatan: user.jabatan || '',
        nik: user.nik || '',
        identityStatus: user.identityStatus || 'NOT_SUBMITTED',
        hasKtp: Boolean(user.ktpData)
      });
      return;
    }
    if (!requireAllowedOrigin(request, response)) return;
    const data = JSON.parse(await collectBody(request));
    const nik = String(data.nik || '').replace(/\s/g, '');
    if (!/^\d{16}$/.test(nik)) throw new Error('NIK harus terdiri dari 16 digit angka.');
    if (typeof data.jabatan !== 'string' || data.jabatan.trim().length < 2) {
      throw new Error('Jabatan wajib diisi.');
    }
    if (data.ktpData && (typeof data.ktpData !== 'string' || data.ktpData.length > 7 * 1024 * 1024)) {
      throw new Error('File KTP terlalu besar.');
    }
    if (data.ktpData && !/^data:(application\/pdf|image\/(jpeg|jpg|png|webp));base64,/i.test(data.ktpData)) {
      throw new Error('Format KTP tidak didukung.');
    }
    user.jabatan = data.jabatan.trim();
    user.nik = nik;
    if (data.ktpData) user.ktpData = data.ktpData;
    user.identityStatus = 'PENDING';
    writeData('users', users);
    sendJson(response, 200, { status: 'success', message: 'Data identitas tersimpan dan menunggu verifikasi admin.' });
  } catch (error) {
    sendJson(response, 400, { status: 'error', message: error.message });
  }
}

function safeStaticPath(requestPath) {
  const pathname = decodeURIComponent(requestPath.split('?')[0]);
  if (pathname === '/local-data' || pathname.startsWith('/local-data/')) {
    return null;
  }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relativePath);
  return resolved.startsWith(ROOT + path.sep) ? resolved : null;
}

function serveStatic(request, response) {
  const filePath = safeStaticPath(request.url);
  if (!filePath) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer'
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handleApi(request, response) {
  const parts = request.url.split('?')[0].split('/').filter(Boolean);
  const name = parts[2];
  if (parts[0] !== 'api' || parts[1] !== 'data' || !ALLOWED_FILES.has(name)) {
    sendJson(response, 404, { error: 'Unknown local data resource' });
    return;
  }

  const isPublicRead = request.method === 'GET' && name === 'products';
  const session = isPublicRead ? null : getSessionFromRequest(request);
  if (!isPublicRead && !session) {
    sendJson(response, 401, { error: 'Login required' });
    return;
  }

  try {
    if (request.method === 'GET') {
      const value = readData(name);
      if (!session) {
        if (name === 'products') {
          sendJson(response, 200, value);
          return;
        }
        sendJson(response, 401, { error: 'Login required' });
        return;
      }
      if (!canReadData(session, name)) {
        sendJson(response, 200, []);
        return;
      }
      const isStaffSession = Boolean(session && ['SUPER_ADMIN', 'ADMIN_DIVISI'].includes(session.role));
      if (isStaffSession || ['products', 'settings'].includes(name)) {
        sendJson(response, 200, value);
        return;
      }
      sendJson(response, 200, Array.isArray(value) ? value.filter(record => isOwnedRecord(session, record)) : {});
      return;
    }

    if (request.method === 'PUT' || request.method === 'POST') {
      if (!requireAllowedOrigin(request, response)) return;
      if (!canWriteData(session, name)) {
        sendJson(response, 403, { error: 'Insufficient permissions' });
        return;
      }
      const body = await collectBody(request);
      const value = JSON.parse(body || 'null');
      validateDataShape(name, value);
      const nextValue = ['PARTNER', 'CUSTOMER'].includes(session.role)
        ? mergeOwnedRecords(session, name, value, readData(name))
        : value;
      writeData(name, nextValue);
      sendJson(response, 200, { status: 'success', resource: name });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });
ensureDataFile('products', {});
ensureDataFile('settings', {});
ensureDataFile('sales', []);
ensureDataFile('payments', []);
ensureDataFile('files', []);
ensureDataFile('messages', []);
ensureDataFile('audit-log', []);
ensureDataFile('notifications', []);
ensureDataFile('users', []);
migrateUserPasswords();

http.createServer((request, response) => {
  if (request.url.split('?')[0] === '/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok', service: 'management-production-local-api' });
    return;
  }
  if (request.url.startsWith('/api/profile/identity')) {
    handleOwnIdentity(request, response);
    return;
  }
  if (request.url.startsWith('/api/profile/password')) {
    handleOwnPassword(request, response);
    return;
  }
  if (request.url.startsWith('/api/profile/signature')) {
    handleOwnSignature(request, response);
    return;
  }
  if (request.url.startsWith('/api/admin/users')) {
    if (request.url.startsWith('/api/admin/users/reactivate')) {
      handleAccountReactivation(request, response);
      return;
    }
    handleAdminUsers(request, response);
    return;
  }
  if (request.url.startsWith('/api/auth/')) {
    if (request.url.startsWith('/api/auth/register')) {
      handleRegistration(request, response);
      return;
    }
    handleAuth(request, response);
    return;
  }
  if (request.url.startsWith('/api/chat/answer')) {
    handleChatAnswer(request, response);
    return;
  }
  if (request.url.startsWith('/api/chat/history')) {
    handleChatHistory(request, response);
    return;
  }
  if (request.url.startsWith('/api/notifications/send')) {
    handleNotificationSend(request, response);
    return;
  }
  if (request.url.startsWith('/api/data/')) {
    handleApi(request, response);
    return;
  }
  serveStatic(request, response);
}).listen(PORT, HOST, () => {
  console.log(`Website server: http://${HOST}:${PORT}`);
  console.log(`Local data folder: ${DATA_DIR}`);
});
