require('dotenv').config();
const db = require('./db');

async function checkSDITLocation() {
  try {
    await db.initializeDatabase();

    console.log('Checking SDIT location data...\n');

    const [sdit] = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants WHERE tenant_id = ?', ['SDIT']);

    console.log('SDIT data:');
    console.log(JSON.stringify(sdit, null, 2));

  } catch (error) {
    console.error('Error checking SDIT:', error);
  } finally {
    process.exit();
  }
}

checkSDITLocation();