// Quick test to verify fetch is working in server context
async function testFetchInServer() {
  console.log('🧪 Testing fetch availability in server context...');

  try {
    // Test with a simple HTTP endpoint
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      headers: {
        'User-Agent': 'YPWI-Test'
      }
    });

    console.log('✅ Fetch is working! Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Fetch failed:', error.message);
    return false;
  }
}

testFetchInServer();