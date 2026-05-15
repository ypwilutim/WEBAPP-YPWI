const fetch = require('node-fetch');

async function testTenants() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/tenants', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIwLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoiWVBXSUxVVElNIiwidGltZXN0YW1wIjoiMjAyNi0wNS0wNlQwMzoyNTozNi45NjdaIiwiaWF0IjoxNzc4MDM3OTM2LCJleHAiOjE3NzgwNjY3MzZ9.yEaXsTDSV44E4pic9G8E2F9UiafRqyJgked-fEg1CoA',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Response success:', data.success);
    console.log('Total items:', data.data.length);

    // Check how many have location data
    const withLocation = data.data.filter(t => t.latitude && t.longitude);
    console.log('Items with location:', withLocation.length);

    if (withLocation.length > 0) {
      console.log('Sample item with location:');
      console.log(JSON.stringify(withLocation[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testTenants();