const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'ypwi-secret-key-2026';

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
      if (user && user.length !== undefined) {
        console.log(`[${timestamp}] 🔐 LOGIN_DEBUG | [2/3] Query returned ${user.length} record(s)`);
      } else if (user) {
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp API function
async function sendWhatsAppMessage(number, message) {
  try {
    const response = await fetch(process.env.WHATSAPP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: process.env.WHATSAPP_DEVICE_ID,
        number: number,
        message: message
      })
    });

    const result = await response.json();
    console.log('WhatsApp send result:', result);
    return result;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

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

    // Check profile completeness by validating teacher data
    let isProfileComplete = false;
    if (user.role === 'guru' && user.guru_id) {
      try {
        const teacher = await db.query('SELECT nama, nik, email, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, status_kepegawaian, tmt FROM teachers WHERE id = ? AND status_aktif = 1', [user.guru_id]);
        if (teacher.length > 0) {
          const t = teacher[0];
          isProfileComplete = !!(
            t.nama && t.nama.trim() &&
            t.nik && t.nik.trim() &&
            t.email && t.email.trim() &&
            t.tempat_lahir && t.tempat_lahir.trim() &&
            t.tanggal_lahir &&
            t.jenis_kelamin &&
            t.alamat && t.alamat.trim() &&
            t.no_wa && t.no_wa.trim() &&
            t.status_kepegawaian && t.status_kepegawaian.trim() &&
            t.tmt
          );
        }
      } catch (error) {
        console.error('Error checking profile completeness:', error);
      }
    } else {
      isProfileComplete = true; // Admins are always complete
    }

    const absensiMethod = requestTenantId === 'SDIT' ? 'hp' : 'scanner';

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
    const todayMasuk = await db.query('SELECT id FROM attendance_logs WHERE teacher_id = ? AND DATE(waktu_scan) = CURDATE() AND jenis = "masuk"', [req.user.guru_id]);
    const todayPulang = await db.query('SELECT id FROM attendance_logs WHERE teacher_id = ? AND DATE(waktu_scan) = CURDATE() AND jenis = "pulang"', [req.user.guru_id]);
    const hasMasuk = todayMasuk.length > 0;
    const hasPulang = todayPulang.length > 0;
    let absensiToday = 'Belum absen';
    if (hasMasuk && hasPulang) absensiToday = 'Hadir (Lengkap)';
    else if (hasMasuk) absensiToday = 'Masuk';
    else if (hasPulang) absensiToday = 'Pulang'; // unlikely, but possible
    // Get user info
    const userInfo = await db.query('SELECT is_default_password FROM users WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'Selamat datang di dashboard!',
      user: {
        ...req.user,
        is_default_password: userInfo[0]?.is_default_password || 0
      },
      data: {
        totalAbsensi: attendance[0]?.total || 0,
        absensiToday: absensiToday,
        hasMasuk: hasMasuk,
        hasPulang: hasPulang,
        status: 'Aktif'
      }
    });
  } catch (error) {
    logger.error(error, 'Dashboard route');
    res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'Semua field harus diisi.' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'Password baru dan konfirmasi tidak cocok.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
  }

  try {
    // Get current user password
    const user = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    // Verify old password
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(old_password, user[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Password lama salah.' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update password and set is_default_password = 0
    await db.query('UPDATE users SET password = ?, is_default_password = 0 WHERE id = ?', [hashedNewPassword, req.user.id]);

    res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error changing password' });
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

// Haversine distance calculation function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance in meters
}

app.get('/api/attendance-history', authenticateToken, async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT id, waktu_scan, jenis, status, metode FROM attendance_logs WHERE teacher_id = ? ORDER BY waktu_scan DESC LIMIT 10',
      [req.user.guru_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error(error, 'Attendance history route');
    res.status(500).json({ success: false, message: 'Error fetching attendance history' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { jenis, metode, latitude, longitude } = req.body;
    const currentTime = new Date().toTimeString().slice(0, 8);

    console.log('Attendance request:', { guru_id: req.user.guru_id, jenis, latitude, longitude });

    // Get all assigned tenants for the teacher
    const assignments = await db.query(
      'SELECT ta.tenant_id, t.latitude, t.longitude, t.location_radius FROM teacher_assignments ta JOIN tenants t ON ta.tenant_id = t.tenant_id WHERE ta.teacher_id = ?',
      [req.user.guru_id]
    );

    console.log('Assignments found:', assignments.length, assignments);

    let locationValid = false;
    let locationMessage = 'Lokasi tidak valid - tidak dalam radius sekolah manapun';
    let validTenantId = null;

    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      console.log('User location:', userLat, userLng);

      for (const assignment of assignments) {
        console.log('Checking assignment:', assignment);
        if (assignment.latitude && assignment.longitude) {
          const tenantLat = parseFloat(assignment.latitude);
          const tenantLng = parseFloat(assignment.longitude);
          const radius = assignment.location_radius || 100;
          const distance = calculateDistance(tenantLat, tenantLng, userLat, userLng);
          console.log('Distance check:', { tenantLat, tenantLng, radius, distance, valid: distance <= radius });

          if (distance <= radius) {
            locationValid = true;
            locationMessage = `Lokasi valid. Jarak: ${Math.round(distance)}m (maksimal ${radius}m)`;
            validTenantId = assignment.tenant_id;
            console.log('Location valid for tenant:', validTenantId);
            break;
          } else {
            console.log('Location invalid for tenant:', assignment.tenant_id);
          }
        } else {
          console.log('Assignment missing location:', assignment.tenant_id);
        }
      }
    } else {
      locationMessage = 'Lokasi tidak dapat dideteksi';
      console.log('No location provided');
    }

    console.log('Final location check:', { locationValid, locationMessage, validTenantId });

    if (!locationValid) {
      return res.status(400).json({
        success: false,
        message: locationMessage
      });
    }

    if (!locationValid) {
      return res.status(400).json({
        success: false,
        message: locationMessage
      });
    }

    // Check tenant-specific rules first for the valid tenant
    let rules = await db.query(
      'SELECT status_log FROM attendance_rules WHERE tenant_id = ? AND tipe = ? AND ? BETWEEN jam_mulai AND jam_selesai ORDER BY jam_mulai DESC LIMIT 1',
      [validTenantId, jenis, currentTime]
    );

    // If no tenant-specific rules, check default rules
    if (rules.length === 0) {
      rules = await db.query(
        'SELECT status_log FROM attendance_rules WHERE tenant_id = ? AND tipe = ? AND ? BETWEEN jam_mulai AND jam_selesai ORDER BY jam_mulai DESC LIMIT 1',
        ['DEFAULT', jenis, currentTime]
      );
    }

    const status = rules.length > 0 ? rules[0].status_log : 'terlambat';

    const result = await db.query(
      'INSERT INTO attendance_logs (teacher_id, tenant_id, waktu_scan, jenis, metode, status) VALUES (?, ?, NOW(), ?, ?, ?)',
      [req.user.guru_id, validTenantId, jenis, metode || 'scanner', status]
    );

    // Send WhatsApp notification
    try {
      const teacher = await db.query('SELECT nama, jenis_kelamin, no_wa FROM teachers WHERE id = ?', [req.user.guru_id]);
      if (teacher.length > 0 && teacher[0].no_wa) {
        const t = teacher[0];
        const panggilan = t.jenis_kelamin === 'L' ? 'Ustadz' : 'Ustadzah';
        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const message = `Assalamu'alaikum ${panggilan} ${t.nama},

✅ *Absensi ${jenis === 'masuk' ? 'Masuk' : 'Pulang'} Berhasil*

📅 Waktu: ${waktu}
📍 Lokasi: Valid
🏫 Status: ${status === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat'}

_Barokallohu fiikum_ 🙏
*Sistem Absensi YPWI*`;

        await sendWhatsAppMessage(teacher[0].no_wa, message);
      }
    } catch (error) {
      console.error('WhatsApp attendance notification failed:', error);
    }

    res.json({
      success: true,
      message: 'Absensi berhasil dicatat',
      data: { id: result.insertId, status, locationMessage }
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

app.get('/api/admin/teachers', async (req, res) => {
  // Authentication bypassed for development - public access

  try {
    const rows = await db.query(`
      SELECT t.id, t.nama, t.nik, t.nip, t.email, t.status_aktif,
             CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END as has_user
      FROM teachers t
      LEFT JOIN users u ON t.email = u.username AND u.role = 'guru'
      WHERE t.status_aktif = 1 ORDER BY t.nama ASC
    `);
    console.log(`[API] /api/admin/teachers - Returning ${rows.length} teachers`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
});

app.get('/api/admin/tenants', async (req, res) => {
  // Authentication bypassed for development - public access

  try {
    const rows = await db.query('SELECT tenant_id, nama_sekolah FROM tenants ORDER BY nama_sekolah ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenants' });
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

  try {
    const result = await db.query(
      'INSERT INTO teachers (nama, nik, nip, sebagai, email, status_aktif) VALUES (?, ?, ?, ?, ?, 1)',
      [nama, nik, nip_val, sebagai, email]
    );
    res.json({ success: true, message: 'Guru berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error adding teacher' });
  }
});

app.put('/api/admin/teachers/:id', async (req, res) => {
  // Authentication bypassed for development - public access

  const { id } = req.params;
  console.log('PUT teacher req.body:', req.body);
  const {
    nama = '', nik = '', tempat_lahir = '', tanggal_lahir = '', jenis_kelamin = '', alamat = '', no_wa = '', email = '',
    status_kepegawaian = '', tmt = '', nip = '', scan_id = '', link_foto = ''
  } = req.body;

  // Convert empty strings to null
  const toNull = (val) => val === '' ? null : val;

  if (!nama || !nik) {
    return res.status(400).json({ success: false, message: 'Nama dan NIK wajib diisi.' });
  }

  try {
    await db.query(
      `UPDATE teachers SET
        nama = ?, nik = ?, tempat_lahir = ?, tanggal_lahir = ?, jenis_kelamin = ?,
        alamat = ?, no_wa = ?, email = ?, status_kepegawaian = ?,
        tmt = ?, nip = ?, scan_id = ?, link_foto = ?, updated_at = NOW()
      WHERE id = ?`,
      [nama, nik, toNull(tempat_lahir), toNull(tanggal_lahir), toNull(jenis_kelamin), toNull(alamat), toNull(no_wa), email,
       toNull(status_kepegawaian), toNull(tmt), toNull(nip), toNull(scan_id), toNull(link_foto), id]
    );

    // Check profile completeness
    const updatedTeacher = await db.query('SELECT nama, nik, email, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, status_kepegawaian, tmt FROM teachers WHERE id = ?', [id]);
    const t = updatedTeacher[0];
    const isProfileComplete = !!(
      t.nama && t.nama.trim() &&
      t.nik && t.nik.trim() &&
      t.email && t.email.trim() &&
      t.tempat_lahir && t.tempat_lahir.trim() &&
      t.tanggal_lahir &&
      t.jenis_kelamin &&
      t.alamat && t.alamat.trim() &&
      t.no_wa && t.no_wa.trim() &&
      t.status_kepegawaian && t.status_kepegawaian.trim() &&
      t.tmt
    );

    // Send WhatsApp notification for profile completion
    if (isProfileComplete && t.no_wa) {
      const panggilan = t.jenis_kelamin === 'L' ? 'Ustadz' : 'Ustadzah';
      const domain = req.headers.host || 'localhost:3000';
      const loginUrl = `http://${domain}/login`;

      const motivasiMessages = {
        'L': [
          'Semoga Allah SWT senantiasa memberikan kekuatan dan kesabaran dalam menjalankan tugas sebagai pendidik.',
          'Sebagai ustadz, jadilah teladan yang baik bagi para santri. Tetap semangat dan berkah dalam setiap langkah.',
          'Alhamdulillah, profil Anda telah lengkap. Mari kita bersama-sama membangun generasi yang beriman dan berilmu.'
        ],
        'P': [
          'Semoga Allah SWT memberikan kelembutan dan kebijaksanaan dalam mendidik para santri tercinta.',
          'Sebagai ustadzah, jadilah ibu yang penuh kasih sayang. Teruslah berjuang untuk kebaikan umat.',
          'Alhamdulillah, profil Anda telah lengkap. Mari kita bersama-sama menjaga amanah sebagai pendidik.'
        ]
      };

      const motivasi = motivasiMessages[t.jenis_kelamin] || motivasiMessages['L'];
      const randomMotivasi = motivasi[Math.floor(Math.random() * motivasi.length)];

      const message = `🌟 *Assalamu'alaikum ${panggilan} ${t.nama}* 🌟

✨ *Alhamdulillah!* Profil Anda telah *lengkap* ✨

${randomMotivasi}

📋 *Informasi Login:*
👤 *User:* ${t.email}
🔑 *Password:* ypwi123
🔗 *URL Login:* ${loginUrl}

💡 *Tips:* Simpan informasi login ini dengan baik dan jaga kerahasiaannya.

_Barokallohu fiikum_ 🙏
*Sistem Absensi YPWI - ${new Date().getFullYear()}* 📚`;

      await sendWhatsAppMessage(t.no_wa, message);
    }

    // Check if user account exists, create if not
    if (email) {
      const existingUser = await db.query('SELECT id FROM users WHERE username = ?', [email]);
      if (existingUser.length === 0) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('ypwi123', 10);

        // Get first assignment for tenant_id
        const assignmentRows = await db.query('SELECT tenant_id FROM teacher_assignments WHERE teacher_id = ? LIMIT 1', [id]);
        const tenantId = assignmentRows.length > 0 ? assignmentRows[0].tenant_id : 'YPWI';

        await db.query(
          'INSERT INTO users (username, password, role, guru_id, tenant_id, is_profile_complete, is_default_password) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [email, hashedPassword, 'guru', id, tenantId, isProfileComplete ? 1 : 0]
        );
        console.log('User account created for teacher:', id, email, 'complete:', isProfileComplete);
      } else {
        // Update existing user's profile complete status
        await db.query('UPDATE users SET is_profile_complete = ? WHERE username = ?', [isProfileComplete ? 1 : 0, email]);
      }
    }

    res.json({ success: true, message: 'Guru berhasil diupdate' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error updating teacher' });
  }
});

// Add assignment
app.post('/api/admin/teachers/:id/assignments', async (req, res) => {
  const { id } = req.params;
  const { tenant_id, jabatan_di_unit } = req.body;

  if (!tenant_id || !jabatan_di_unit) {
    return res.status(400).json({ success: false, message: 'Tenant ID dan Jabatan wajib diisi.' });
  }

  try {
    await db.query(
      'INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)',
      [id, tenant_id, jabatan_di_unit]
    );
    res.json({ success: true, message: 'Assignment berhasil ditambahkan' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error adding assignment' });
  }
});

// Delete assignment
app.delete('/api/admin/teachers/:id/assignments', async (req, res) => {
  const { id } = req.params;
  const { tenant_id, jabatan_di_unit } = req.body;

  try {
    await db.query(
      'DELETE FROM teacher_assignments WHERE teacher_id = ? AND tenant_id = ? AND jabatan_di_unit = ?',
      [id, tenant_id, jabatan_di_unit]
    );
    res.json({ success: true, message: 'Assignment berhasil dihapus' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
});

// Create user for teacher
app.post('/api/admin/teachers/:id/create-user', async (req, res) => {
  const { id } = req.params;

  try {
    // Get teacher data
    const teacherRows = await db.query('SELECT email, nama FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    const teacher = teacherRows[0];
    if (!teacher.email) {
      return res.status(400).json({ success: false, message: 'Guru tidak memiliki email' });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE username = ?', [teacher.email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User account sudah ada' });
    }

    // Hash default password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('ypwi123', 10);

    // Get first assignment for tenant_id
    const assignmentRows = await db.query('SELECT tenant_id FROM teacher_assignments WHERE teacher_id = ? LIMIT 1', [id]);
    const tenantId = assignmentRows.length > 0 ? assignmentRows[0].tenant_id : 'YPWI';

    await db.query(
      'INSERT INTO users (username, password, role, guru_id, tenant_id, is_profile_complete) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, 'guru', id, tenantId, isProfileComplete ? 1 : 0]
    );
    console.log('User account created for teacher:', id, email, 'complete:', isProfileComplete);
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

app.get('/api/teacher/info', authenticateToken, async (req, res) => {
  if (req.user.role !== 'guru') {
    return res.status(403).json({ success: false, message: 'Akses ditolak' });
  }

  try {
    // Get teacher data
    const teacherRows = await db.query('SELECT nama, email FROM teachers WHERE id = ? AND status_aktif = 1', [req.user.guru_id]);
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data guru tidak ditemukan' });
    }

    // Get assignments with school names
    const assignmentRows = await db.query(
      'SELECT ta.tenant_id, ta.jabatan_di_unit, t.nama_sekolah FROM teacher_assignments ta LEFT JOIN tenants t ON ta.tenant_id = t.tenant_id WHERE ta.teacher_id = ?',
      [req.user.guru_id]
    );

    res.json({
      success: true,
      teacher: teacherRows[0],
      assignments: assignmentRows
    });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching teacher info' });
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

app.get('/api/admin/teachers/:id', async (req, res) => {
  // Authentication bypassed for development - public access

  const { id } = req.params;

  try {
    console.log('Fetching teacher with ID:', id);
    const teacherRows = await db.query('SELECT id, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, email, status_kepegawaian, tmt, nip, scan_id, link_foto, status_aktif FROM teachers WHERE id = ? AND status_aktif = 1', [id]);
    console.log('Teacher rows found:', teacherRows.length);

    if (teacherRows.length === 0) {
      console.log('No teacher found with ID:', id);
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    const teacher = teacherRows[0];
    console.log('Teacher data:', teacher);

    // Get assignments
    const assignmentRows = await db.query('SELECT tenant_id, jabatan_di_unit FROM teacher_assignments WHERE teacher_id = ?', [id]);
    console.log('Assignments found:', assignmentRows.length);

    teacher.assignments = assignmentRows;

    res.json({ success: true, data: teacher });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching teacher' });
  }
});

app.get('/api/admin/rules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const rows = await db.query('SELECT * FROM attendance_rules ORDER BY tipe, jam_mulai');
    console.log(`[API] /api/admin/rules - Returning ${rows.length} rules`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching rules' });
  }
});

app.post('/api/admin/rules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  const { tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log } = req.body;

  if (!tenant_id || !tipe || !jam_mulai || !jam_selesai || !status_log) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES (?, ?, ?, ?, ?, ?)',
      [tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log]
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
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
  }

  try {
    await db.query(
      'UPDATE attendance_rules SET tenant_id = ?, tipe = ?, jam_mulai = ?, jam_selesai = ?, keterangan = ?, status_log = ?, updated_at = NOW() WHERE id = ?',
      [tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log, id]
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

app.get('/api/admin/attendance-logs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const rows = await db.query(`
      SELECT al.*, t.nama as nama_guru, t.nip
      FROM attendance_logs al
      LEFT JOIN teachers t ON al.teacher_id = t.id
      ORDER BY al.waktu_scan DESC LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching attendance logs' });
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
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching rule' });
  }
});

app.get('/api/admin/tenants', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

  try {
    const rows = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants ORDER BY nama_sekolah');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenants' });
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
      'UPDATE tenants SET latitude = ?, longitude = ?, location_radius = ?, location_name = ?, updated_at = NOW() WHERE tenant_id = ?',
      [latitude, longitude, location_radius, location_name, tenantId]
    );
    res.json({ success: true, message: 'Lokasi tenant berhasil diupdate' });
  } catch (error) {
    console.error('[SERVER ERROR]', error.message);
    res.status(500).json({ success: false, message: 'Error updating tenant location' });
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

db.initializeDatabase().then(() => {
// Temporary route to add sample data
app.get('/api/sample-data', async (req, res) => {
  try {
    const count = await db.query('SELECT COUNT(*) as count FROM teachers');
    if (count[0].count === 0) {
      const result = await db.query(`
        INSERT INTO teachers (nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, email, sebagai, status_kepegawaian, tmt, nip, keterangan, status_aktif)
        VALUES ('Guru Sample', '1234567890123456', 'Jakarta', '1990-01-01', 'L', 'Jl. Sample No. 1', '081234567890', 'guru@sample.com', 'Guru', 'PNS', '2020-01-01', '1987654321', 'Guru yang berdedikasi', 1)
      `);
      const teacherId = result.insertId;
      await db.query('INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)', [teacherId, 'SDIT', 'Guru Mapel']);
      res.json({ success: true, message: 'Sample data inserted', teacherId });
    } else {
      res.json({ success: true, message: 'Data already exists' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error' });
  }
});

app.listen(PORT, () => {
  console.log('Server YPWI Absensi berjalan di http://localhost:' + PORT);
  console.log('Login endpoint: POST /api/login');
  console.log('Dashboard endpoint: GET /api/dashboard (protected)');
});
}).catch(err => {
  logger.error(err, 'Database initialization');
  process.exit(1);
});