require('dotenv').config();

// Test server WhatsApp implementation
async function testServerWhatsApp() {
  console.log('🧪 Testing Server WhatsApp Implementation...\n');

  // Import the same function from server.js logic
  const sendWhatsAppMessage = async (number, message) => {
    try {
      // Ensure number starts with country code (Indonesia)
      let cleanNumber = number.replace(/\D/g, ''); // Remove non-digits

      // Add country code if not present
      if (!cleanNumber.startsWith('62')) {
        if (cleanNumber.startsWith('0')) {
          cleanNumber = '62' + cleanNumber.substring(1);
        } else {
          cleanNumber = '62' + cleanNumber;
        }
      }

      const whatsappEndpoint = process.env.WHATSAPP_ENDPOINT;
      const deviceId = process.env.WHATSAPP_DEVICE_ID;

      if (!deviceId) {
        console.error('❌ Error: WHATSAPP_DEVICE_ID tidak ditemukan di environment!');
        return { success: false, message: 'WhatsApp configuration missing' };
      }

      console.log(`[WHATSAPP] Sending to ${cleanNumber}: ${message.substring(0, 50)}...`);

      const params = new URLSearchParams();
      params.append('device_id', deviceId);
      params.append('number', cleanNumber);
      params.append('message', message);

      console.log('Sending request to Whacenter...');

      const response = await fetch(whatsappEndpoint, {
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
        return { success: true, message: 'Message sent successfully', data: result };
      } else {
        console.log('❌ FAILED: WhatsApp message not sent');
        console.log('Error details:', result);
        return { success: false, message: 'Failed to send message', data: result };
      }

    } catch (error) {
      console.error('❌ NETWORK ERROR:', error.message);
      console.error('Error details:', error);
      return { success: false, message: `Network error: ${error.message}` };
    }
  };

  console.log('Environment check:');
  console.log('WHATSAPP_ENDPOINT:', process.env.WHATSAPP_ENDPOINT ? '✅ LOADED' : '❌ NOT FOUND');
  console.log('WHATSAPP_DEVICE_ID:', process.env.WHATSAPP_DEVICE_ID ? '✅ LOADED' : '❌ NOT FOUND');
  console.log();

  // Test the function
  const result = await sendWhatsAppMessage('6282396859771', 'Test message dari Server - Implementation Updated');

  console.log('\n📊 Final Result:', result);
}

testServerWhatsApp();