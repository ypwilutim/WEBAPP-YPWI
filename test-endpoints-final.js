const fetch = require('node-fetch');

async function testPublicEndpoints() {
  console.log('🧪 Testing Public Endpoints...\n');

  try {
    // Test /api/tenants
    console.log('Testing /api/tenants...');
    const tenantResponse = await fetch('http://localhost:3000/api/tenants');
    const tenantData = await tenantResponse.json();
    console.log('✅ /api/tenants:', tenantResponse.status, tenantData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Tenants found:', tenantData.data ? tenantData.data.length : 0);

    // Test /api/teachers/assignments endpoint (should work for valid teacher)
    console.log('\nTesting /api/teachers/95/assignments (POST)...');
    const assignmentResponse = await fetch('http://localhost:3000/api/teachers/95/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'SDIT',
        jabatan_di_unit: 'Guru Mapel'
      })
    });
    const assignmentData = await assignmentResponse.json();
    console.log('✅ /api/teachers/assignments:', assignmentResponse.status);
    console.log('   Response:', assignmentData.message);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testPublicEndpoints();