require('dotenv').config();
const db = require('./db');

async function checkTenantFields() {
  try {
    await db.initializeDatabase();

    console.log('Checking tenant table structure...\n');

    // Check table structure
    const columns = await db.query('DESCRIBE tenants');
    console.log('Tenant table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    console.log('\nChecking sample tenant data...');
    const [sampleTenant] = await db.query('SELECT * FROM tenants LIMIT 1');
    if (sampleTenant) {
      console.log('Sample tenant data:');
      Object.keys(sampleTenant).forEach(key => {
        console.log(`- ${key}: ${sampleTenant[key] || 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('Error checking tenant fields:', error);
  } finally {
    process.exit();
  }
}

checkTenantFields();