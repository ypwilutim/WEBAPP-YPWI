require('dotenv').config();
const db = require('./db');

async function checkTeachersWA() {
  try {
    await db.initializeDatabase();

    console.log('Checking teachers with WhatsApp numbers...\n');

    // Check teachers with WhatsApp numbers
    const teachersWithWA = await db.query(`
      SELECT id, nama, no_wa
      FROM teachers
      WHERE status_aktif = 1 AND no_wa IS NOT NULL AND no_wa != ''
      LIMIT 10
    `);

    console.log(`Found ${teachersWithWA.length} teachers with WhatsApp numbers:`);
    teachersWithWA.forEach(teacher => {
      console.log(`ID: ${teacher.id}, Nama: ${teacher.nama}, WA: ${teacher.no_wa}`);
    });

    // Check total teachers
    const [totalResult] = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status_aktif = 1');
    console.log(`\nTotal active teachers: ${totalResult.count}`);

    // Check teachers with empty/null WhatsApp
    const [emptyWAResult] = await db.query(`
      SELECT COUNT(*) as count
      FROM teachers
      WHERE status_aktif = 1 AND (no_wa IS NULL OR no_wa = '')
    `);
    console.log(`Teachers with empty/null WhatsApp: ${emptyWAResult.count}`);

  } catch (error) {
    console.error('Error checking teachers WhatsApp:', error);
  } finally {
    process.exit();
  }
}

checkTeachersWA();