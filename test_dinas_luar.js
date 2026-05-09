require('dotenv').config();
const db = require('./db');

async function testAttendanceLogs() {
  try {
    await db.initializeDatabase();

    console.log('Testing attendance_logs structure...\n');

    // Check table structure
    const structure = await db.query('DESCRIBE attendance_logs');
    console.log('Table structure:');
    structure.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    console.log('\nTesting dinas luar detection logic...\n');

    // Test with a teacher and different tenant
    const teacherId = 95; // Akbar Irwansya
    const scannerTenantId = 'SDITIR'; // Different from YPWILUTIM

    const assignments = await db.query('SELECT tenant_id FROM teacher_assignments WHERE teacher_id = ?', [teacherId]);
    const assignedTenantIds = assignments.map(a => a.tenant_id);
    console.log(`Teacher ${teacherId} assigned to:`, assignedTenantIds);

    const is_dinas_luar = !assignedTenantIds.includes(scannerTenantId);
    console.log(`Scanning at ${scannerTenantId}: dinas_luar = ${is_dinas_luar ? 1 : 0}`);

    // Test insert (without actually inserting)
    console.log('\nSimulated INSERT values:');
    console.log(`- teacher_id: ${teacherId}`);
    console.log(`- tenant_id: ${scannerTenantId}`);
    console.log(`- metode: 'scanner'`);
    console.log(`- dinas_luar: ${is_dinas_luar ? 1 : 0}`);
    console.log(`- kegiatan_dinas: ${is_dinas_luar ? 1 : null}`);
    console.log(`- lokasi (via tenant_id): ${scannerTenantId}`);

  } catch (error) {
    console.error('Error testing:', error);
  } finally {
    process.exit();
  }
}

testAttendanceLogs();