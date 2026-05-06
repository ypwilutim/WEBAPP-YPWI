// Test database connection
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDB() {
  try {
    console.log('Testing database connection...');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ypwi_absensi'
    });

    console.log('✅ Database connected successfully');

    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);

    await connection.end();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testDB();