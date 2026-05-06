// Check and create admin user if needed
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function checkAndCreateAdmin() {
  let connection;

  try {
    console.log('🔍 Checking for admin user...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ypwi_absensi'
    });

    console.log('✅ Database connected');

    // Check existing users
    const [users] = await connection.execute('SELECT id, username, role FROM users');
    console.log('👥 Existing users:', users);

    // Check if admin exists
    const adminExists = users.some(user => user.username === 'admin' && user.role === 'admin');

    if (adminExists) {
      console.log('✅ Admin user already exists');
      return;
    }

    console.log('🚀 Creating admin user...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const [result] = await connection.execute(
      'INSERT INTO users (username, password, role, tenant_id, is_profile_complete) VALUES (?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin', 'YPWI', 1]
    );

    console.log('✅ Admin user created with ID:', result.insertId);
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');

  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndCreateAdmin();