// Test MySQL connection
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQL() {
  try {
    console.log('🔍 Testing MySQL connection...');

    // Test connection without database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL server');

    // Create database if not exists
    await connection.execute('CREATE DATABASE IF NOT EXISTS ypwi_absensi');
    console.log('✅ Database ypwi_absensi created');

    await connection.end();
    console.log('✅ MySQL connection test successful');

  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('Please check:');
    console.error('1. MySQL service is running');
    console.error('2. Username/password is correct');
    console.error('3. MySQL allows connections from this user');
  }
}

testMySQL();