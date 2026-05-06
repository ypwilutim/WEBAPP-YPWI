require('dotenv').config();
const db = require('./db');

async function testQuery() {
  try {
    await db.initializeDatabase();

    console.log('Testing teachers query...\n');

    // Test the exact query used in endpoint
    const teachers = await db.query(`
      SELECT
        t.id, t.nama, t.nik, t.nip, t.email, t.status_kepegawaian, t.status_aktif, t.no_wa,
        GROUP_CONCAT(DISTINCT CONCAT(ta.tenant_id, ':', ta.jabatan_di_unit)) as assignments
      FROM teachers t
      LEFT JOIN teacher_assignments ta ON t.id = ta.teacher_id
      WHERE t.status_aktif = 1
      GROUP BY t.id
      ORDER BY t.nama ASC
      LIMIT 2
    `);

    console.log('Query result:');
    console.log(JSON.stringify(teachers, null, 2));

  } catch (error) {
    console.error('Error testing query:', error);
  } finally {
    process.exit();
  }
}

testQuery();