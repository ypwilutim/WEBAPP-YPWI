const mysql = require('mysql2/promise');

async function checkCounts() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ypwi_absensi'
  });

  const [teacherCount] = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
  const [ruleCount] = await db.query('SELECT COUNT(*) as count FROM attendance_rules');
  const [allTeachers] = await db.query('SELECT nama FROM teachers WHERE status_aktif = 1 LIMIT 10');
  const [allRules] = await db.query('SELECT tenant_id, tipe, jam_mulai FROM attendance_rules LIMIT 10');

  console.log('Jumlah guru aktif:', teacherCount[0].count);
  console.log('Jumlah aturan waktu:', ruleCount[0].count);
  console.log('Beberapa guru:', allTeachers.map(t => t.nama));
  console.log('Beberapa aturan:', allRules.map(r => `${r.tenant_id} - ${r.tipe} - ${r.jam_mulai}`));

  await db.end();
}

checkCounts().catch(err => console.error('Error:', err.message));