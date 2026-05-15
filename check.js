const mysql = require('mysql2/promise');

async function check() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'ypwi_absensi' });
  const [teachers] = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
  const [rules] = await db.query('SELECT COUNT(*) as count FROM attendance_rules');
  console.log('Teachers:', teachers[0].count);
  console.log('Rules:', rules[0].count);
  const [allTeachers] = await db.query('SELECT nama FROM teachers WHERE status_aktif = 1');
  console.log('Teacher names:', allTeachers.map(t => t.nama));
  const [allRules] = await db.query('SELECT tipe, jam_mulai, jam_selesai FROM attendance_rules');
  console.log('Rules:', allRules);
  await db.end();
}

check();