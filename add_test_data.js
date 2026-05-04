const mysql = require('mysql2/promise');

async function addTestData() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ypwi_absensi',
    waitForConnections: true,
    connectionLimit: 10
  });

  const conn = await pool.getConnection();
  
  try {
    // Add teachers
    const teachers = [
      ['Budi Santoso', '1234567890', 'Makassar', '1985-03-15', 'L', 'Jl. Sudirman No. 10', '081234567890', 'budi.santoso@email.com', 'Guru Kelas', 'PNS', '2020-01-15', '19851234567890', 1],
      ['Siti Aminah', '2345678901', 'Palopo', '1990-07-22', 'P', 'Jl. Ahmad Yani No. 25', '081345678901', 'siti.aminah@email.com', 'Guru Mapel', 'PNS', '2019-08-01', '19902345678901', 1],
      ['Rudi Hartono', '3456789012', 'Palopo', '1988-11-30', 'L', 'Jl. Pattimura No. 8', '081456789012', 'rudi.hartono@email.com', 'Guru Kelas', 'GTY', '2021-02-01', '19883456789012', 1],
      ['Dewi Lestari', '4567890123', 'Makassar', '1992-05-18', 'P', 'Jl. Jend. Sudirman No. 45', '081567890123', 'dewi.lestari@email.com', 'Guru Mapel', 'PNS', '2018-07-15', '19924567890123', 1],
      ['Agus Wijaya', '5678901234', 'Palopo', '1987-09-10', 'L', 'Jl. Veteran No. 12', '081678901234', 'agus.wijaya@email.com', 'Kepala Sekolah', 'PNS', '2017-01-01', '19875678901234', 1]
    ];

    for (const t of teachers) {
      const [existing] = await conn.query('SELECT id FROM teachers WHERE nik = ?', [t[1]]);
      if (existing.length === 0) {
        await conn.query(
          'INSERT INTO teachers (nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, email, sebagai, status_kepegawaian, tmt, nip, status_aktif) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
          t
        );
        console.log(`✅ Added teacher: ${t[0]}`);
      } else {
        console.log(`⏭️  Teacher exists: ${t[0]}`);
      }
    }

    // Add attendance rules
    const rules = [
      ['TKITWI01', 'Datang', '06:00:00', '07:30:00', 'Waktu datang pagi TKIT WI 01', 'tepat_waktu'],
      ['TKITWI01', 'Datang', '07:30:01', '08:00:00', 'Datang terlambat pagi TKIT WI 01', 'terlambat'],
      ['TKITWI01', 'Pulang', '14:00:00', '15:30:00', 'Waktu pulang siang TKIT WI 01', 'tepat_waktu'],
      ['TKITWI01', 'Pulang', '15:30:01', '16:00:00', 'Pulang terlambat TKIT WI 01', 'terlambat'],
      ['TKITWI02', 'Datang', '06:00:00', '07:30:00', 'Waktu datang pagi TKIT WI 02', 'tepat_waktu'],
      ['TKITWI02', 'Datang', '07:30:01', '08:00:00', 'Datang terlambat pagi TKIT WI 02', 'terlambat'],
      ['TKITWI02', 'Pulang', '14:00:00', '15:30:00', 'Waktu pulang siang TKIT WI 02', 'tepat_waktu'],
      ['TKITWI02', 'Pulang', '15:30:01', '16:00:00', 'Pulang terlambat TKIT WI 02', 'terlambat'],
      ['SMPITWI01', 'Datang', '06:30:00', '07:30:00', 'Waktu datang pagi SMPIT WI 01', 'tepat_waktu'],
      ['SMPITWI01', 'Datang', '07:30:01', '08:00:00', 'Datang terlambat pagi SMPIT WI 01', 'terlambat'],
      ['SMPITWI01', 'Pulang', '14:30:00', '15:30:00', 'Waktu pulang siang SMPIT WI 01', 'tepat_waktu'],
      ['SMPITWI01', 'Pulang', '15:30:01', '16:00:00', 'Pulang terlambat SMPIT WI 01', 'terlambat'],
      ['SDITIR', 'Datang', '06:00:00', '07:00:00', 'Waktu datang pagi SDIT IR', 'tepat_waktu'],
      ['SDITIR', 'Datang', '07:00:01', '07:30:00', 'Datang terlambat pagi SDIT IR', 'terlambat'],
      ['SDITIR', 'Pulang', '13:30:00', '14:30:00', 'Waktu pulang siang SDIT IR', 'tepat_waktu'],
      ['SDITIR', 'Pulang', '14:30:01', '15:00:00', 'Pulang terlambat SDIT IR', 'terlambat']
    ];

    for (const r of rules) {
      const [existing] = await conn.query('SELECT id FROM attendance_rules WHERE tenant_id = ? AND tipe = ? AND jam_mulai = ?', [r[0], r[1], r[2]]);
      if (existing.length === 0) {
        await conn.query(
          'INSERT INTO attendance_rules (tenant_id, tipe, jam_mulai, jam_selesai, keterangan, status_log) VALUES (?,?,?,?,?,?)',
          r
        );
        console.log(`✅ Added rule: ${r[0]} - ${r[1]} - ${r[2]}`);
      } else {
        console.log(`⏭️  Rule exists: ${r[0]} - ${r[1]} - ${r[2]}`);
      }
    }

    const [teacherCount] = await conn.query('SELECT COUNT(*) as c FROM teachers WHERE status_aktif = 1');
    const [ruleCount] = await conn.query('SELECT COUNT(*) as c FROM attendance_rules');
    console.log('\n=== Summary ===');
    console.log(`Total active teachers: ${teacherCount[0].c}`);
    console.log(`Total attendance rules: ${ruleCount[0].c}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

addTestData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});