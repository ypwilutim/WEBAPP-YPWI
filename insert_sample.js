const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function insertSampleData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ypwi_absensi'
  });

  const hashedPw = await bcrypt.hash('ypwi123', 10);

  try {
    // Insert tenant
    await conn.query('INSERT IGNORE INTO tenants (tenant_id, nama_sekolah) VALUES (?, ?)', ['TEST01', 'Sekolah Test']);

    // Insert teacher with complete data (100% complete)
    await conn.query(`INSERT INTO teachers (nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, email, status_kepegawaian, tmt, scan_id, link_foto) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    ['Guru Test Lengkap', '123456789', 'Jakarta', '1990-01-01', 'L', 'Alamat Test', '08123456789', 'test@example.com', 'PNS', '2020-01-01', 'SCAN123', 'http://example.com/foto.jpg']);

    const [res] = await conn.query('SELECT LAST_INSERT_ID() as id');
    const teacherId = res[0].id;

    // Insert assignment
    await conn.query('INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)', [teacherId, 'TEST01', 'Guru']);

    // Insert admin user
    await conn.query('INSERT INTO users (username, password, role, tenant_id, is_profile_complete) VALUES (?, ?, ?, ?, ?)', ['admin', hashedPw, 'admin', 'TEST01', 1]);

    // Insert incomplete teacher (0% complete)
    await conn.query(`INSERT INTO teachers (nama) VALUES (?)`, ['Guru Test Tidak Lengkap']);
    const [res2] = await conn.query('SELECT LAST_INSERT_ID() as id');
    const teacherId2 = res2[0].id;
    await conn.query('INSERT INTO teacher_assignments (teacher_id, tenant_id, jabatan_di_unit) VALUES (?, ?, ?)', [teacherId2, 'TEST01', 'Guru']);

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting data:', error);
  }

  conn.end();
}

insertSampleData();