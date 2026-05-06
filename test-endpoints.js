const fetch = require('node-fetch');

async function testEndpoints() {
  try {
    console.log('🧪 Testing endpoints...\n');

    // Test /api/test
    console.log('Testing /api/test...');
    const testResponse = await fetch('http://localhost:3000/api/test');
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ /api/test works:', testData);
    } else {
      console.log('❌ /api/test failed:', testResponse.status, testResponse.statusText);
    }

    // Test /api/tenants
    console.log('\nTesting /api/tenants...');
    const tenantResponse = await fetch('http://localhost:3000/api/tenants');
    if (tenantResponse.ok) {
      const tenantData = await tenantResponse.json();
      console.log('✅ /api/tenants works:', tenantData);
    } else {
      console.log('❌ /api/tenants failed:', tenantResponse.status, tenantResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();