// Test specific tenant endpoint
const testSpecific = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/tenants/SDIT', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIwLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoiWVBXSUxVVElNIiwidGltZXN0YW1wIjoiMjAyNi0wNS0wNlQwMzoyNTozNi45NjdaIiwiaWF0IjoxNzc4MDM3OTM2LCJleHAiOjE3NzgwNjY3MzZ9.yEaXsTDSV44E4pic9G8E2F9UiafRqyJgked-fEg1CoA',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('SDIT tenant response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
};

testSpecific();