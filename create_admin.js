require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

async function createAdminUser() {
  try {
    await db.initializeDatabase();

    // Check if admin user exists
    const existingUsers = await db.query('SELECT id, username FROM users WHERE username = ?', ['admin']);
    if (existingUsers.length > 0) {
      console.log('Admin user already exists:', existingUsers[0]);
      return;
    }

    // Create admin user with valid tenant_id
    const hashedPassword = await bcrypt.hash('ypwi123', 10);
    const result = await db.query(
      'INSERT INTO users (username, password, role, tenant_id, is_profile_complete, is_default_password) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin', 'YPWILUTIM', 1, 1]
    );

    console.log('Admin user created successfully with ID:', result.insertId);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit();
  }
}

createAdminUser();