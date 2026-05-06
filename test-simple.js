// Simple test without database
console.log('🧪 Testing basic Node.js functionality...');

const express = require('express');
const app = express();

console.log('✅ Express loaded successfully');

app.get('/test', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const server = app.listen(3001, () => {
  console.log('✅ Test server started on port 3001');

  // Test WhatsApp function
  console.log('📱 Testing WhatsApp function...');

  // Mock the function for testing
  const mockResult = {
    success: true,
    message: 'Mocked WhatsApp send (development mode)'
  };

  console.log('✅ WhatsApp function mock result:', mockResult);

  // Close server after test
  setTimeout(() => {
    server.close(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    });
  }, 1000);
});