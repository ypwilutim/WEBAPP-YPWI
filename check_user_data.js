const mysql = require('mysql2/promise');

async function checkUserData() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ypwi_absensi'
  });

  console.log('=== CEK DATA GURU ===');
  const [teachers] = await db.query('SELECT COUNT(*) as total FROM teachers');
  const [activeTeachers] = await db.query('SELECT COUNT(*) as total FROM teachers WHERE status_aktif = 1');
  console.log(`Total guru: ${teachers[0].total}`);
  console.log(`Guru aktif: ${activeTeachers[0].total}`);

  console.log('\n=== CEK DATA ATURAN WAKTU ===');
  const [rules] = await db.query('SELECT COUNT(*) as total FROM attendance_rules');
  console.log(`Total aturan: ${rules[0].total}`);

  console.log('\n=== 5 GURU PERTAMA (aktif) ===');
  const [sampleTeachers] = await db.query('SELECT nama, nik, status_aktif FROM teachers WHERE status_aktif = 1 LIMIT 5');
  sampleTeachers.forEach((t, i) => console.log(`${i+1}. ${t.nama} (${t.nik}) - ${t.status_aktif ? 'Aktif' : 'Nonaktif'}`));

  console.log('\n=== 5 ATURAN PERTAMA ===');
  const [sampleRules] = await db.query('SELECT tenant_id, tipe, jam_mulai, jam_selesai FROM attendance_rules LIMIT 5');
  sampleRules.forEach((r, i) => console.log(`${i+1}. ${r.tenant_id} - ${r.tipe} - ${r.jam_mulai} to ${r.jam_selesai}`));

  await db.end();
}

checkUserData().catch(err => console.error('Error:', err.message));