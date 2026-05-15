require('dotenv').config();
const db = require('./db');

async function findSDITPosition() {
  try {
    await db.initializeDatabase();

    console.log('Finding SDIT position in ordered results...\n');

    const tenants = await db.query('SELECT tenant_id, nama_sekolah, latitude, longitude FROM tenants ORDER BY nama_sekolah ASC');

    const sditIndex = tenants.findIndex(t => t.tenant_id === 'SDIT');
    console.log(`SDIT found at position: ${sditIndex + 1} out of ${tenants.length}`);
    console.log(`SDIT data: ${JSON.stringify(tenants[sditIndex])}`);

    // Show tenants around SDIT
    const start = Math.max(0, sditIndex - 2);
    const end = Math.min(tenants.length, sditIndex + 3);

    console.log('\nTenants around SDIT:');
    for (let i = start; i < end; i++) {
      const tenant = tenants[i];
      const marker = i === sditIndex ? ' <-- SDIT' : '';
      console.log(`${i + 1}. ${tenant.tenant_id}: ${tenant.nama_sekolah}${marker}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

findSDITPosition();