const express = require('express');
const app = express();
const PORT = 3001;

// Test routes
app.put('/api/profile-complete/:teacherId', (req, res) => {
  const { teacherId } = req.params;
  console.log(`Profile complete called for teacher: ${teacherId}`);
  res.json({ success: true, message: 'Profile marked as complete', teacherId });
});

app.post('/api/send-whatsapp-public', (req, res) => {
  console.log('WhatsApp public notification called');
  console.log('Body:', req.body);
  res.json({ success: true, message: 'WhatsApp notification sent (mock)' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Test endpoints:');
  console.log(`- PUT /api/profile-complete/:teacherId`);
  console.log(`- POST /api/send-whatsapp-public`);
});