// Test basic Node.js
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test basic require
try {
  const express = require('express');
  console.log('✅ Express loaded');
} catch (e) {
  console.log('❌ Express failed:', e.message);
}

try {
  const mysql = require('mysql2/promise');
  console.log('✅ MySQL loaded');
} catch (e) {
  console.log('❌ MySQL failed:', e.message);
}

try {
  const bcrypt = require('bcrypt');
  console.log('✅ Bcrypt loaded');
} catch (e) {
  console.log('❌ Bcrypt failed:', e.message);
}

console.log('Basic test completed');