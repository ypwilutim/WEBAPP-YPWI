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
- Notifikasi WhatsApp otomatis setelah absensi & update profil

## Default Akun
- Admin: username=admin, password=admin123
- Guru: username=guru1, password=guru123 (profil belum lengkap)

## Menjalankan Server
```bash
node server.js
```
Server berjalan di http://localhost:3000

## ⚠️ Catatan Development
- **Tailwind CSS**: Sistem menggunakan CDN Tailwind untuk development. Untuk production, install sebagai PostCSS plugin atau use the Tailwind CLI
- **PowerShell**: Gunakan `node.exe` untuk menjalankan Node.js di Windows PowerShell
- **Environment**: Pastikan file `.env` ada di root directory dengan semua variabel yang diperlukan

## 📍 Fitur Deteksi Lokasi Unit

Dashboard dapat mendeteksi unit sekolah terdekat berdasarkan koordinat GPS user:

### Cara Kerja
1. User memberikan izin akses lokasi
2. Sistem mendapatkan koordinat GPS (latitude, longitude)
3. API `/api/units/nearby` menghitung jarak ke unit-unit yang ditugaskan ke user
4. Unit terdekat ditampilkan di UI dashboard

### Implementasi
- Menggunakan `navigator.geolocation` API
- Endpoint `/api/units/nearby` dengan parameter `lat` dan `lng`
- Menghitung jarak berdasarkan unit yang ditugaskan ke guru
- UI menampilkan nama unit terdekat dan jaraknya

## ⚠️ Konfigurasi WhatsApp (Whacenter)

Sistem menggunakan **Whacenter API** untuk mengirim notifikasi WhatsApp otomatis.

### Environment Variables (.env)
```env
WHATSAPP_ENDPOINT=https://app.whacenter.id/api/send
WHATSAPP_DEVICE_ID=<device_id_anda>
```

### Format Nomor WhatsApp
- Nomor harus diawali dengan kode negara Indonesia **62** (contoh: 6281234567890)
- Format 08xxx akan dikonversi otomatis menjadi 628xxx

### Troubleshooting WhatsApp

#### Error: "fetch failed" / "Network Timeout"
**Penyebab**: Server tidak dapat terhubung ke `app.whacenter.id` (network timeout)

**Solusi**:
1. Periksa koneksi internet server
2. Pastikan `app.whacenter.id` dapat diakses dari server
3. Cek firewall/proxy yang mungkin memblokir koneksi outbound
4. Test koneksi: `curl https://app.whacenter.id/api/send`

**Catatan**: Jika WhatsApp gagal, absensi **tetap tercatat** di database (non-blocking)

#### Error: "WHATSAPP_DEVICE_ID tidak ditemukan"
**Solusi**:
1. Pastikan file `.env` ada di root directory
2. Pastikan variabel `WHATSAPP_DEVICE_ID` terisi
3. Restart server setelah mengubah `.env`

#### Error: "fetch is not a function"
**Penyebab**: Menggunakan Node.js < 18 atau ada `require('node-fetch')` yang konflik

**Solusi**:
1. Upgrade ke Node.js 18+ (sudah memiliki native `fetch`)
2. Pastikan TIDAK ada `const fetch = require('node-fetch')` di `server.js`
3. Test fetch: `node -e "console.log(typeof fetch)"` (harus output: `function`)

### Logging
Sistem mencatat setiap pengiriman di console:
- `[WHATSAPP]` - Status pengiriman
- `[WHATSAPP NOTIFICATION]` - Log notifikasi
- `[WHATSAPP ATTENDANCE ERROR]` - Error saat absensi
- `[WHATSAPP NOTIFICATION ERROR]` - Error endpoint publik

### Catatan Penting
- WhatsApp notification **non-blocking** - tidak memblokir proses absensi
- Jika WhatsApp gagal, absensi **tetap tercatat** di database
- Endpoint `/api/attendance` selalu return success meski WhatsApp gagal

## API Endpoint

### Public
- `POST /api/auth/login` - Login authentication
- `POST /api/send-whatsapp-public` - Kirim WhatsApp (profile completion)
- `PUT /api/profile-complete/:teacherId` - Update profil (no auth)
- `GET /api/tenants` - Daftar unit sekolah

### Protected (JWT Required)
- `POST /api/attendance` - Absensi masuk/keluar
- `GET /api/dashboard` - Dashboard & summary
- `GET /api/teacher/info` - Info profil guru
- `GET /api/units/nearby` - Deteksi unit terdekat berdasarkan lokasi GPS
- `POST /api/change-password` - Ganti password

## Struktur Database
- `teachers` - Data guru
- `users` - Akun login (terkait dengan guru via `guru_id`)
- `attendance_logs` - Log absensi
- `teacher_assignments` - Penugasan guru ke unit sekolah
- `tenants` - Data unit sekolah

## ⚠️ Konfigurasi WhatsApp (Whacenter)

Sistem menggunakan **Whacenter API** untuk mengirim notifikasi WhatsApp otomatis setelah absensi. Pastikan konfigurasi berikut sudah benar:

### Environment Variables (.env)
```env
WHATSAPP_ENDPOINT=https://app.whacenter.id/api/send
WHATSAPP_DEVICE_ID=<device_id_anda>
```

### Endpoint API
- `POST /api/send-whatsapp-public` - Mengirim pesan WhatsApp publik
- `POST /api/attendance` - Absensi (otomatis kirim WhatsApp setelah berhasil)

### Format Nomor WhatsApp
- Nomor harus diawali dengan kode negara Indonesia **62** (contoh: 6281234567890)
- Format 08xxx akan dikonversi otomatis menjadi 628xxx

### Format Pesan WhatsApp
Pesan yang dikirim menggunakan template dengan etika Islami:
```
Assalamu'alaikum Ustadz/Ustadzah [Nama]

[Isi Pesan Absensi]

[Doa]

[Motivasi]

Barakallahu fiikum,
*YPWI Lutim*
```

### Troubleshooting

**Error: "fetch is not a function"**
- Pastikan menggunakan Node.js v18+ (fitur `fetch` native)
- Jangan gunakan `require('node-fetch')` - Node.js modern sudah memiliki `fetch` built-in
- Hapus baris `const fetch = require('node-fetch')` jika ada

**Error: "WHATSAPP_DEVICE_ID tidak ditemukan"**
- Pastikan file `.env` sudah dibuat di root directory
- Pastikan `WHATSAPP_DEVICE_ID` sudah diisi dengan benar
- Restart server setelah mengubah file `.env`

**Error: "Failed to send message"**
- Periksa koneksi internet
- Pastikan `WHATSAPP_ENDPOINT` benar (https://app.whacenter.id/api/send)
- Pastikan `WHATSAPP_DEVICE_ID` valid dan device Whacenter sedang aktif
- Cek dashboard Whacenter untuk status pengiriman

**Pesan tidak terkirim ke nomor tertentu**
- Pastikan nomor sudah disimpan di kontak WhatsApp device
- Pastikan format nomor benar (628xxx tanpa spasi/simbol)
- Periksa apakah nomor valid dan aktif di WhatsApp

### Testing
Jalankan script test untuk memverifikasi koneksi:
```bash
node test-whatsapp.js
```

### Logging
Sistem akan mencatat setiap pengiriman WhatsApp di console:
- `[WHATSAPP]` - Status pengiriman
- `[WHATSAPP NOTIFICATION]` - Log notifikasi
- `[WHATSAPP ERROR]` - Log error jika terjadi

### Catatan Penting
- WhatsApp notification tidak memblokir proses absensi (non-blocking)
- Jika WhatsApp gagal, absensi tetap tercatat di database
- Sistem menggunakan format `URLSearchParams` untuk POST request
- Content-Type: `application/x-www-form-urlencoded`
