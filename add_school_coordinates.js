require('dotenv').config();
const db = require('./db');

// Sample coordinates for major schools in Lutim area
const schoolCoordinates = {
  'SDIT': { lat: -2.64552000, lng: 121.12779300 }, // SDIT coordinates
  'SDITIR': { lat: -2.64552000, lng: 121.12779300 }, // SDIT Insan Rabbani
  'PPIB': { lat: -2.64552000, lng: 121.12779300 }, // PPIB
  'YPWILUTIM': { lat: -2.64552000, lng: 121.12779300 }, // YPWI Lutim
  // Add more coordinates as needed
};

async function addSchoolCoordinates() {
  try {
    await db.initializeDatabase();

    console.log('Adding coordinates to schools...\n');

    for (const [tenantId, coords] of Object.entries(schoolCoordinates)) {
      const result = await db.query(
        'UPDATE tenants SET latitude = ?, longitude = ?, updated_at = NOW() WHERE tenant_id = ?',
        [coords.lat, coords.lng, tenantId]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ Updated ${tenantId}: ${coords.lat}, ${coords.lng}`);
      } else {
        console.log(`❌ Failed to update ${tenantId}`);
      }
    }

    // Verify the updates
    console.log('\nVerifying updates...');
    const updatedSchools = await db.query(
      'SELECT tenant_id, nama_sekolah, latitude, longitude FROM tenants WHERE latitude IS NOT NULL AND longitude IS NOT NULL LIMIT 10'
    );

    console.log(`\nSchools with coordinates: ${updatedSchools.length}`);
    updatedSchools.forEach(school => {
      console.log(`${school.tenant_id}: ${school.nama_sekolah} - ${school.latitude}, ${school.longitude}`);
    });

  } catch (error) {
    console.error('Error adding school coordinates:', error);
  } finally {
    process.exit();
  }
}

addSchoolCoordinates();