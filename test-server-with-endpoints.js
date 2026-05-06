const { spawn } = require('child_process');
const fetch = require('node-fetch');

console.log('🚀 Starting server and testing endpoints...\n');

// Start server
const server = spawn('node', ['server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

// Listen for server ready message
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[SERVER]', output.trim());

  if (output.includes('berjalan di http://localhost:3000') && !serverReady) {
    serverReady = true;
    console.log('\n✅ Server ready! Testing endpoints...\n');

    // Wait a bit more for full initialization
    setTimeout(() => {
      testEndpoints();
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error('[SERVER ERROR]', data.toString());
});

async function testEndpoints() {
  try {
    // Test /api/tenants
    console.log('Testing /api/tenants...');
    const tenantResponse = await fetch('http://localhost:3000/api/tenants');
    const tenantData = await tenantResponse.json();
    console.log('✅ /api/tenants:', tenantResponse.status, tenantData.success ? 'SUCCESS' : 'FAILED');

    // Test /api/teachers/assignments
    console.log('Testing /api/teachers/95/assignments...');
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

    console.log('\n🎉 All tests completed! Shutting down server...');
    server.kill();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    server.kill();
    process.exit(1);
  }
}

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Timeout reached. Shutting down...');
  server.kill();
  process.exit(1);
}, 30000);