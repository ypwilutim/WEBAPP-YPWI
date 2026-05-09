// Migration script to add hari column to attendance_rules
const db = require('./db');

async function addHariColumn() {
  try {
    await db.initializeDatabase();

    console.log('Adding hari column to attendance_rules table...');

    // Check if column exists
    const columns = await db.query('DESCRIBE attendance_rules');
    const hariExists = columns.some(col => col.Field === 'hari');

    if (hariExists) {
      console.log('✅ hari column already exists');
      return;
    }

    // Add hari column
    await db.query('ALTER TABLE attendance_rules ADD COLUMN hari VARCHAR(100) NULL AFTER status_log');

    console.log('✅ hari column added successfully');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit();
  }
}

addHariColumn();