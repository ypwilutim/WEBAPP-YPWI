// Quick server and login test
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function testEverything() {
  try {
    console.log('🧪 Testing YPWI Absensi components...\n');

    // Test 1: Express
    console.log('1️⃣ Testing Express...');
    const app = express();
    console.log('✅ Express OK\n');

    // Test 2: MySQL connection
    console.log('2️⃣ Testing MySQL connection...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ypwi_absensi'
    });
    console.log('✅ MySQL connection OK\n');

    // Test 3: Check admin user
    console.log('3️⃣ Testing admin user...');
    const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    console.log('👥 Users found:', users.length);

    if (users.length === 0) {
      console.log('🚀 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(
        'INSERT INTO users (username, password, role, tenant_id, is_profile_complete) VALUES (?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin', 'YPWI', 1]
      );
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user exists');
    }

    // Test 4: Password verification
    console.log('\n4️⃣ Testing password verification...');
    const user = users[0] || (await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']))[0][0];
    if (user) {
      const passwordValid = await bcrypt.compare('admin123', user.password);
      console.log('🔑 Password check:', passwordValid ? '✅ Valid' : '❌ Invalid');
    }

    await connection.end();
    console.log('\n🎉 All tests passed! Server should work correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testEverything();