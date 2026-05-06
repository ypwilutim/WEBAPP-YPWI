const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
// WhatsApp API using HTTPS module for better reliability
const https = require('https');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'ypwi-secret-key-2026';

// Environment check
console.log('🔧 Environment Configuration:');
console.log('   WHATSAPP_ENDPOINT:', process.env.WHATSAPP_ENDPOINT ? '✅ LOADED' : '❌ MISSING');
console.log('   WHATSAPP_DEVICE_ID:', process.env.WHATSAPP_DEVICE_ID ? '✅ LOADED' : '❌ MISSING');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ LOADED' : '❌ MISSING');
console.log('   DB_HOST:', process.env.DB_HOST ? '✅ LOADED' : '❌ MISSING');
console.log('   PORT:', PORT);
console.log('');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      styleSrcAttr: ["'unsafe-inline'"] // Allow inline styles
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);

// Input sanitization middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS scripts
        obj[key] = validator.escape(obj[key]);
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

app.use('/api', sanitizeInput);

// Error handling for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File terlalu besar. Maksimal 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Terlalu banyak file. Maksimal 1 file.'
      });
    }
  }

  if (error.message.includes('Only image files') || error.message.includes('file gambar') || error.message.includes('Format file')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Maximum 1 file
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Hanya file gambar yang diperbolehkan (JPG, PNG, GIF)'));
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau GIF'));
    }

    cb(null, true);
  }
});

const logger = {
  request: (req, message = '') => {
    const timestamp = new Date().toISOString();
    const { method, url, headers, body } = req;
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = '[HIDDEN]';
    console.log(`[${timestamp}] 🌍 REQUEST  | ${method.padEnd(6)} | ${url.padEnd(40)} | Body: ${JSON.stringify(safeBody)}`);
  },
  response: (req, res, statusCode) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📤 RESPONSE | ${req.method.padEnd(6)} | ${req.url.padEnd(40)} | Status: ${statusCode}`);
  },
  loginDebug: {
    receivedData: (data) => {
      const timestamp = new Date().toISOString();
      const safeData = { ...data };
      if (safeData.password) safeData.password = '[HIDDEN]';
      console.log(`[${timestamp}] 🔐 LOGIN_DEBUG | [1/3] Data received from body:`, JSON.stringify(safeData));
    },
    queryResult: (user) => {
      const timestamp = new Date().toISOString();
      if (user) {
        console.log(`[${timestamp}] 🔐 LOGIN_DEBUG | [2/3] User found in DB:`, JSON.stringify({ id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id, guru_id: user.guru_id, hasPassword: !!user.password, is_profile_complete: user.is_profile_complete }));
      } else {
        console.log(`[${timestamp}] 🔐 LOGIN_DEBUG | [2/3] No records found`);
      }
    },
    passwordCheck: (isValid) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔐 LOGIN_DEBUG | [3/3] Password comparison result: ${isValid ? '✅ MATCH' : '❌ MISMATCH'}`);
    }
  },
  error: (error, context = '') => {
    const timestamp = new Date().toISOString();
    console.error(`\n[${timestamp}] ❌ ERROR    | Context: ${context}`);
    console.error(`[${timestamp}] ❌ ERROR    | Message: ${error.message}`);
    console.error(`[${timestamp}] ❌ ERROR    | Stack Trace:\n${error.stack}\n`);
  },
  notFound: (req) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🚫 NOT_FOUND  | ${req.method.padEnd(6)} | ${req.url.padEnd(40)} | No route matched this request`);
  }
};

app.use((req, res, next) => {
  logger.request(req, 'Incoming request');
  const originalSend = res.send;
  res.send = function (body) {
    logger.response(req, res, res.statusCode);
    return originalSend.call(this, body);
  };
  next();
});

app.use(cors());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan. Silakan login terlebih dahulu.'
    });
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token tidak valid atau telah kadaluarsa. Silakan login ulang.'
      });
    }
    req.user = user;
    next();
  });
};

const validateTenant = (req) => {
  const host = req.headers.host || '';
  let tenantId = null;
  if (host.includes('sdit')) {
    tenantId = 'SDIT';
  } else if (host.includes('smpit')) {
    tenantId = 'SMPIT';
  } else if (host.includes('smait')) {
    tenantId = 'SMAIT';
  } else {
    tenantId = 'SDIT';
  }
  return tenantId;
};

const findUserByUsername = async (username) => {
  const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return users[0];
};

app.post('/api/login', async (req, res) => {
  try {
    logger.loginDebug.receivedData(req.body);
    const { username, password } = req.body;
    const requestTenantId = validateTenant(req);

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi.'
    });
  }

  // Validate email format
  if (!validator.isEmail(username)) {
    return res.status(400).json({
      success: false,
      message: 'Format email tidak valid.'
    });
  }

    const user = await findUserByUsername(username);
    logger.loginDebug.queryResult(user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error(`[${new Date().toISOString()}] ❌ BCRYPT_ERROR | User: ${user.username} | Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'NULL'} | Error: ${bcryptError.message}`);
      return res.status(401).json({
        success: false,
        message: 'Format password tidak valid. Silakan hubungi administrator.'
      });
    }

    logger.loginDebug.passwordCheck(isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password salah. Silakan coba lagi.'
      });
    }

    const isProfileComplete = user.is_profile_complete === 1;
    const absensiMethod = requestTenantId === 'SDIT' ? 'hp' : 'scanner';

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      guru_id: user.guru_id,
      tenant_id: requestTenantId || user.tenant_id || 'SDIT',
      absensi_method: absensiMethod,
      timestamp: new Date().toISOString()
    };

    const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });

    if (!isProfileComplete) {
      return res.json({
        success: true,
        redirect: 'complete-profile.html',
        teacherId: user.guru_id,
        role: user.role,
        tenant_id: user.tenant_id,
        message: 'Profil belum lengkap. Silakan lengkapi profil Anda.'
      });
    }

    return res.json({
      success: true,
      redirect: (user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html'),
      token: token,
      role: user.role,
      tenant_id: user.tenant_id,
      message: 'Login berhasil!'
    });

  } catch (error) {
    logger.error(error, 'Login route');
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.'
    });
  }
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const attendance = await db.query('SELECT COUNT(*) as total FROM attendance_logs WHERE teacher_id = ?', [req.user.guru_id]);
    const todayAttendance = await db.query('SELECT jenis FROM attendance_logs WHERE teacher_id = ? AND DATE(waktu_scan) = CURDATE() ORDER BY waktu_scan DESC LIMIT 1', [req.user.guru_id]);
    res.json({
      success: true,
      message: 'Selamat datang di dashboard!',
      user: req.user,
      data: {
        totalAbsensi: attendance[0]?.total || 0,
        absensiToday: todayAttendance[0]?.jenis || 'Belum absen',
        status: 'Aktif'
      }
    });
  } catch (error) {
    logger.error(error, 'Dashboard route');
    res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

app.post('/api/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout berhasil.'
  });
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user[0]) { return res.status(404).json({ success: false, message: 'User tidak ditemukan' }); }
    res.json({
      success: true,
      profile: {
        id: user[0].id,
        username: user[0].username,
        role: user[0].role,
        guru_id: user[0].guru_id,
        tenant_id: user[0].tenant_id,
        is_profile_complete: user[0].is_profile_complete
      }
    });
  } catch (error) {
    logger.error(error, 'Profile route');
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// Public endpoint for profile completion (no auth required)
app.put('/api/profile-complete/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

  try {
    // Find user by guru_id (teacher_id)
    const userRows = await db.query('SELECT id FROM users WHERE guru_id = ?', [teacherId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const result = await db.query('UPDATE users SET is_profile_complete = 1 WHERE guru_id = ?', [teacherId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui!'
    });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('UPDATE users SET is_profile_complete = 1 WHERE id = ?', [req.user.id]);
    if (result.affectedRows === 0) { return res.status(404).json({ success: false, message: 'User tidak ditemukan' }); }
    res.json({
      success: true,
      message: 'Profil berhasil diperbarui!'
    });
  } catch (error) {
    logger.error(error, 'Update profile route');
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Public endpoint for WhatsApp notifications (used in profile completion)
app.post('/api/send-whatsapp-public', async (req, res) => {
  try {
    const { number, message, type, nama, jenis_kelamin, teacherId } = req.body;

    if (!number || !message) {
      return res.status(400).json({ success: false, message: 'Number and message are required' });
    }

    // Format message with Islamic etiquette if nama and jenis_kelamin provided
    let finalMessage = message;
    if (nama && jenis_kelamin) {
      finalMessage = formatIslamicMessage(nama, jenis_kelamin, message);
    }

    const result = await sendWhatsAppMessage(number, finalMessage);

    // Log the notification
    console.log(`[WHATSAPP NOTIFICATION] ${type || 'general'} - ${number}: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('[WHATSAPP NOTIFICATION ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp notification' });
  }
});

app.post('/api/send-whatsapp-notification', authenticateToken, async (req, res) => {
  try {
    const { number, message, type, nama, jenis_kelamin } = req.body;

    if (!number || !message) {
      return res.status(400).json({ success: false, message: 'Number and message are required' });
    }

    // Format message with Islamic etiquette if nama and jenis_kelamin provided
    let finalMessage = message;
    if (nama && jenis_kelamin) {
      finalMessage = formatIslamicMessage(nama, jenis_kelamin, message);
    }

    const result = await sendWhatsAppMessage(number, finalMessage);

    // Log the notification
    console.log(`[WHATSAPP NOTIFICATION] ${type || 'general'} - ${number}: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('[WHATSAPP NOTIFICATION ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp notification' });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Password lama dan baru harus diisi' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password baru minimal 8 karakter' });
  }

  // Check password strength
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    return res.status(400).json({ success: false, message: 'Password harus mengandung huruf besar, huruf kecil, dan angka' });
  }

    // Get current user data
    const userRows = await db.query('SELECT password, is_default_password FROM users WHERE id = ?', [req.user.id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const user = userRows[0];

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({ success: false, message: 'Password lama salah' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password and reset default password flag
    await db.query(
      'UPDATE users SET password = ?, is_default_password = 0, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password berhasil diubah!'
    });
  } catch (error) {
    logger.error(error, 'Change password route');
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { jenis, metode } = req.body;
    const currentTime = new Date().toTimeString().slice(0, 8);

    const [rules] = await db.query(
      'SELECT status_log FROM attendance_rules WHERE tenant_id = ? AND tipe = ? AND ? BETWEEN jam_mulai AND jam_selesai ORDER BY jam_mulai DESC LIMIT 1',
      [req.user.tenant_id, jenis === 'masuk' ? 'Datang' : 'Pulang', currentTime]
    );

    const status = rules.length > 0 ? rules[0].status_log : 'terlambat';

    const [result] = await db.query(
      'INSERT INTO attendance_logs (teacher_id, tenant_id, waktu_scan, jenis, metode, status) VALUES (?, ?, NOW(), ?, ?, ?)',
      [req.user.guru_id, req.user.tenant_id, jenis, metode || 'scanner', status]
    );

    // Send WhatsApp notification after successful attendance
    try {
      const [teacherData] = await db.query(
        'SELECT nama, no_wa, jenis_kelamin FROM teachers WHERE id = ? AND status_aktif = 1',
        [req.user.guru_id]
      );

      if (teacherData && teacherData.no_wa && teacherData.nama) {
        const waktuSekarang = new Date().toLocaleString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        const statusText = status === 'tepat_waktu' ? 'Tepat Waktu ⏰' :
                          status === 'terlambat' ? 'Terlambat ⏰' : status;

        const content = `🔔 *NOTIFIKASI ABSENSI*

Absensi Anda telah berhasil dicatat:

📅 *Waktu:* ${waktuSekarang}
📍 *Jenis:* ${jenis === 'masuk' ? 'Masuk' : 'Pulang'}
📊 *Status:* ${statusText}
📱 *Metode:* ${metode || 'Scanner'}
🏫 *Unit:* ${req.user.tenant_id}

Terima kasih telah melakukan absensi tepat waktu!`;

        const message = formatIslamicMessage(teacherData.nama, teacherData.jenis_kelamin, content);

        // Send WhatsApp notification (don't wait for response)
        sendWhatsAppMessage(teacherData.no_wa, message).catch(err =>
          console.log('[WHATSAPP ATTENDANCE ERROR]', err.message)
        );
      }
    } catch (waError) {
      console.log('[WHATSAPP ATTENDANCE ERROR]', waError.message);
      // Don't fail the attendance if WhatsApp fails
    }

    res.json({
      success: true,
      message: 'Absensi berhasil dicatat',
      data: { id: result.insertId, status }
    });
  } catch (error) {
    logger.error(error, 'Attendance route');
    res.status(500).json({ success: false, message: 'Error recording attendance' });
  }
});

app.use(express.static('public'));

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/api/admin/summary', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const getCount = async (sql) => {
      const result = await db.query(sql);
      const row = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0][0] : result[0]) : null;
      return row ? (row.total || 0) : 0;
    };

    const totalTeachers = await getCount('SELECT COUNT(*) as total FROM teachers WHERE status_aktif = 1');
    const activeToday = await getCount('SELECT COUNT(DISTINCT teacher_id) as total FROM attendance_logs WHERE DATE(waktu_scan) = CURDATE()');
    const lateToday = await getCount('SELECT COUNT(DISTINCT teacher_id) as total FROM attendance_logs WHERE DATE(waktu_scan) = CURDATE() AND status = "terlambat"');
    const incompleteProfiles = await getCount('SELECT COUNT(*) as total FROM users WHERE role = "guru" AND is_profile_complete = 0');

    res.json({
      success: true,
      data: {
        totalTeachers,
        activeToday,
        lateToday,
        incompleteProfiles
      }
    });
  } catch (err) {
    console.error('[SERVER ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



app.get('/api/admin/teachers', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  console.log('[API] /api/admin/teachers - Request received');
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log(`[API] /api/admin/teachers - Page: ${page}, Limit: ${limit}, Offset: ${offset}`);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM teachers t
      LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
      LEFT JOIN users u ON t.id = u.guru_id AND u.role = 'guru'
    `;
    const countResult = await db.query(countQuery);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get teachers with their tenant assignments (try multiple sources) with pagination
    const query = `
      SELECT
        t.id,
        t.nama,
        t.nik,
        t.nip,
        t.status_kepegawaian,
        t.email,
        t.status_aktif,
        COALESCE(
          GROUP_CONCAT(DISTINCT ta.tenant_id ORDER BY ta.tenant_id SEPARATOR ', '),
          u.tenant_id,
          'Belum ditugaskan'
        ) as tenant_names,
        GROUP_CONCAT(DISTINCT ta.tenant_id ORDER BY ta.tenant_id SEPARATOR ', ') as tenant_ids
      FROM teachers t
      LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
      LEFT JOIN users u ON t.id = u.guru_id AND u.role = 'guru'
      GROUP BY t.id, t.nama, t.nik, t.nip, t.status_kepegawaian, t.email, t.status_aktif, u.tenant_id
      ORDER BY t.nama
      LIMIT ? OFFSET ?
    `;

    const rows = await db.query(query, [limit, offset]);
    console.log(`[API] /api/admin/teachers - Query successful, found ${rows.length} teachers for page ${page}`);

    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('[SERVER ERROR] /api/admin/teachers - Database error:', error.message);
    console.error('[SERVER ERROR] /api/admin/teachers - Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Error fetching teachers: ' + error.message });
  }
});

app.get('/api/admin/teachers/:id', async (req, res) => {
  // Authentication bypassed for development - public access
  const { id } = req.params;
  try {
    const teacherRows = await db.query('SELECT id, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, email, status_kepegawaian, tmt, nip, scan_id, link_foto, status_aktif FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }
    const teacher = teacherRows[0];
    const assignmentRows = await db.query('SELECT tenant_id, jabatan_di_unit FROM teacher_assignments WHERE teacher_id = ?', [id]);
    teacher.assignments = assignmentRows;
    res.json({ success: true, data: teacher });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching teacher' });
  }
});

app.post('/api/admin/teachers', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { nama, nik, nip: nip_val, sebagai, email } = req.body;

  if (!nama || !nik) {
    return res.status(400).json({ success: false, message: 'Nama dan NIK wajib diisi.' });
  }

  // Validate NIK (16 digits for Indonesian ID)
  if (!/^\d{16}$/.test(nik)) {
    return res.status(400).json({ success: false, message: 'NIK harus terdiri dari 16 digit angka.' });
  }

  // Validate email format
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO teachers (nama, nik, nip, status_kepegawaian, email, status_aktif) VALUES (?, ?, ?, ?, ?, 1)',
      [nama, nik, nip_val, sebagai, email]
    );
    res.json({ success: true, message: 'Guru berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error adding teacher' });
  }
});

app.put('/api/admin/teachers/:id', upload.single('foto'), async (req, res) => {
  // Authentication bypassed for profile completion - public access
  const { id } = req.params;

  // Get data from both body and file
  const {
    nama, nik, nip: nip_val, email, tempat_lahir, tanggal_lahir,
    jenis_kelamin, no_wa, alamat, status_kepegawaian, status_aktif,
    tmt, link_foto, assignments_json
  } = req.body;

  if (!nama || !nik) {
    return res.status(400).json({ success: false, message: 'Nama dan NIK wajib diisi.' });
  }

  // Validate NIK (16 digits for Indonesian ID)
  if (!/^\d{16}$/.test(nik)) {
    return res.status(400).json({ success: false, message: 'NIK harus terdiri dari 16 digit angka.' });
  }

  // Validate email format
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
  }

  // Validate Indonesian phone number format
  if (no_wa && !/^(\+62|62|0)[8-9][0-9]{7,11}$/.test(no_wa.replace(/\s+/g, ''))) {
    return res.status(400).json({ success: false, message: 'Format nomor WhatsApp tidak valid. Gunakan format Indonesia (08xxxxxxxxx).' });
  }

  try {
    let photoPath = null; // Don't update photo path by default
    let shouldUpdatePhoto = false;

    // If a new file was uploaded, use its path and delete old file
    if (req.file) {
      photoPath = `/uploads/${req.file.filename}`;
      shouldUpdatePhoto = true;

      // Get current photo from database to delete old file
      const [currentTeacher] = await db.query('SELECT link_foto FROM teachers WHERE id = ?', [id]);
      if (currentTeacher && currentTeacher.link_foto && currentTeacher.link_foto.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, 'public', currentTeacher.link_foto);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log(`[FILE CLEANUP] Deleted old photo: ${oldFilePath}`);
          }
        } catch (fileError) {
          console.error('[FILE CLEANUP ERROR] Could not delete old photo:', fileError.message);
          // Continue with update even if file deletion fails
        }
      }
    }

    // Update teacher basic info
    let updateQuery = `UPDATE teachers SET
      nama = ?, nik = ?, nip = ?, email = ?, tempat_lahir = ?, tanggal_lahir = ?,
      jenis_kelamin = ?, no_wa = ?, alamat = ?, status_kepegawaian = ?,
      status_aktif = ?, tmt = ?, updated_at = NOW()`;
    let updateParams = [nama, nik, nip_val, email, tempat_lahir, tanggal_lahir,
      jenis_kelamin, no_wa, alamat, status_kepegawaian,
      status_aktif, tmt];

    // Only update link_foto if a new photo was uploaded
    if (shouldUpdatePhoto) {
      updateQuery += `, link_foto = ?`;
      updateParams.push(photoPath);
    }

    updateQuery += ` WHERE id = ?`;
    updateParams.push(id);

    await db.query(updateQuery, updateParams);

    // Handle assignments if provided
    if (assignments_json) {
      try {
        const assignments = JSON.parse(assignments_json);
        // Clear existing assignments
        await db.query('DELETE FROM teacher_assignments WHERE teacher_id = ?', [id]);
        // Insert new assignments
        for (const assignment of assignments) {
          await db.query(
            'INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)',
            [id, assignment.tenant_id, assignment.jabatan_di_unit]
          );
        }
      } catch (assignmentError) {
        console.error('Error processing assignments:', assignmentError);
        // Continue with teacher update even if assignments fail
      }
    }

    // Auto-create user account if not exists and teacher has email
    try {
      if (email && email.trim()) {
        const existingUser = await db.query('SELECT id FROM users WHERE username = ?', [email.trim()]);

        if (existingUser.length === 0) {
          // Get tenant_id from assignments
          const assignmentRows = await db.query('SELECT tenant_id FROM teacher_assignments WHERE teacher_id = ? LIMIT 1', [id]);
          const tenantId = assignmentRows.length > 0 ? assignmentRows[0].tenant_id : 'YPWI';

          // Create user account with default password
          const hashedPassword = await bcrypt.hash('ypwi123', 10);

          await db.query(
            'INSERT INTO users (username, password, role, guru_id, tenant_id, is_profile_complete, is_default_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email.trim(), hashedPassword, 'guru', id, tenantId, 1, 1] // is_profile_complete = 1, is_default_password = 1
          );

          console.log(`[AUTO-CREATE USER] Created user account for teacher ${nama} (${email})`);
        }
      }
    } catch (userError) {
      console.error('[AUTO-CREATE USER ERROR] Could not create user account:', userError.message);
      // Continue with response even if user creation fails
    }

    res.json({ success: true, message: 'Profil guru berhasil diperbarui' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error updating teacher profile' });
  }
});

app.delete('/api/admin/teachers/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;

  try {
    await db.query('UPDATE teachers SET status_aktif = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Guru berhasil dinonaktifkan' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error deleting teacher' });
  }
});

app.post('/api/admin/teachers/:id/create-user', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;

  try {
    const teacherRows = await db.query('SELECT email, nama FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    const teacher = teacherRows[0];
    if (!teacher.email) {
      return res.status(400).json({ success: false, message: 'Guru tidak memiliki email' });
    }

    const existingUser = await db.query('SELECT id FROM users WHERE username = ?', [teacher.email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User account sudah ada' });
    }

    const hashedPassword = await bcrypt.hash('ypwi123', 10);
    const assignmentRows = await db.query('SELECT tenant_id FROM teacher_assignments WHERE teacher_id = ? LIMIT 1', [id]);
    const tenantId = assignmentRows.length > 0 ? assignmentRows[0].tenant_id : 'YPWI';

    await db.query(
      'INSERT INTO users (username, password, role, guru_id, tenant_id, is_profile_complete, is_default_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [teacher.email, hashedPassword, 'guru', id, tenantId, 0, 1]
    );
    res.json({ success: true, message: 'User account berhasil dibuat' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Assignment routes
app.post('/api/admin/teachers/:id/assignments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;
  const { tenant_id, jabatan_di_unit } = req.body;

  if (!tenant_id || !jabatan_di_unit) {
    return res.status(400).json({ success: false, message: 'Tenant ID dan Jabatan wajib diisi.' });
  }

  try {
    // Check if teacher exists
    const teacherRows = await db.query('SELECT id FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    // Check if tenant exists
    const tenantRows = await db.query('SELECT tenant_id FROM tenants WHERE tenant_id = ?', [tenant_id]);
    if (tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Unit sekolah tidak ditemukan' });
    }

    // Check if assignment already exists
    const existingAssignment = await db.query('SELECT id FROM teacher_assignments WHERE teacher_id = ? AND tenant_id = ? AND jabatan_di_unit = ?', [id, tenant_id, jabatan_di_unit]);
    if (existingAssignment.length > 0) {
      return res.status(400).json({ success: false, message: 'Penugasan sudah ada untuk guru ini' });
    }

    await db.query(
      'INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)',
      [id, tenant_id, jabatan_di_unit]
    );
    res.json({ success: true, message: 'Penugasan berhasil ditambahkan' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error adding assignment' });
  }
});

app.delete('/api/admin/teachers/:id/assignments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;
  const { tenant_id, jabatan_di_unit } = req.body;

  if (!tenant_id || !jabatan_di_unit) {
    return res.status(400).json({ success: false, message: 'Tenant ID dan Jabatan wajib diisi.' });
  }

  try {
    // Check if teacher exists
    const teacherRows = await db.query('SELECT id FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    const result = await db.query(
      'DELETE FROM teacher_assignments WHERE teacher_id = ? AND tenant_id = ? AND jabatan_di_unit = ?',
      [id, tenant_id, jabatan_di_unit]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan' });
    }

    res.json({ success: true, message: 'Penugasan berhasil dihapus' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
});

app.get('/api/admin/attendance-logs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const rows = await db.query(`
      SELECT al.id, al.waktu_scan, al.status, al.jenis, t.nama as nama_guru, t.nip
      FROM attendance_logs al
      LEFT JOIN teachers t ON al.teacher_id = t.id
      ORDER BY al.waktu_scan DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching attendance logs' });
  }
});



// Public route for tenants (used in complete-profile)
app.get('/api/tenants', async (req, res) => {
  try {
    const rows = await db.query('SELECT tenant_id, nama_sekolah FROM tenants ORDER BY nama_sekolah ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenants' });
  }
});

// Public routes for teacher profile completion (no authentication required)
app.post('/api/teachers/:id/assignments', async (req, res) => {
  const { id } = req.params;
  const { tenant_id, jabatan_di_unit } = req.body;

  if (!tenant_id || !jabatan_di_unit) {
    return res.status(400).json({ success: false, message: 'Tenant ID dan Jabatan wajib diisi.' });
  }

  try {
    // Check if teacher exists
    const teacherRows = await db.query('SELECT id FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    // Check if tenant exists
    const tenantRows = await db.query('SELECT tenant_id FROM tenants WHERE tenant_id = ?', [tenant_id]);
    if (tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Unit sekolah tidak ditemukan' });
    }

    // Check if assignment already exists
    const existingAssignment = await db.query('SELECT id FROM teacher_assignments WHERE teacher_id = ? AND tenant_id = ? AND jabatan_di_unit = ?', [id, tenant_id, jabatan_di_unit]);
    if (existingAssignment.length > 0) {
      return res.status(400).json({ success: false, message: 'Penugasan sudah ada untuk guru ini' });
    }

    await db.query(
      'INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)',
      [id, tenant_id, jabatan_di_unit]
    );
    res.json({ success: true, message: 'Penugasan berhasil ditambahkan' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error adding assignment' });
  }
});

app.delete('/api/teachers/:id/assignments', async (req, res) => {
  const { id } = req.params;
  const { tenant_id, jabatan_di_unit } = req.body;

  if (!tenant_id || !jabatan_di_unit) {
    return res.status(400).json({ success: false, message: 'Tenant ID dan Jabatan wajib diisi.' });
  }

  try {
    // Check if teacher exists
    const teacherRows = await db.query('SELECT id FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    const result = await db.query(
      'DELETE FROM teacher_assignments WHERE teacher_id = ? AND tenant_id = ? AND jabatan_di_unit = ?',
      [id, tenant_id, jabatan_di_unit]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan' });
    }

    res.json({ success: true, message: 'Penugasan berhasil dihapus' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
});

app.get('/api/admin/tenants', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const rows = await db.query('SELECT tenant_id, nama_sekolah FROM tenants ORDER BY nama_sekolah ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenants' });
  }
});

app.get('/api/admin/tenants/:tenantId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { tenantId } = req.params;
  try {
    const rows = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants WHERE tenant_id = ?', [tenantId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenant' });
  }
});

app.put('/api/admin/tenants/:tenantId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { tenantId } = req.params;
  const { latitude, longitude, location_radius, location_name } = req.body;
  try {
    await db.query(
      'UPDATE tenants SET latitude = ?, longitude = ?, location_radius = ?, location_name = ? WHERE tenant_id = ?',
      [latitude, longitude, location_radius, location_name, tenantId]
    );
    res.json({ success: true, message: 'Tenant location updated' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error updating tenant location' });
  }
});

app.post('/api/admin/send-whatsapp-bulk/:tenantId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { tenantId } = req.params;
  const { message } = req.body;
  try {
    // Get teachers with name and gender for Islamic formatting
    const teachers = await db.query(
      'SELECT t.id, t.nama, t.no_wa, t.jenis_kelamin FROM teachers t INNER JOIN teacher_assignments ta ON t.id = ta.teacher_id WHERE ta.tenant_id = ? AND t.status_aktif = 1 AND t.no_wa IS NOT NULL',
      [tenantId]
    );

    const results = [];
    for (const teacher of teachers) {
      // Format message with Islamic greeting for each teacher
      const islamicMessage = formatIslamicMessage(teacher.nama, teacher.jenis_kelamin, message);
      const result = await sendWhatsAppMessage(teacher.no_wa, islamicMessage);
      results.push({ number: teacher.no_wa, name: teacher.nama, success: result.success });
    }

    const successful = results.filter(r => r.success).length;
    res.json({
      success: true,
      results,
      total_sent: successful,
      total_failed: results.length - successful,
      message: `Pesan berhasil dikirim ke ${successful} dari ${results.length} guru`
    });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error sending bulk WhatsApp' });
  }
});

app.post('/api/admin/send-whatsapp-single/:teacherId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { teacherId } = req.params;
  const { message } = req.body;
  try {
    const teacher = await db.query('SELECT nama, no_wa, jenis_kelamin FROM teachers WHERE id = ? AND status_aktif = 1', [teacherId]);
    if (teacher.length === 0 || !teacher[0].no_wa) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan atau tidak memiliki nomor WhatsApp' });
    }

    // Format message with Islamic greeting
    const islamicMessage = formatIslamicMessage(teacher[0].nama, teacher[0].jenis_kelamin, message);
    const result = await sendWhatsAppMessage(teacher[0].no_wa, islamicMessage);

    res.json({
      success: result.success,
      message: result.message,
      recipient: teacher[0].nama
    });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error sending WhatsApp' });
  }
});

app.get('/api/admin/tenant-progress', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    // Get all tenants with their progress
    const tenants = await db.query(`
      SELECT t.tenant_id, t.nama_sekolah,
             ROUND(AVG(
               (CASE WHEN te.nama IS NOT NULL AND te.nama != '' THEN 1 ELSE 0 END +
                CASE WHEN te.nik IS NOT NULL AND te.nik != '' THEN 1 ELSE 0 END +
                CASE WHEN te.tempat_lahir IS NOT NULL AND te.tempat_lahir != '' THEN 1 ELSE 0 END +
                CASE WHEN te.tanggal_lahir IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN te.jenis_kelamin IS NOT NULL AND te.jenis_kelamin != '' THEN 1 ELSE 0 END +
                CASE WHEN te.alamat IS NOT NULL AND te.alamat != '' THEN 1 ELSE 0 END +
                CASE WHEN te.no_wa IS NOT NULL AND te.no_wa != '' THEN 1 ELSE 0 END +
                CASE WHEN te.email IS NOT NULL AND te.email != '' THEN 1 ELSE 0 END +
                CASE WHEN te.status_kepegawaian IS NOT NULL AND te.status_kepegawaian != '' THEN 1 ELSE 0 END +
                CASE WHEN te.tmt IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN ta.tenant_id IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN ta.jabatan_di_unit IS NOT NULL AND ta.jabatan_di_unit != '' THEN 1 ELSE 0 END) / 13.0 * 100
             ), 1) as progress_percentage
      FROM tenants t
      LEFT JOIN teacher_assignments ta ON ta.tenant_id = t.tenant_id
      LEFT JOIN teachers te ON te.id = ta.teacher_id
      GROUP BY t.tenant_id, t.nama_sekolah
      ORDER BY t.nama_sekolah
    `);
    res.json({ success: true, data: tenants });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenant progress' });
  }
});

app.get('/api/admin/teacher-progress/:tenantId', authenticateToken, async (req, res) => {
  console.log('[API] /api/admin/teacher-progress/:tenantId - Request received for tenant:', req.params.tenantId);
  if (req.user.role !== 'admin') {
    console.log('[API] /api/admin/teacher-progress/:tenantId - Access denied for user:', req.user.username);
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { tenantId } = req.params;
  try {
    console.log('[API] /api/admin/teacher-progress/:tenantId - Executing query for tenant:', tenantId);
    const teachers = await db.query(`
      SELECT te.id, te.nama,
             ROUND((
               (CASE WHEN te.nama IS NOT NULL AND te.nama != '' THEN 1 ELSE 0 END +
                CASE WHEN te.nik IS NOT NULL AND te.nik != '' THEN 1 ELSE 0 END +
                CASE WHEN te.tempat_lahir IS NOT NULL AND te.tempat_lahir != '' THEN 1 ELSE 0 END +
                CASE WHEN te.tanggal_lahir IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN te.jenis_kelamin IS NOT NULL AND te.jenis_kelamin != '' THEN 1 ELSE 0 END +
                CASE WHEN te.alamat IS NOT NULL AND te.alamat != '' THEN 1 ELSE 0 END +
                CASE WHEN te.no_wa IS NOT NULL AND te.no_wa != '' THEN 1 ELSE 0 END +
                CASE WHEN te.email IS NOT NULL AND te.email != '' THEN 1 ELSE 0 END +
                CASE WHEN te.status_kepegawaian IS NOT NULL AND te.status_kepegawaian != '' THEN 1 ELSE 0 END +
                CASE WHEN te.tmt IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN ta.tenant_id IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN ta.jabatan_di_unit IS NOT NULL AND ta.jabatan_di_unit != '' THEN 1 ELSE 0 END) / 13.0 * 100
             ), 1) as progress_percentage,
             te.no_wa
      FROM teachers te
      INNER JOIN teacher_assignments ta ON ta.teacher_id = te.id
      WHERE ta.tenant_id = ? AND te.status_aktif = 1
      ORDER BY te.nama
    `, [tenantId]);
    console.log('[API] /api/admin/teacher-progress/:tenantId - Query successful, returning', teachers.length, 'teachers');
    res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('[SERVER ERROR] /api/admin/teacher-progress/:tenantId - Database error:', error.message);
    console.error('[SERVER ERROR] /api/admin/teacher-progress/:tenantId - Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Error fetching teacher progress: ' + error.message });
  }
});

app.get('/api/admin/rules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const rows = await db.query('SELECT * FROM attendance_rules ORDER BY tenant_id, tipe, jam_mulai');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching rules' });
  }
});

app.get('/api/admin/rules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;
  try {
    const rows = await db.query('SELECT * FROM attendance_rules WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rule tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching rule' });
  }
});

app.post('/api/admin/rules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log } = req.body;

  if (!tenant_id || !tipe || !jam_mulai || !jam_selesai || !status_log) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }

  try {
    const result = await db.query(
      'INSERT INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES (?, ?, ?, ?, ?, ?)',
      [tenant_id, tipe, jam_mulai, jam_selesai, keterangan || null, status_log]
    );
    res.json({ success: true, message: 'Aturan berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error adding rule' });
  }
});

app.put('/api/admin/rules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;
  const { tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log } = req.body;

  if (!tenant_id || !tipe || !jam_mulai || !jam_selesai || !status_log) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }

  try {
    await db.query(
      'UPDATE attendance_rules SET tenant_id = ?, tipe = ?, jam_mulai = ?, jam_selesai = ?, keterangan = ?, status_log = ? WHERE id = ?',
      [tenant_id, tipe, jam_mulai, jam_selesai, keterangan || null, status_log, id]
    );
    res.json({ success: true, message: 'Aturan berhasil diupdate' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error updating rule' });
  }
});

app.delete('/api/admin/rules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { id } = req.params;

  try {
    await db.query('DELETE FROM attendance_rules WHERE id = ?', [id]);
    res.json({ success: true, message: 'Aturan berhasil dihapus' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error deleting rule' });
  }
});



app.use((req, res, next) => {
  logger.notFound(req);
  res.status(404).json({
    success: false,
    message: 'Rute tidak ditemukan. Silakan periksa URL dan coba lagi.'
  });
});

app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled application error');
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan sistem yang tidak terduga.'
  });
});



startServer().catch(err => {
  logger.error(err, 'Server start failed');
  process.exit(1);
});

// WhatsApp message helpers for Islamic etiquette
function generateIslamicGreeting(nama, jenisKelamin) {
  const panggilan = jenisKelamin === 'P' ? 'Ustadzah' : 'Ustadz';
  return `Assalamu'alaikum ${panggilan} ${nama}`;
}

function generateIslamicDua() {
  const duas = [
    "Semoga Allah SWT senantiasa memberikan kesehatan, kekuatan, dan kemudahan dalam menjalankan tugas sebagai pendidik.",
    "Semoga Allah SWT memberikan pahala yang berlipat ganda atas pengabdian Bapak/Ibu di dunia pendidikan.",
    "Semoga Allah SWT memudahkan segala urusan Bapak/Ibu dan keluarga, serta memberikan keberkahan di setiap langkah.",
    "Semoga Allah SWT menjadikan Bapak/Ibu sebagai teladan yang baik bagi para siswa dan masyarakat.",
    "Semoga Allah SWT memberikan ilmu yang bermanfaat dan amal yang diterima di dunia dan akhirat."
  ];
  return duas[Math.floor(Math.random() * duas.length)];
}

function generateIslamicMotivation() {
  const motivations = [
    "Ingatlah, setiap langkah kecil dalam pendidikan adalah investasi untuk generasi penerus umat.",
    "Dengan sabar dan istiqamah, Bapak/Ibu telah berkontribusi besar dalam membangun karakter bangsa.",
    "Semangat terus menginspirasi siswa-siswi dengan akhlak mulia dan ilmu yang bermanfaat.",
    "Setiap doa dan nasihat Bapak/Ibu adalah cahaya yang menerangi masa depan anak bangsa.",
    "Teruslah berjuang di jalan pendidikan, karena pahala orang-orang yang mengajarkan kebaikan tidak akan pernah terputus."
  ];
  return motivations[Math.floor(Math.random() * motivations.length)];
}

function formatIslamicMessage(nama, jenisKelamin, content) {
  const salam = generateIslamicGreeting(nama, jenisKelamin);
  const dua = generateIslamicDua();
  const motivasi = generateIslamicMotivation();

  return `${salam}

${content}

${dua}

${motivasi}

Barakallahu fiikum,
*YPWI Lutim*`;
}

// WhatsApp integration using Whacenter
async function sendWhatsAppMessage(number, message) {
  return new Promise((resolve) => {
    try {
      // Ensure number starts with country code (Indonesia)
      let cleanNumber = number.replace(/\D/g, ''); // Remove non-digits

      // Add country code if not present
      if (!cleanNumber.startsWith('62')) {
        if (cleanNumber.startsWith('0')) {
          cleanNumber = '62' + cleanNumber.substring(1);
        } else {
          cleanNumber = '62' + cleanNumber;
        }
      }

      const whatsappEndpoint = process.env.WHATSAPP_ENDPOINT;
      const deviceId = process.env.WHATSAPP_DEVICE_ID;

      if (!whatsappEndpoint || !deviceId) {
        console.error('[WHATSAPP] Missing WhatsApp configuration in .env');
        resolve({ success: false, message: 'WhatsApp configuration missing' });
        return;
      }

      console.log(`[WHATSAPP] Sending to ${cleanNumber}: ${message.substring(0, 50)}...`);

      const params = new URLSearchParams();
      params.append('device_id', deviceId);
      params.append('number', cleanNumber);
      params.append('message', message);

      console.log('WhatsApp data prepared with device_id and number');

      // Use fetch like in the working example
      fetch(whatsappEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      .then(async response => {
        try {
          const result = await response.json();
          console.log('WhatsApp Response Status:', response.status);
          console.log('WhatsApp Response Data:', result);

          if (response.ok && result.status === true) {
            console.log('✅ WhatsApp message sent successfully');
            resolve({ success: true, message: 'Message sent successfully', data: result });
          } else {
            console.log('❌ WhatsApp message failed');
            resolve({ success: false, message: 'Failed to send message', data: result });
          }
        } catch (parseError) {
          console.error('[WHATSAPP PARSE ERROR]', parseError.message);
          resolve({ success: false, message: 'Invalid response from WhatsApp service' });
        }
      })
      .catch(error => {
        if (error.name === 'TimeoutError') {
          console.error('[WHATSAPP ERROR] Request timeout - WhatsApp service unreachable');
          resolve({ success: false, message: 'WhatsApp service timeout - message queued for retry', error: 'TIMEOUT' });
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.error('[WHATSAPP ERROR] Network connection failed - check firewall/internet');
          resolve({ success: false, message: 'Network connectivity issue - check internet connection', error: 'NETWORK' });
        } else {
          console.error('[WHATSAPP ERROR]', error.message);
          resolve({ success: false, message: `Connection error: ${error.message}`, error: 'UNKNOWN' });
        }
      });

    } catch (error) {
      console.error('[WHATSAPP SETUP ERROR]', error.message);
      resolve({ success: false, message: `Setup Error: ${error.message}` });
    }
  });
}

      const whatsappEndpoint = process.env.WHATSAPP_ENDPOINT;
      const deviceId = process.env.WHATSAPP_DEVICE_ID;

      if (!whatsappEndpoint || !deviceId) {
        console.error('[WHATSAPP] Missing WhatsApp configuration in .env');
        resolve({ success: false, message: 'WhatsApp configuration missing' });
        return;
      }

      console.log(`[WHATSAPP] Sending to ${cleanNumber}: ${message.substring(0, 50)}...`);

      const postData = new URLSearchParams({
        device_id: deviceId,
        number: cleanNumber,
        message: message,
        // Optional parameters for whacenter
        // prio: '1' // Priority message
      }).toString();

      console.log('Sending WhatsApp data:', JSON.stringify({
        device_id: deviceId,
        number: cleanNumber,
        message: message.substring(0, 50) + '...'
      }, null, 2));

      const url = new URL(whatsappEndpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000 // 30 second timeout
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`[WHATSAPP] Response status: ${res.statusCode}`);
          console.log(`[WHATSAPP] Response body: ${data}`);

          try {
            const jsonResponse = JSON.parse(data);

            // Whacenter success response format: {"status":true,"message":"message sent","data":{"id":123}}
            if (res.statusCode === 200 && jsonResponse.status === true) {
              resolve({ success: true, message: 'Message sent successfully', data: jsonResponse });
            } else {
              resolve({ success: false, message: `Failed to send: ${jsonResponse.message || data}` });
            }
          } catch (parseError) {
            // If response is not JSON, treat as plain text
            if (res.statusCode === 200 && !data.includes('error') && !data.includes('Error')) {
              resolve({ success: true, message: 'Message sent successfully' });
            } else {
              resolve({ success: false, message: `Failed to send: ${data}` });
            }
          }
        });
      });

      req.on('error', (error) => {
        console.error('[WHATSAPP ERROR]', error.message);
        resolve({ success: false, message: `Error: ${error.message}` });
      });

      req.on('timeout', () => {
        console.error('[WHATSAPP ERROR] Request timeout after 30 seconds');
        req.destroy();
        resolve({ success: false, message: 'Request timeout - WhatsApp service may be slow' });
      });

      // Write data to request body
      req.write(postData);
      req.end();

  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('[WHATSAPP ERROR] Connection timeout/refused - check firewall/proxy settings');
      resolve({
        success: false,
        message: 'WhatsApp service unreachable - check network/firewall settings',
        error: 'CONNECTION_BLOCKED'
      });
    } else {
      console.error('[WHATSAPP ERROR]', error.message);
      resolve({ success: false, message: `Error: ${error.message}` });
    }
  }
  });
}

async function startServer() {
  console.log('Starting server...');
  try {
    await db.initializeDatabase();
    console.log('Database initialized, starting server');
  } catch (dbError) {
    console.log('Database connection failed:', dbError.message);
    console.log('Continuing without database...');
  }

  // Insert sample data
  try {
    console.log('Inserting sample data...');
    // Insert sample tenant
    await db.query("INSERT IGNORE INTO tenants (tenant_id, nama_sekolah, absensi_method) VALUES ('SDIT', 'SDIT WAHDAH ISLAMIYAH', 'hp')");
    console.log('Sample tenant inserted');

    // Check existing data
    const existingTeachers = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
    const existingAssignments = await db.query('SELECT COUNT(*) as count FROM teacher_assignments');
    console.log(`Found ${existingTeachers[0].count} active teachers and ${existingAssignments[0].count} assignments in database`);

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.log('Sample data insert failed:', error.message);
    console.log('Continuing without sample data...');
  }

  app.listen(PORT, () => {
    console.log('🚀 Server YPWI Lutim berjalan di http://localhost:' + PORT);
    console.log('🔐 Login endpoint: POST /api/login');
    console.log('📊 Dashboard endpoint: GET /api/dashboard (protected)');
  });
}

app.listen(PORT, () => {
  console.log('🚀 Server YPWI Lutim berjalan di http://localhost:' + PORT);
  console.log('🔐 Login endpoint: POST /api/login');
  console.log('📊 Dashboard endpoint: GET /api/dashboard (protected)');
});

startServer().catch(err => {
  logger.error(err, 'Server start failed');
  process.exit(1);
});