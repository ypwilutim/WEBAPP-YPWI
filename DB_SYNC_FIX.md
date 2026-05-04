# Sinkronisasi Kolom Database - Perbaikan Query Admin

## Perubahan Backend (server.js)

### 1. Route GET /api/admin/summary
✅ **Perbaiki query penghitungan total** 
- Menggunakan alias yang jelas: `SELECT COUNT(*) as total FROM teachers`
- Diakses dengan benar: `total[0].total`

✅ **Tambahkan blok try-catch independen** untuk setiap statistik:
- totalTeachers: `SELECT COUNT(*) as total FROM teachers`
- incompleteProfiles: `SELECT COUNT(*) as total FROM users WHERE role = "guru" AND is_profile_complete = 0`
- activeToday: `SELECT COUNT(DISTINCT teacher_id) as total FROM attendance_logs WHERE tenant_id = ? AND DATE(waktu_scan) = CURDATE()`
- lateTeachers: `SELECT COUNT(DISTINCT al.teacher_id) as total FROM attendance_logs al WHERE al.tenant_id = ? AND DATE(al.waktu_scan) = CURDATE() AND al.status = 'terlambat'`

Jika satu query gagal, statistik lain tetap terkirim (bukan 500 error).

### 2. Route GET /api/admin/teachers
✅ **Gunakan tabel teachers (bukan users)**
```sql
SELECT 
  id, 
  nama, 
  nip, 
  email, 
  status_aktif as is_active,
  COALESCE(sebagai, "-") as jabatan 
FROM teachers 
ORDER BY nama ASC
```

Kolom mencakup: id, nama, nip, email, is_active, jabatan
- `nama` bukan `name` (sesuai struktur tabel teachers)
- `status_aktif` di-alias sebagai `is_active`
- `sebagai` (kolom teachers) dijadikan jabatan, default "-" jika null

✅ **Logger** digunakan untuk mencetak hasil query:
```javascript
logger.loginDebug.queryResult(teachers);
```

## Perubahan Frontend (admin-dashboard.html)

### Tabel Detail Guru
Kolom yang ditampilkan:
- Nama (t.nama)
- NIP (t.nip)
- Email (t.email)
- Jabatan (t.jabatan)
- Status: Aktif/Nonaktif (t.is_active)
- Aksi: Tombol Hapus (soft delete)

### Tabel Preview (Dashboard)
Menampilkan 5 guru terakhir dengan kolom yang sama.

## Verifikasi Database

Struktur tabel `teachers` (dari ypwi_absensi.sql):
- `id` INT PRIMARY KEY AUTO_INCREMENT
- `nama` VARCHAR(100) NOT NULL ✅
- `nip` VARCHAR(50) ✅
- `email` VARCHAR(100) ✅
- `status_aktif` TINYINT(1) DEFAULT 1 ✅
- `sebagai` VARCHAR(50) ✅ (jabatan)

Query menggunakan kolom yang benar sesuai database.

## Logger

Gunakan `logger.loginDebug.queryResult()` untuk mencetak hasil query:
- Array: mencetak jumlah record
- Object: mencetak detail object
- Null: mencetak "No records found"

## Error Handling

### Backend
- Query independen dengan try-catch masing-masing
- Jika query gagal: `logger.error(err, 'Summary query: <nama>')`
- Response tetap 200 dengan data yang berhasil diambil

### Frontend
- Token check sebelum fetch
- Auto-redirect ke login jika token tidak ada
- SweetAlert untuk konfirmasi hapus

## Testing

1. Login sebagai admin
2. Dashboard menampilkan:
   - Total Guru (dari tabel teachers)
   - Absensi Hari Ini (dari attendance_logs)
   - Terlambat (dari attendance_logs)
   - Profil Lengkap (dari users)
3. Klik "Manajemen Guru" → Tabel dengan data:
   - Nama, NIP, Email, Jabatan, Status, Aksi
   - Data real dari tabel teachers
4. Tombol "Hapus" → soft delete (status_aktif = 0)

## Catatan

- Route `/api/admin/teachers` sekarang menggunakan **tabel teachers** (bukan JOIN users)
- Field `username` tidak lagi digunakan di tabel teachers (diganti email)
- Field `role` sudah pasti "guru" untuk semua record di tabel teachers
- `is_profile_complete` tetap diambil dari tabel users (untuk ringkasan)
