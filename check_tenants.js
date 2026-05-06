require('dotenv').config();
const db = require('./db');

async function checkTenants() {
  try {
    await db.initializeDatabase();

    const tenants = await db.query('SELECT tenant_id, nama_sekolah FROM tenants');
    console.log('Available tenants:');
    tenants.forEach(tenant => {
      console.log(`- ${tenant.tenant_id}: ${tenant.nama_sekolah}`);
    });

  } catch (error) {
    console.error('Error checking tenants:', error);
  } finally {
    process.exit();
  }
}

checkTenants();