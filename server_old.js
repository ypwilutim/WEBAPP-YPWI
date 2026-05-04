const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'ypwi-secret-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const users = [
  {
    id: 1,
    username: 'admin',
    password: '',
    role: 'admin',
    guru_id: 1,
    tenant_id: 'SDIT',
    is_profile_complete: 1
  },
  {
    id: 2,
    username: 'guru1',
    password: '',
    role: 'guru',
    guru_id: 2,
    tenant_id: 'SDIT',
    is_profile_complete: 0
  }
];

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

hashPassword('admin123').then(hashed => {
  users[0].password = hashed;
}).catch(err => console.error('Error hashing password:', err));

hashPassword('guru123').then(hashed => {
  users[1].password = hashed;
}).catch(err => console.error('Error hashing password:', err));

const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
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

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const requestTenantId = validateTenant(req);

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username dan password wajib diisi.'
      });
    }

    const user = findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    if (user.tenant_id !== requestTenantId) {
      return res.status(403).json({ 
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses subdomain ini.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

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
        message: 'Profil belum lengkap. Silakan lengkapi profil Anda.'
      });
    }

    return res.json({ 
      success: true,
      redirect: 'dashboard.html',
      token: token,
      user: {
        username: user.username,
        role: user.role,
        tenant_id: user.tenant_id
      },
      message: 'Login berhasil!'
    });

  } catch (error) {
    console.error('Error login:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan pada server.'
    });
  }
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    message: 'Selamat datang di dashboard!',
    user: req.user,
    data: {
      totalAbsensi: 0,
      absensiToday: 'Belum absen',
      status: 'Aktif'
    }
  });
});

app.post('/api/logout', (req, res) => {
  res.json({ 
    success: true,
    message: 'Logout berhasil.'
  });
});

app.get('/api/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  }

  res.json({ 
    success: true,
    profile: {
      id: user.id,
      username: user.username,
      role: user.role,
      guru_id: user.guru_id,
      tenant_id: user.tenant_id,
      is_profile_complete: user.is_profile_complete
    }
  });
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const { guru_id } = req.user;
  const user = users.find(u => u.id === guru_id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  }

  user.is_profile_complete = 1;

  res.json({ 
    success: true,
    message: 'Profil berhasil diperbarui!',
    profile: {
      is_profile_complete: user.is_profile_complete
    }
  });
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

const PORT_ENV = process.env.PORT || 3000;
app.listen(PORT_ENV, () => {
  console.log('Server YPWI Absensi berjalan di http://localhost:' + PORT_ENV);
  console.log('Login endpoint: POST /api/login');
  console.log('Dashboard endpoint: GET /api/dashboard (protected)');

module.exports = { app, authenticateToken };
