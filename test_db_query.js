require('dotenv').config();
const db = require('./db');

async function testDBQuery() {
  try {
    await db.initializeDatabase();

    console.log('Testing direct database query...\n');

    const tenants = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants ORDER BY nama_sekolah ASC LIMIT 3');

    console.log('Query results:');
    tenants.forEach(tenant => {
      console.log(`${tenant.tenant_id}: lat=${tenant.latitude}, lng=${tenant.longitude}, radius=${tenant.location_radius}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testDBQuery();