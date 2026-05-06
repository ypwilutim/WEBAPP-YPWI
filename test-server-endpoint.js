const fetch = require('node-fetch');

// Test WhatsApp call via server endpoint
async function testServerWhatsAppCall() {
  console.log('🧪 Testing WhatsApp call via server endpoint...\n');

  // Wait for server to start
  console.log('Waiting 3 seconds for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log('Making request to /api/send-whatsapp-public...');
    // Test the public WhatsApp endpoint
    const response = await fetch('http://localhost:3000/api/send-whatsapp-public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: '6282396859771',
        message: 'Test WhatsApp from server endpoint',
        type: 'test',
        nama: 'Test User'
      })
    });

    console.log('Server response status:', response.status);

    const result = await response.json();
    console.log('Server response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServerWhatsAppCall();