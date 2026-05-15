// Final test of tenants endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/tenants?limit=3',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIwLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoiWVBXSUxVVElNIiwidGltZXN0YW1wIjoiMjAyNi0wNS0wNlQwMzoyNTozNi45NjdaIiwiaWF0IjoxNzc4MDM3OTM2LCJleHAiOjE3NzgwNjY3MzZ9.yEaXsTDSV44E4pic9G8E2F9UiafRqyJgked-fEg1CoA',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Response status:', res.statusCode);
      console.log('Success:', jsonData.success);
      console.log('Number of tenants:', jsonData.data.length);
      console.log('\nFirst 3 tenants:');

      jsonData.data.forEach((tenant, index) => {
        console.log(`${index + 1}. ${tenant.nama_sekolah}`);
        console.log(`   Tenant ID: ${tenant.tenant_id}`);
        console.log(`   Latitude: ${tenant.latitude || 'NULL'}`);
        console.log(`   Longitude: ${tenant.longitude || 'NULL'}`);
        console.log(`   Radius: ${tenant.location_radius || 'NULL'}`);
        console.log(`   Location Name: ${tenant.location_name || 'NULL'}`);
        console.log('');
      });
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end();