// Setup database and tables
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    console.log('🔧 Setting up YPWI Absensi database...');

    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server');

    // Create database if not exists
    await connection.execute('CREATE DATABASE IF NOT EXISTS ypwi_absensi');
    console.log('✅ Database ypwi_absensi created/verified');

    // Switch to database
    await connection.execute('USE ypwi_absensi');
    console.log('✅ Switched to ypwi_absensi database');

    // Read and execute SQL file
    const sqlContent = fs.readFileSync('ypwi_absensi.sql', 'utf8');
    console.log('📄 SQL file loaded, executing...');

    // Split SQL into individual statements and execute
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          // Ignore errors for already existing tables/keys
          if (!error.message.includes('already exists') &&
              !error.message.includes('Duplicate entry')) {
            console.log(`⚠️  Statement failed (might be OK): ${error.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log('✅ Database tables created successfully');

    // Test connection to database
    const [rows] = await connection.execute('SHOW TABLES');
    console.log(`📊 Found ${rows.length} tables in database`);

    console.log('🎉 Database setup completed successfully!');
    console.log('🚀 You can now start the server with: node server.js');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();