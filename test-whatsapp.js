require('dotenv').config();

console.log('Loading environment variables...');
console.log('WHATSAPP_ENDPOINT:', process.env.WHATSAPP_ENDPOINT ? 'LOADED' : 'NOT FOUND');
console.log('WHATSAPP_DEVICE_ID:', process.env.WHATSAPP_DEVICE_ID ? 'LOADED' : 'NOT FOUND');
console.log('Native fetch available:', typeof fetch !== 'undefined' ? 'YES' : 'NO');

// Use native fetch if available, otherwise try node-fetch with dynamic import
let fetchFn = fetch;

if (typeof fetch === 'undefined') {
  try {
    // Dynamic import for node-fetch ESM module
    import('node-fetch').then(module => {
      fetchFn = module.default;
      console.log('Using node-fetch as fallback');
    }).catch(err => {
      console.error('Failed to load node-fetch:', err.message);
    });
  } catch (e) {
    console.error('No fetch available:', e.message);
  }
}

async function testWhatsAppConnection() {
  console.log('🧪 Testing WhatsApp Connection...\n');

  const WHATSAPP_ENDPOINT = process.env.WHATSAPP_ENDPOINT;
  const WHATSAPP_DEVICE_ID = process.env.WHATSAPP_DEVICE_ID;

  if (!WHATSAPP_DEVICE_ID) {
    console.error('❌ Error: WHATSAPP_DEVICE_ID tidak ditemukan di environment!');
    return;
  }

  console.log('Endpoint:', WHATSAPP_ENDPOINT);
  console.log('Device ID:', WHATSAPP_DEVICE_ID);

  try {
    const params = new URLSearchParams();
    params.append('device_id', WHATSAPP_DEVICE_ID);
    params.append('number', '6282396859771');
    params.append('message', 'Test message dari Sistem YPWI - Final Test');

    console.log('Sending request to Whacenter...');

    const response = await fetchFn(WHATSAPP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    console.log('Raw response status:', response.status);
    console.log('Raw response ok:', response.ok);

    const result = await response.json();
    console.log('Response Status Code:', response.status);
    console.log('Response Data:', JSON.stringify(result, null, 2));

    if (response.ok && result.status === true) {
      console.log('✅ SUCCESS: WhatsApp message sent!');
      console.log('Message ID:', result.data?.id);
    } else {
      console.log('❌ FAILED: WhatsApp message not sent');
      console.log('Error details:', result);
    }

  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.error('Error details:', error);
  }
}

testWhatsAppConnection();