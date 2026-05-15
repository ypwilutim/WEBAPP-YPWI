// Quick test for rule endpoints
const testRulesAPI = async () => {
  const baseURL = 'http://localhost:3000';
  const token = 'your-admin-token-here'; // Replace with actual token

  try {
    // Test GET rules
    console.log('Testing GET /api/admin/rules...');
    const getResponse = await fetch(`${baseURL}/api/admin/rules`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET status:', getResponse.status);

    // Test POST rule
    console.log('Testing POST /api/admin/rules...');
    const postResponse = await fetch(`${baseURL}/api/admin/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tenant_id: 'YPWILUTIM',
        tipe: 'Datang',
        jam_mulai: '06:00',
        jam_selesai: '08:00',
        keterangan: 'Test rule',
        status_log: 'tepat_waktu'
      })
    });
    console.log('POST status:', postResponse.status);
    const postResult = await postResponse.json();
    console.log('POST result:', postResult);

  } catch (error) {
    console.error('Test error:', error);
  }
};

// Uncomment to run
// testRulesAPI();