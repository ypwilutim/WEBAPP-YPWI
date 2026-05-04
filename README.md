# YPWI Absensi - Sistem Login & Absensi Digital

## Deskripsi
Sistem autentikasi dan absensi digital untuk Yayasan Pendidikan YPWI dengan fitur login JWT, manajemen profil, dan pencatatan absensi real-time.

## Fitur Utama
- Autentikasi dengan JWT token
- Password hashing dengan Bcrypt
- Middleware proteksi rute (authenticateToken)
- Manajemen profil (is_profile_complete)
- Sistem absensi masuk/keluar
- Validasi multi-tenant/subdomain

## Default Akun
- Admin: username=admin, password=admin123
- Guru: username=guru1, password=guru123 (profil belum lengkap)

## Menjalankan Server
node server.js
Server berjalan di http://localhost:3000
