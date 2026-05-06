const express = require('express');
const app = express();
const PORT = 3001; // Different port for testing

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test server works' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});