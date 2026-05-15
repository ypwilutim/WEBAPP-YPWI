const mysql = require('mysql2/promise');

async function debugDatabase() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ypwi_absensi'
  });

  try {
    console.log('🔍 Debugging database structure and data...\n');

    // Check table structure
    console.log('Teachers table structure:');
    const teacherColumns = await db.query('SHOW COLUMNS FROM teachers');
    teacherColumns.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));

    console.log('\nTeachers table data:');
    const teachers = await db.query('SELECT * FROM teachers LIMIT 2');
    console.log('Raw result:', JSON.stringify(teachers, null, 2));

    console.log('\nTenants table structure:');
    const tenantColumns = await db.query('SHOW COLUMNS FROM tenants');
    tenantColumns.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));

    console.log('\nTenants table data:');
    const tenants = await db.query('SELECT * FROM tenants LIMIT 2');
    console.log('Raw result:', JSON.stringify(tenants, null, 2));

    console.log('\nAttendance rules table data:');
    const rules = await db.query('SELECT * FROM attendance_rules LIMIT 2');
    console.log('Raw result:', JSON.stringify(rules, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

debugDatabase();