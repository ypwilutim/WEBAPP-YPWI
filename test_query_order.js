require('dotenv').config();
const db = require('./db');

async function testQueryOrder() {
  try {
    await db.initializeDatabase();

    console.log('Testing query with ORDER BY nama_sekolah...\n');

    const tenants = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants ORDER BY nama_sekolah ASC LIMIT 5');

    console.log('First 5 results:');
    tenants.forEach(tenant => {
      console.log(`${tenant.tenant_id}: ${tenant.nama_sekolah} - lat=${tenant.latitude}, lng=${tenant.longitude}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testQueryOrder();