require('dotenv').config();
const db = require('./db');

async function checkAttendanceLogs() {
  try {
    await db.initializeDatabase();

    console.log('Checking attendance_logs data...\n');

    // Check attendance logs with teacher join
    const logs = await db.query(`
      SELECT
        al.id, al.teacher_id, al.waktu_scan, al.jenis, al.status, al.metode,
        t.nama, t.nip, t.status_aktif
      FROM attendance_logs al
      LEFT JOIN teachers t ON al.teacher_id = t.id
      ORDER BY al.waktu_scan DESC
      LIMIT 10
    `);

    console.log('Recent attendance logs:');
    logs.forEach(log => {
      console.log(`ID: ${log.id}, Teacher ID: ${log.teacher_id}, Nama: "${log.nama || 'NULL'}", NIP: "${log.nip || 'NULL'}", Status Aktif: ${log.status_aktif}, Waktu: ${log.waktu_scan}`);
    });

    console.log('\nChecking for orphaned records (attendance_logs with no matching teacher)...');

    const orphaned = await db.query(`
      SELECT al.id, al.teacher_id, al.waktu_scan
      FROM attendance_logs al
      LEFT JOIN teachers t ON al.teacher_id = t.id
      WHERE t.id IS NULL
      LIMIT 10
    `);

    console.log(`Found ${orphaned.length} orphaned records:`);
    orphaned.forEach(record => {
      console.log(`ID: ${record.id}, Teacher ID: ${record.teacher_id}, Waktu: ${record.waktu_scan}`);
    });

  } catch (error) {
    console.error('Error checking attendance logs:', error);
  } finally {
    process.exit();
  }
}

checkAttendanceLogs();