require('dotenv').config();
const db = require('./db');

async function debugTenants() {
  try {
    await db.initializeDatabase();

    console.log('Fetching tenants with location fields...\n');

    const tenants = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants ORDER BY nama_sekolah ASC');

    console.log(`Total tenants: ${tenants.length}`);

    // Show first few with location data
    const withLocation = tenants.filter(t => t.latitude && t.longitude);
    console.log(`\nTenants with location data: ${withLocation.length}`);

    if (withLocation.length > 0) {
      console.log('Sample tenant with location:');
      console.log(JSON.stringify(withLocation[0], null, 2));
    }

    // Show tenants without location
    const withoutLocation = tenants.filter(t => !t.latitude || !t.longitude);
    console.log(`\nTenants without location data: ${withoutLocation.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

debugTenants();