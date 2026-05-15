require('dotenv').config();
const db = require('./db');

async function addSampleLocation() {
  try {
    await db.initializeDatabase();

    console.log('Adding sample location data...\n');

    // Update one tenant with sample location data
    const result = await db.query(
      'UPDATE tenants SET latitude = ?, longitude = ?, location_radius = ?, location_name = ?, updated_at = NOW() WHERE tenant_id = ?',
      [-3.7956, 119.6521, 200, 'Lokasi Sekolah SDIT WAHDAH ISLAMIYAH', 'SDIT']
    );

    console.log(`Updated ${result.affectedRows} tenant(s) with sample location data`);

    // Check the updated data
    const [updatedTenant] = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants WHERE tenant_id = ?', ['SDIT']);
    console.log('Updated tenant data:', updatedTenant);

  } catch (error) {
    console.error('Error adding sample location:', error);
  } finally {
    process.exit();
  }
}

addSampleLocation();