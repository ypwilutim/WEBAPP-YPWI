require('dotenv').config();
const db = require('./db');

async function testQueryFinal() {
  try {
    await db.initializeDatabase();

    console.log('Testing final query...\n');

    // Exact query from endpoint
    const tenants = await db.query('SELECT tenant_id, nama_sekolah, COALESCE(latitude, NULL) as latitude, COALESCE(longitude, NULL) as longitude, COALESCE(location_radius, 100) as location_radius, location_name FROM tenants ORDER BY nama_sekolah ASC LIMIT 10');

    console.log('Query results:');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.nama_sekolah} (${tenant.tenant_id})`);
      console.log(`   Latitude: ${tenant.latitude}`);
      console.log(`   Longitude: ${tenant.longitude}`);
      console.log(`   Radius: ${tenant.location_radius}`);
      console.log(`   Location Name: ${tenant.location_name}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testQueryFinal();