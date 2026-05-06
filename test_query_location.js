require('dotenv').config();
const db = require('./db');

async function testQueryLocation() {
  try {
    await db.initializeDatabase();

    console.log('Testing tenants query with location fields...\n');

    const tenants = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants ORDER BY nama_sekolah ASC LIMIT 3');

    console.log('Query result:');
    console.log(JSON.stringify(tenants, null, 2));

  } catch (error) {
    console.error('Error testing query:', error);
  } finally {
    process.exit();
  }
}

testQueryLocation();