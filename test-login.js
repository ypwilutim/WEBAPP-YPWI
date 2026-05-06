// Test login API directly
async function testLogin() {
  try {
    console.log('🔐 Testing login API...');

    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    console.log('📊 Response status:', response.status);

    const data = await response.json();
    console.log('📨 Response data:', data);

    if (data.success) {
      console.log('✅ Login successful!');
      console.log('🔗 Redirect to:', data.redirect);
    } else {
      console.log('❌ Login failed:', data.message);
    }

  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testLogin();