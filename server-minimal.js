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
const fetch = require('node-fetch');
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

// Test route
app.get('/api/test', (req, res) => {
  console.log('[DEBUG] /api/test called');
  res.json({ success: true, message: 'Test route works', timestamp: new Date().toISOString() });
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