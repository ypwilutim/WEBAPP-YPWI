require('dotenv').config();

console.log('Loading environment variables...');
console.log('WHATSAPP_ENDPOINT:', process.env.WHATSAPP_ENDPOINT ? 'LOADED' : 'NOT FOUND');
console.log('WHATSAPP_DEVICE_ID:', process.env.WHATSAPP_DEVICE_ID ? 'LOADED' : 'NOT FOUND');

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
const axios = require('axios');
const db = require('./db');

// Native fetch is available in modern Node.js, no import needed

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'ypwi-secret-key-2026';

// Multer config for selfie uploads
const selfieStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'selfie/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'selfie-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const selfieUpload = multer({ storage: selfieStorage });

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
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://unpkg.com"],
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

// app.use(limiter);
// app.use('/api/auth/login', authLimiter);

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
const teacherStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const teacherUpload = multer({
  storage: teacherStorage,
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

app.use(cors());
app.use(express.static('public'));

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
};

// Request logging middleware
app.use((req, res, next) => {
  logger.request(req);
  const originalSend = res.send;
  res.send = function(body) {
    logger.response(req, res, res.statusCode);
    return originalSend.call(this, body);
  };
  next();
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan.'
    });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Token tidak valid.'
      });
    }
    req.user = user;
    next();
  });
};

// WhatsApp integration using Whacenter
async function sendWhatsAppMessage(number, message) {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('📤 WhatsApp disabled, skipping message to:', number);
    return { success: true, message: 'WhatsApp disabled' };
  }

  console.log('📤 Sending WhatsApp message to:', number);

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

    console.log(`[WHATSAPP] Sending to ${cleanNumber}: ${message.substring(0, 50)}...`);

    const params = new URLSearchParams();
    params.append('device_id', process.env.WHATSAPP_DEVICE_ID);
    params.append('number', cleanNumber);
    params.append('message', message);

    const endpoint = process.env.WHATSAPP_ENDPOINT;
    console.log('📤 Sending WhatsApp to:', endpoint);
    console.log('📤 Params:', { device_id: process.env.WHATSAPP_DEVICE_ID, number: cleanNumber, message: message.substring(0, 100) + '...' });

    const response = await axios.post(endpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 5000  // 5 second timeout
    });

    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);

    if (response.status === 200 && response.data.status === true) {
      console.log('✅ SUCCESS: WhatsApp message sent!');
      console.log('Message ID:', response.data.data?.id);
      return { success: true, message: 'Message sent successfully', data: response.data };
    } else {
      console.log('❌ FAILED: WhatsApp message not sent');
      console.log('Error details:', response.data);
      return { success: false, message: 'Failed to send message: ' + (response.data.message || response.data.error || 'Unknown error'), data: response.data };
    }

  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.error('Full error:', error);
    return { success: false, message: `Network error: ${error.message}` };
  }
}

// Test route
app.get('/api/test', (req, res) => {
  console.log('[DEBUG] /api/test called');
  res.json({ success: true, message: 'Test route works', timestamp: new Date().toISOString() });
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi.'
    });
  }

  // Validate email format (disabled to allow non-email usernames for admin)
  // if (!validator.isEmail(username)) {
  //   return res.status(400).json({
  //     success: false,
  //     message: 'Format email tidak valid.'
  //   });
  // }

   try {
     logger.loginDebug.receivedData({ username, password: '[HIDDEN]' });

     // Validate email format (optional, comment out to allow non-email usernames)
     // if (!validator.isEmail(username)) {
     //   return res.status(400).json({
     //     success: false,
     //     message: 'Format email tidak valid.'
     //   });
     // }

     const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);
     logger.loginDebug.queryResult(users[0]);

     if (users.length === 0) {
       return res.status(401).json({
         success: false,
         message: 'Username atau password salah.'
       });
     }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    logger.loginDebug.passwordCheck(isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

    const isProfileComplete = user.is_profile_complete === 1;
    const absensiMethod = user.tenant_id === 'SDIT' ? 'hp' : 'scanner';

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      guru_id: user.guru_id,
      tenant_id: user.tenant_id,
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
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenant_id: user.tenant_id,
        guru_id: user.guru_id,
        is_profile_complete: user.is_profile_complete,
        is_default_password: user.is_default_password
      }
    });

  } catch (error) {
    logger.error(error, 'Login route');
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem.'
    });
  }
});

// Profile route
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('UPDATE users SET is_profile_complete = 1 WHERE id = ?', [req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    res.json({
      success: true,
      message: 'Profil berhasil diperbarui!'
    });
  } catch (error) {
    logger.error(error, 'Update profile route');
    res.status(500).json({ success: false, message: 'Error updating profile' });
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
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp notification' });
  }
});

// Test endpoint
app.get('/api/test-history', function(req, res) {
  res.json({ success: true, message: 'Test endpoint working' });
});

// Dashboard route
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('Dashboard req.user:', req.user);
    console.log('guru_id value:', req.user.guru_id, 'id value:', req.user.id, 'role:', req.user.role);

    let userQuery, attendanceQuery, todayRecords;
    if (req.user.role === 'admin') {
      userQuery = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      attendanceQuery = await db.query('SELECT COUNT(*) as total FROM attendance_logs');
      todayRecords = await db.query('SELECT jenis FROM attendance_logs WHERE DATE(waktu_scan) = CURDATE()');
    } else {
      userQuery = await db.query('SELECT * FROM users WHERE guru_id = ?', [req.user.guru_id]);
      attendanceQuery = await db.query('SELECT COUNT(*) as total FROM attendance_logs WHERE teacher_id = ?', [req.user.guru_id]);
      todayRecords = await db.query('SELECT jenis FROM attendance_logs WHERE teacher_id = ? AND DATE(waktu_scan) = CURDATE()', [req.user.guru_id]);
    }

    console.log('todayRecords:', todayRecords);
    const hasMasuk = todayRecords.some(r => r.jenis === 'masuk');
    const hasPulang = todayRecords.some(r => r.jenis === 'pulang');

    let absensiToday;
    if (hasMasuk && hasPulang) {
      absensiToday = 'Sudah absen lengkap';
    } else if (hasMasuk) {
      absensiToday = 'Sudah absen masuk';
    } else {
      absensiToday = 'Belum absen';
    }

    console.log('Dashboard user query result:', userQuery);
    console.log('User[0]:', userQuery[0]);
    console.log('hasMasuk:', hasMasuk, 'hasPulang:', hasPulang, 'absensiToday:', absensiToday);

    res.json({
      success: true,
      data: {
        totalAbsensi: attendanceQuery[0]?.total || 0,
        absensiToday: absensiToday,
        hasMasuk: hasMasuk,
        hasPulang: hasPulang,
        user: userQuery[0]
      }
    });
  } catch (error) {
    logger.error(error, 'Dashboard route');
    res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

// Attendance route
app.post('/api/attendance', authenticateToken, selfieUpload.single('selfie'), async (req, res) => {
  try {
    const { jenis, metode, latitude, longitude, dinas_luar, kegiatan_dinas } = req.body;
    const currentTime = new Date().toTimeString().slice(0, 8);
    let selfie_url = null;
    let is_dinas_luar = dinas_luar === 'true' || dinas_luar === true;
    let tenant_id = req.user.tenant_id; // Default to assigned tenant

    if (req.file) {
      selfie_url = req.file.path;
    }

    // Validate location if coordinates provided
    if (latitude && longitude) {
      try {
        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);

        // Get all units with coordinates
        const [allUnits] = await db.query(
          'SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius FROM tenants WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
        );

        let withinAssigned = false;
        let withinOther = false;
        let assignedSchool = null;
        let otherSchool = null;

        // Check assigned units first
        const assignedUnits = await db.query(
          'SELECT t.tenant_id, t.nama_sekolah, t.latitude, t.longitude, t.location_radius FROM tenants t JOIN teacher_assignments ta ON t.tenant_id = ta.tenant_id WHERE ta.teacher_id = ? AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL',
          [req.user.guru_id]
        );

        for (const unit of assignedUnits) {
          const distance = calculateDistance(userLat, userLng, parseFloat(unit.latitude), parseFloat(unit.longitude));
          const radius = unit.location_radius || 200;
          if (distance * 1000 <= radius) {
            withinAssigned = true;
            assignedSchool = unit;
            break;
          }
        }

        // If not within assigned, check other units
        if (!withinAssigned) {
          // Get all units with coordinates
          const allUnits = await db.query(
            'SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius FROM tenants WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
          );

          for (const unit of allUnits) {
            // Skip assigned units
            if (assignedUnits.some(a => a.tenant_id === unit.tenant_id)) continue;

            const distance = calculateDistance(userLat, userLng, parseFloat(unit.latitude), parseFloat(unit.longitude));
            const radius = unit.location_radius || 200;
            if (distance * 1000 <= radius) {
              withinOther = true;
              otherSchool = unit;
              tenant_id = unit.tenant_id; // Change tenant to the unit where they are
              is_dinas_luar = true;
              break;
            }
          }
        }

        console.log(`[LOCATION VALIDATION] User at ${userLat},${userLng}`);
        if (withinAssigned) {
          console.log(`[LOCATION VALIDATION] ✅ Within assigned school: ${assignedSchool.nama_sekolah}`);
        } else if (withinOther) {
          console.log(`[LOCATION VALIDATION] ✅ Within other school (dinas luar): ${otherSchool.nama_sekolah}`);
        } else {
          return res.status(403).json({
            success: false,
            message: 'Absensi gagal! Anda berada di luar radius lokasi semua unit sekolah.'
          });
        }

      } catch (locationError) {
        console.error('[LOCATION VALIDATION] Error validating location:', locationError);
        // Continue with attendance if location validation fails
      }
    } else {
      console.log(`[LOCATION VALIDATION] No GPS coordinates provided`);
    }

    let rules = [];
    try {
      [rules] = await db.query(
        'SELECT status_log FROM attendance_rules WHERE tenant_id = ? AND tipe = ? AND ? BETWEEN jam_mulai AND jam_selesai ORDER BY jam_mulai DESC LIMIT 1',
        [req.user.tenant_id, jenis === 'masuk' ? 'Datang' : 'Pulang', currentTime]
      );
    } catch (dbError) {
      console.log('[ATTENDANCE] attendance_rules table not found or error, using default status');
      rules = []; // Fallback to empty array
    }

    const status = (rules && rules.length > 0) ? rules[0].status_log : 'terlambat';

    const result = await db.query(
      'INSERT INTO attendance_logs (teacher_id, tenant_id, waktu_scan, jenis, metode, status, dinas_luar, kegiatan_dinas, selfie_url, latitude, longitude) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.guru_id, tenant_id, jenis, metode || 'scanner', status, is_dinas_luar ? 1 : 0, kegiatan_dinas || null, selfie_url, latitude || null, longitude || null]
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

        let content = `🔔 *NOTIFIKASI ABSENSI*

Absensi Anda telah berhasil dicatat:

📅 *Waktu:* ${waktuSekarang}
📍 *Jenis:* ${jenis === 'masuk' ? 'Masuk' : 'Pulang'}
📊 *Status:* ${statusText}
📱 *Metode:* ${metode || 'Scanner'}
🏫 *Unit:* ${tenant_id}`;

        if (is_dinas_luar) {
          content += `
🚗 *Dinas Luar:* Ya
📝 *Kegiatan:* ${kegiatan_dinas || 'Tidak disebutkan'}`;
        }

        content += `

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

// Change password route
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

// Helper function for Islamic message formatting
function formatIslamicMessage(nama, jenisKelamin, content) {
  const panggilan = jenisKelamin === 'P' ? 'Ustadzah' : 'Ustadz';
  const generateIslamicGreeting = (nama, panggilan) => {
    return `Assalamu'alaikum ${panggilan} ${nama}`;
  };

  const generateIslamicDua = (panggilan) => {
    const duas = [
      "Semoga Allah SWT senantiasa memberikan kesehatan, kekuatan, dan kemudahan dalam menjalankan tugas sebagai pendidik.",
      "Semoga Allah SWT memberikan pahala yang berlipat ganda atas pengabdian Bapak/Ibu di dunia pendidikan.",
      `Semoga Allah SWT memudahkan segala urusan ${panggilan} dan keluarga, serta memberikan keberkahan di setiap langkah.`,
      "Semoga Allah SWT menjadikan Bapak/Ibu sebagai teladan yang baik bagi para siswa dan masyarakat.",
      "Semoga Allah SWT memberikan ilmu yang bermanfaat dan amal yang diterima di dunia dan akhirat."
    ];
    return duas[Math.floor(Math.random() * duas.length)];
  };

  const generateIslamicMotivation = (panggilan) => {
    const motivations = [
      "Ingatlah, setiap langkah kecil dalam pendidikan adalah investasi untuk generasi penerus umat.",
      `Dengan sabar dan istiqamah, ${panggilan} telah berkontribusi besar dalam membangun karakter bangsa.`,
      "Semangat terus menginspirasi siswa-siswi dengan akhlak mulia dan ilmu yang bermanfaat.",
      `Setiap doa dan nasihat ${panggilan} adalah cahaya yang menerangi masa depan anak bangsa.`,
      "Teruslah berjuang di jalan pendidikan, karena pahala orang-orang yang mengajarkan kebaikan tidak akan pernah terputus."
    ];
    return motivations[Math.floor(Math.random() * motivations.length)];
  };

  const salam = generateIslamicGreeting(nama, panggilan);
  const dua = generateIslamicDua(panggilan);
  const motivasi = generateIslamicMotivation(panggilan);

  return `${salam}

${content}

${dua}

${motivasi}

Barakallahu fiikum,
*YPWI Lutim*`;
}

// Admin dashboard routes
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Token not found.' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Access denied. Token not valid.' });
  }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
    }
    req.user = user;
    next();
  });
};

// Public search endpoint for teachers (no auth required)
app.get('/api/search/teachers', async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const limit = parseInt(req.query.limit) || 50;

    let query = `
      SELECT
        t.id, t.nama, t.nik, t.nip, t.email, t.status_aktif,
        CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END as has_user,
        GROUP_CONCAT(DISTINCT CONCAT(ta.tenant_id, ':', ta.jabatan_di_unit, ':', tn.nama_sekolah)) as assignments
      FROM teachers t
      LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
      LEFT JOIN tenants tn ON ta.tenant_id = tn.tenant_id
      LEFT JOIN users u ON t.email = u.username AND u.role = 'guru'
      WHERE t.status_aktif = 1
    `;
    let params = [];

    if (searchTerm) {
      query += ' AND t.nama LIKE ?';
      params.push(`%${searchTerm}%`);
    }

    query += ' GROUP BY t.id ORDER BY t.nama ASC LIMIT ?';
    params.push(limit);

    const teachers = await db.query(query, params);

    // Format assignments
    const formattedTeachers = teachers.map(teacher => ({
      ...teacher,
      assignments: teacher.assignments ? teacher.assignments.split(',').map(a => {
        const [tenant_id, jabatan, nama_sekolah] = a.split(':');
        return { tenant_id, jabatan_di_unit: jabatan, nama_sekolah };
      }) : []
    }));

    res.json({ success: true, data: formattedTeachers });
  } catch (error) {
    console.error('Public teacher search error:', error);
    res.status(500).json({ success: false, message: 'Error searching teachers' });
  }
});

// Test endpoint for admin routes (no auth required)
app.get('/api/admin/test', (req, res) => {
  res.json({ success: true, message: 'Admin routes are working!' });
});

// Test endpoint with auth
app.get('/api/admin/test-auth', authenticateAdmin, (req, res) => {
  res.json({ success: true, message: 'Admin auth working!', user: req.user });
});

// Test endpoint to get admin token (for testing only - remove in production)
app.get('/api/admin/get-test-token', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({
      id: 120,
      username: 'admin',
      role: 'admin',
      tenant_id: 'YPWILUTIM',
      timestamp: new Date().toISOString()
    }, SECRET_KEY, { expiresIn: '8h' });

    res.json({ success: true, token: token, message: 'Test token generated (remove this endpoint in production!)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating test token' });
  }
});

// Admin summary endpoint
app.get('/api/admin/summary', authenticateAdmin, async (req, res) => {
  try {
    // Get total teachers
    const [totalTeachersResult] = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
    const totalTeachers = totalTeachersResult.count;

    // Get active today (teachers who have attendance today)
    const [activeTodayResult] = await db.query(`
      SELECT COUNT(DISTINCT teacher_id) as count
      FROM attendance_logs
      WHERE DATE(waktu_scan) = CURDATE()
    `);
    const activeToday = activeTodayResult.count;

    // Get late today
    const [lateTodayResult] = await db.query(`
      SELECT COUNT(*) as count
      FROM attendance_logs
      WHERE DATE(waktu_scan) = CURDATE() AND status = 'terlambat'
    `);
    const lateToday = lateTodayResult.count;

    res.json({
      success: true,
      data: {
        totalTeachers,
        activeToday,
        lateToday
      }
    });
  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({ success: false, message: 'Error fetching admin summary' });
  }
});

// Admin teachers list with pagination
app.get('/api/admin/teachers', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const [totalResult] = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
    const total = totalResult.count;

    // Get teachers with assignments and school names
    const teachers = await db.query(`
      SELECT
        t.id, t.nama, t.nik, t.nip, t.email, t.status_kepegawaian, t.status_aktif, t.no_wa,
        GROUP_CONCAT(DISTINCT CONCAT(ta.tenant_id, ':', ta.jabatan_di_unit, ':', tn.nama_sekolah)) as assignments
      FROM teachers t
      LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
      LEFT JOIN tenants tn ON ta.tenant_id = tn.tenant_id
      WHERE t.status_aktif = 1
      GROUP BY t.id
      ORDER BY t.nama ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Format assignments
    const formattedTeachers = teachers.map(teacher => ({
      ...teacher,
      assignments: teacher.assignments ? teacher.assignments.split(',').map(a => {
        const [tenant_id, jabatan, nama_sekolah] = a.split(':');
        return { tenant_id, jabatan_di_unit: jabatan, nama_sekolah };
      }) : []
    }));

    res.json({
      success: true,
      data: formattedTeachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin teachers error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
});

// Admin attendance logs
app.get('/api/admin/attendance-logs', authenticateAdmin, async (req, res) => {
  try {
    const dateFilter = req.query.date;
    const statusFilter = req.query.status;

    let query = `
      SELECT
        al.id, al.teacher_id, al.waktu_scan, al.jenis, al.status, al.metode,
        t.nama, t.nip
      FROM attendance_logs al
      JOIN teachers t ON al.teacher_id = t.id
      WHERE 1=1
    `;
    let params = [];

    if (dateFilter) {
      query += ' AND DATE(al.waktu_scan) = ?';
      params.push(dateFilter);
    }

    if (statusFilter && statusFilter !== '') {
      query += ' AND al.status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY al.waktu_scan DESC LIMIT 100';

    const logs = await db.query(query, params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Admin attendance logs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance logs' });
  }
});

// Admin tenants list
app.get('/api/admin/tenants', authenticateAdmin, async (req, res) => {
  try {
    console.log('Fetching tenants with location data...');
    const tenants = await db.query('SELECT tenant_id, nama_sekolah, COALESCE(latitude, NULL) as latitude, COALESCE(longitude, NULL) as longitude, COALESCE(location_radius, 100) as location_radius, location_name FROM tenants ORDER BY nama_sekolah ASC');
    console.log('Tenants fetched:', tenants.length, 'records');
    console.log('First tenant sample:', tenants[0]);
    res.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Admin tenants error:', error);
    res.status(500).json({ success: false, message: 'Error fetching tenants' });
  }
});

// Admin rules list
app.get('/api/admin/rules', authenticateAdmin, async (req, res) => {
  try {
    const rules = await db.query('SELECT * FROM attendance_rules ORDER BY tenant_id, tipe, jam_mulai');
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Admin rules error:', error);
    res.status(500).json({ success: false, message: 'Error fetching rules' });
  }
});

// Admin tenant detail
app.get('/api/admin/tenants/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const [tenant] = await db.query('SELECT * FROM tenants WHERE tenant_id = ?', [tenantId]);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Admin tenant detail error:', error);
    res.status(500).json({ success: false, message: 'Error fetching tenant' });
  }
});

// Admin update tenant location
app.put('/api/admin/tenants/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { latitude, longitude, location_radius, location_name } = req.body;

    // Validate input
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ success: false, message: 'Latitude harus antara -90 dan 90' });
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ success: false, message: 'Longitude harus antara -180 dan 180' });
    }
    if (location_radius !== undefined && (location_radius < 10 || location_radius > 1000)) {
      return res.status(400).json({ success: false, message: 'Radius lokasi harus antara 10 dan 1000 meter' });
    }

    // Build update query dynamically
    let updateFields = [];
    let updateValues = [];

    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateValues.push(latitude);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateValues.push(longitude);
    }
    if (location_radius !== undefined) {
      updateFields.push('location_radius = ?');
      updateValues.push(location_radius);
    }
    if (location_name !== undefined) {
      updateFields.push('location_name = ?');
      updateValues.push(location_name);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate' });
    }

    updateValues.push(tenantId); // Add tenant_id for WHERE clause

    const query = `UPDATE tenants SET ${updateFields.join(', ')}, updated_at = NOW() WHERE tenant_id = ?`;
    const result = await db.query(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    res.json({ success: true, message: 'Lokasi sekolah berhasil diupdate' });
  } catch (error) {
    console.error('Admin update tenant location error:', error);
    res.status(500).json({ success: false, message: 'Error updating tenant location' });
  }
});

// Admin rule detail
app.get('/api/admin/rules/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rule] = await db.query('SELECT * FROM attendance_rules WHERE id = ?', [id]);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('Admin rule detail error:', error);
    res.status(500).json({ success: false, message: 'Error fetching rule' });
  }
});

// Admin create user for teacher
app.post('/api/admin/teachers/:teacherId/create-user', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Check if teacher exists and get email
    const [teacher] = await db.query('SELECT email, nama FROM teachers WHERE id = ? AND status_aktif = 1', [teacherId]);
    if (!teacher || !teacher.email) {
      return res.status(400).json({ success: false, message: 'Teacher not found or no email' });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE username = ?', [teacher.email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Get tenant assignment
    const [assignment] = await db.query('SELECT tenant_id FROM teacher_assignments WHERE teacher_id = ? LIMIT 1', [teacherId]);
    const tenantId = assignment ? assignment.tenant_id : 'YPWI';

    // Create user account
    const hashedPassword = await bcrypt.hash('ypwi123', 10);
    await db.query(
      'INSERT INTO users (username, password, role, guru_id, tenant_id, is_profile_complete, is_default_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [teacher.email, hashedPassword, 'guru', teacherId, tenantId, 1, 1]
    );

    res.json({ success: true, message: 'User account created successfully' });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user account' });
  }
});

// Admin send WhatsApp bulk
app.post('/api/admin/send-whatsapp-bulk/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { message } = req.body;

    // Get all active teachers in tenant with WhatsApp numbers
    const teachers = await db.query(`
      SELECT t.id, t.nama, t.no_wa, t.jenis_kelamin
      FROM teachers t
      JOIN teacher_assignments ta ON t.id = ta.teacher_id
      WHERE ta.tenant_id = ? AND t.status_aktif = 1 AND t.no_wa IS NOT NULL AND t.no_wa != ''
    `, [tenantId]);

    let successCount = 0;
    let failCount = 0;

    for (const teacher of teachers) {
      try {
        const finalMessage = formatIslamicMessage(teacher.nama, teacher.jenis_kelamin, message);
        const result = await sendWhatsAppMessage(teacher.no_wa, finalMessage);
        if (result.success) successCount++;
        else failCount++;
      } catch (error) {
        console.error(`Failed to send to ${teacher.nama}:`, error);
        failCount++;
      }
    }

    res.json({
      success: true,
      message: `WhatsApp sent: ${successCount} success, ${failCount} failed`,
      data: { successCount, failCount }
    });
  } catch (error) {
    console.error('Admin bulk WhatsApp error:', error);
    res.status(500).json({ success: false, message: 'Error sending bulk WhatsApp' });
  }
});

// Admin send WhatsApp single
app.post('/api/admin/send-whatsapp-single/:teacherId', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { message } = req.body;

    const [teacher] = await db.query('SELECT nama, no_wa, jenis_kelamin FROM teachers WHERE id = ? AND status_aktif = 1', [teacherId]);
    if (!teacher || !teacher.no_wa) {
      return res.status(400).json({ success: false, message: 'Teacher not found or no WhatsApp number' });
    }

    const finalMessage = formatIslamicMessage(teacher.nama, teacher.jenis_kelamin, message);
    const result = await sendWhatsAppMessage(teacher.no_wa, finalMessage);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Admin single WhatsApp error:', error);
    res.status(500).json({ success: false, message: 'Error sending WhatsApp' });
  }
});

// Teacher management routes
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

app.put('/api/admin/teachers/:id', teacherUpload.single('foto'), async (req, res) => {
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

// Teacher info endpoint (for dashboard)
app.get('/api/teacher/info', authenticateToken, async (req, res) => {
  try {
    const teacherRows = await db.query(
      'SELECT id, nama, nik, no_wa, jenis_kelamin, status_aktif FROM teachers WHERE id = ? AND status_aktif = 1',
      [req.user.guru_id]
    );
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }
    const teacher = teacherRows[0];
    const assignmentRows = await db.query(
      'SELECT ta.tenant_id, ta.jabatan_di_unit, n.nama_sekolah FROM teacher_assignments ta JOIN tenants n ON ta.tenant_id = n.tenant_id WHERE ta.teacher_id = ?',
      [req.user.guru_id]
    );
    res.json({
      success: true,
      teacher: teacher,
      assignments: assignmentRows
    });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching teacher info' });
  }
});

// Haversine distance calculation function
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Unit location detection endpoint
app.get('/api/units/all', authenticateToken, async (req, res) => {
  try {
    const units = await db.query(
      'SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius FROM tenants WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    );

    res.json({
      success: true,
      units: units
    });
  } catch (error) {
    console.error('Error fetching all units:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch units' });
  }
});

app.get('/api/units/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Get ALL units with coordinates to find the nearest one
    const allUnits = await db.query(
      'SELECT tenant_id, nama_sekolah, latitude, longitude FROM tenants WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    );

    if (allUnits.length === 0) {
      return res.json({
        success: true,
        currentLocation: { lat: userLat, lng: userLng },
        units: [],
        nearestUnit: null
      });
    }

    // Calculate distances for all units
    const unitsWithDistance = allUnits.map(unit => ({
      tenant_id: unit.tenant_id,
      nama_sekolah: unit.nama_sekolah,
      latitude: unit.latitude,
      longitude: unit.longitude,
      location_radius: unit.location_radius,
      distance: calculateDistance(userLat, userLng, parseFloat(unit.latitude), parseFloat(unit.longitude)),
      isNearest: false
    }));

    // Sort by distance
    unitsWithDistance.sort((a, b) => a.distance - b.distance);

    // Mark actual nearest
    if (unitsWithDistance.length > 0) {
      unitsWithDistance[0].isNearest = true;
    }

    res.json({
      success: true,
      currentLocation: { lat: userLat, lng: userLng },
      units: unitsWithDistance,
      nearestUnit: unitsWithDistance.find(u => u.isNearest) || null
    });
  } catch (error) {
    console.error('Error fetching nearby units:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby units' });
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

// Get tenant by ID
app.get('/api/tenants/:id', authenticateToken, async (req, res) => {
  try {
    const [tenant] = await db.query('SELECT * FROM tenants WHERE tenant_id = ?', [req.params.id]);
    if (tenant) {
      res.json({ success: true, tenant: tenant });
    } else {
      res.status(404).json({ success: false, message: 'Tenant not found' });
    }
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenant' });
  }
});

// Get attendance history for teacher
app.get('/api/attendance-history', authenticateToken, async (req, res) => {
  try {
    const attendance = await db.query(
      'SELECT jenis, waktu_scan, status FROM attendance_logs WHERE teacher_id = ? ORDER BY waktu_scan DESC LIMIT 10',
      [req.user.guru_id]
    );
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching attendance history' });
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
      return res.status(400).json({ success: false, message: 'Penugasan ini sudah ada untuk guru ini' });
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

// [REST OF THE CODE WOULD CONTINUE HERE...]

// Placeholder for brevity - in real implementation, include all routes
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

async function startServer() {
  console.log('Starting server...');
  try {
    await db.initializeDatabase();
    console.log('Database initialized, starting server');

    // Insert sample data
    try {
      console.log('Inserting sample data...');
      // Insert sample tenant
      await db.query("INSERT IGNORE INTO tenants (tenant_id, nama_sekolah, absensi_method) VALUES ('SDIT', 'SDIT WAHDAH ISLAMIYAH', 'hp')");
      console.log('Sample tenant inserted');

      // Insert sample attendance rules for SDIT
      await db.query("INSERT IGNORE INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES ('SDIT', 'Datang', '06:00:00', '07:30:00', 'Waktu datang pagi SDIT', 'tepat_waktu')");
      await db.query("INSERT IGNORE INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES ('SDIT', 'Datang', '07:30:01', '08:00:00', 'Datang terlambat pagi SDIT', 'terlambat')");
      await db.query("INSERT IGNORE INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES ('SDIT', 'Pulang', '13:30:00', '15:00:00', 'Waktu pulang siang SDIT', 'tepat_waktu')");
      await db.query("INSERT IGNORE INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES ('SDIT', 'Pulang', '15:00:01', '16:00:00', 'Pulang terlambat SDIT', 'terlambat')");
      console.log('Sample attendance rules inserted');

      // Check existing data
      const existingTeachers = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
      const existingAssignments = await db.query('SELECT COUNT(*) as count FROM teacher_assignments');
      console.log(`Found ${existingTeachers[0].count} active teachers and ${existingAssignments[0].count} assignments in database`);

      console.log('Sample data inserted successfully');
    } catch (error) {
      console.log('Sample data insert failed:', error.message);
      console.log('Continuing without sample data...');
    }

  } catch (dbError) {
    console.log('Database connection failed:', dbError.message);
    console.log('Continuing without database...');
  }

  app.listen(PORT, () => {
    console.log('🚀 Server YPWI Lutim berjalan di http://localhost:' + PORT);
    console.log('🔐 Login endpoint: POST /api/login');
    console.log('📊 Dashboard endpoint: GET /api/dashboard (protected)');
  });
}

startServer().catch(err => {
  console.error('Server start failed:', err.message);
  process.exit(1);
});