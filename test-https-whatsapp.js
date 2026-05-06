require('dotenv').config();
const https = require('https');

// Test HTTPS WhatsApp implementation (same as server.js)
async function testHTTPSWhatsApp() {
  return new Promise((resolve) => {
    try {
      const whatsappEndpoint = process.env.WHATSAPP_ENDPOINT;
      const deviceId = process.env.WHATSAPP_DEVICE_ID;

      console.log('🧪 Testing HTTPS WhatsApp Implementation...\n');
      console.log('Environment check:');
      console.log('WHATSAPP_ENDPOINT:', whatsappEndpoint ? '✅ LOADED' : '❌ NOT FOUND');
      console.log('WHATSAPP_DEVICE_ID:', deviceId ? '✅ LOADED' : '❌ NOT FOUND');
      console.log();

      if (!deviceId) {
        console.error('❌ Error: WHATSAPP_DEVICE_ID tidak ditemukan di environment!');
        resolve({ success: false });
        return;
      }

      // Test message
      const number = '6282396859771';
      const message = 'Test message dari HTTPS Implementation - Updated';

      console.log(`[WHATSAPP] Sending to ${number}: ${message.substring(0, 50)}...`);

      const postData = new URLSearchParams();
      postData.append('device_id', deviceId);
      postData.append('number', number);
      postData.append('message', message);

      const postDataString = postData.toString();

      console.log('Sending request to Whacenter...');

      const url = new URL(whatsappEndpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postDataString)
        },
        timeout: 30000 // 30 second timeout
      };

      console.log('HTTPS Request to:', `${options.hostname}:${options.port}${options.path}`);

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('Raw response status:', res.statusCode);

          try {
            const result = JSON.parse(data);
            console.log('Response Status Code:', res.statusCode);
            console.log('Response Data:', JSON.stringify(result, null, 2));

            if (res.statusCode === 200 && result.status === true) {
              console.log('✅ SUCCESS: WhatsApp message sent via HTTPS!');
              console.log('Message ID:', result.data?.id);
              resolve({ success: true, message: 'Message sent successfully', data: result });
            } else {
              console.log('❌ FAILED: WhatsApp message not sent');
              console.log('Error details:', result);
              resolve({ success: false, message: 'Failed to send message', data: result });
            }
          } catch (parseError) {
            console.error('Parse error:', parseError.message);
            console.log('Raw response:', data);
            resolve({ success: false, message: 'Invalid response format' });
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ HTTPS Request Error:', error.message);
        resolve({ success: false, message: `Network error: ${error.message}` });
      });

      req.on('timeout', () => {
        console.error('❌ HTTPS Request Timeout');
        req.destroy();
        resolve({ success: false, message: 'Request timeout - WhatsApp service may be slow' });
      });

      req.write(postDataString);
      req.end();

    } catch (error) {
      console.error('❌ WhatsApp Setup Error:', error.message);
      resolve({ success: false, message: `Setup error: ${error.message}` });
    }
  });
}

async function runTest() {
  const result = await testHTTPSWhatsApp();
  console.log('\n📊 Final Test Result:', result);
}

runTest();