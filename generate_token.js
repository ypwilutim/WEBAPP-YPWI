const jwt = require('jsonwebtoken');

const SECRET_KEY = 'ypwi-secret-key-2026'; // Same as in server.js

const token = jwt.sign({
  id: 120,
  username: 'admin',
  role: 'admin',
  tenant_id: 'YPWILUTIM',
  timestamp: new Date().toISOString()
}, SECRET_KEY, { expiresIn: '8h' });

console.log('Generated admin token:');
console.log(token);