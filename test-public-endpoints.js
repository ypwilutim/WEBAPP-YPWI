const http = require('http');

async function testEndpoints() {
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
  console.log('🧪 Testing public endpoints...\n');

  // Test /api/tenants
  try {
    console.log('Testing /api/tenants...');
    const response = await fetch('http://localhost:3000/api/tenants');
    const data = await response.json();
    console.log('✅ /api/tenants status:', response.status);
    console.log('Data length:', data.data ? data.data.length : 'No data');
  } catch (error) {
    console.log('❌ /api/tenants failed:', error.message);
  }

  // Test /api/teachers/1/assignments (should fail with 404 since no teacher with id 1)
  try {
    console.log('\nTesting /api/teachers/1/assignments (POST)...');
    const response = await fetch('http://localhost:3000/api/teachers/1/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: 'TEST', jabatan_di_unit: 'TEST' })
    });
    console.log('✅ /api/teachers/assignments status:', response.status);
    const data = await response.json();
    console.log('Response:', data.message);
  } catch (error) {
    console.log('❌ /api/teachers/assignments test failed:', error.message);
  }
}

testEndpoints();