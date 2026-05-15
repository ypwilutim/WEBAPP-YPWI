require('dotenv').config();
const db = require('./db');

async function testCentralRules() {
  try {
    await db.initializeDatabase();

    console.log('Testing Central Rules Implementation...\n');

    // Test tenant data
    const tenants = await db.query('SELECT tenant_id, nama_sekolah, use_central_rules FROM tenants LIMIT 3');
    console.log('Tenant data:');
    tenants.forEach(tenant => {
      console.log(`- ${tenant.tenant_id}: ${tenant.nama_sekolah} | Central Rules: ${tenant.use_central_rules ? 'YES' : 'NO'}`);
    });

    // Simulate rules query for different tenants
    const testTenants = ['SDITIR', 'YPWILUTIM'];

    for (const tenantId of testTenants) {
      console.log(`\nTesting rules for tenant: ${tenantId}`);

      // Check if uses central rules
      const [tenantData] = await db.query('SELECT use_central_rules FROM tenants WHERE tenant_id = ?', [tenantId]);
      const rulesTenantId = (tenantData && tenantData.use_central_rules) ? 'YPWILUTIM' : tenantId;

      console.log(`- Tenant ${tenantId} uses rules from: ${rulesTenantId}`);

      // Count rules for the effective tenant
      const rules = await db.query('SELECT COUNT(*) as count FROM attendance_rules WHERE tenant_id = ?', [rulesTenantId]);
      console.log(`- Rules count: ${rules[0].count}`);
    }

  } catch (error) {
    console.error('Error testing central rules:', error);
  } finally {
    process.exit();
  }
}

testCentralRules();