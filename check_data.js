const mysql = require('mysql2/promise');

async function checkDatabaseData() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ypwi_absensi'
  });

  try {
    console.log('📊 Checking actual database data...\n');

    // Check teachers
    console.log('Teachers:');
    const teachers = await db.query('SELECT id, nama, status_aktif FROM teachers LIMIT 5');
    teachers.forEach(t => console.log(`  ID: ${t.id}, Nama: ${t.nama}, Status: ${t.status_aktif}`));

    // Check tenants
    console.log('\nTenants:');
    const tenants = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude FROM tenants LIMIT 5');
    tenants.forEach(t => console.log(`  ${t.tenant_id}: ${t.nama_sekolah} - Lat: ${t.latitude}, Lng: ${t.longitude}`));

    // Check attendance rules
    console.log('\nAttendance Rules:');
    const rules = await db.query('SELECT tenant_id, tipe, jam_mulai, jam_selesai FROM attendance_rules LIMIT 5');
    rules.forEach(r => console.log(`  ${r.tenant_id}: ${r.tipe} ${r.jam_mulai}-${r.jam_selesai}`));

    // Check attendance logs
    console.log('\nAttendance Logs:');
    const logs = await db.query('SELECT teacher_id, tenant_id, jenis, status FROM attendance_logs ORDER BY waktu_scan DESC LIMIT 3');
    if (logs.length === 0) {
      console.log('  No attendance logs yet');
    } else {
      logs.forEach(l => console.log(`  Teacher ${l.teacher_id} (${l.tenant_id}): ${l.jenis} - ${l.status}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

checkDatabaseData();