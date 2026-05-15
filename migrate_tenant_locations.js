// Migration script to create tenant_locations table and migrate existing data
const db = require('./db');

async function migrateTenantLocations() {
  try {
    await db.initializeDatabase();

    console.log('🔄 Starting tenant locations migration...\n');

    // Check if tenant_locations table exists
    const tables = await db.query("SHOW TABLES LIKE 'tenant_locations'");
    const tableExists = tables.length > 0;

    if (!tableExists) {
      console.log('📋 Creating tenant_locations table...');

      // Create tenant_locations table
      await db.query(`
        CREATE TABLE tenant_locations (
          id INT PRIMARY KEY AUTO_INCREMENT,
          tenant_id VARCHAR(20) NOT NULL,
          location_name VARCHAR(100) NOT NULL DEFAULT 'Lokasi Utama',
          latitude DECIMAL(10,8) NULL,
          longitude DECIMAL(11,8) NULL,
          location_radius INT DEFAULT 100,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_tenant_id (tenant_id),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Add foreign key constraint separately
      try {
        await db.query(`
          ALTER TABLE tenant_locations
          ADD CONSTRAINT fk_tenant_locations_tenant_id
          FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
        `);
      } catch (fkError) {
        console.log('⚠️  Foreign key might already exist or tenants table not ready');
      }

      console.log('✅ tenant_locations table created');
    }

    // Check if use_central_rules column exists in tenants
    const tenantColumns = await db.query('DESCRIBE tenants');
    const hasCentralRules = tenantColumns.some(col => col.Field === 'use_central_rules');

    if (!hasCentralRules) {
      console.log('📋 Adding use_central_rules column to tenants...');
      await db.query('ALTER TABLE tenants ADD COLUMN use_central_rules TINYINT(1) DEFAULT 0');
      console.log('✅ use_central_rules column added');
    }

    // Migrate existing location data
    console.log('📋 Migrating existing location data...');

    const existingTenants = await db.query(
      'SELECT tenant_id, nama_sekolah, latitude, longitude, location_radius, location_name FROM tenants WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    );

    console.log(`📍 Found ${existingTenants.length} tenants with location data to migrate`);

    for (const tenant of existingTenants) {
      // Check if location already exists
      const existingLocation = await db.query(
        'SELECT id FROM tenant_locations WHERE tenant_id = ? AND location_name = ?',
        [tenant.tenant_id, tenant.location_name || 'Lokasi Utama']
      );

      if (existingLocation.length === 0) {
        await db.query(
          'INSERT INTO tenant_locations (tenant_id, location_name, latitude, longitude, location_radius, is_active) VALUES (?, ?, ?, ?, ?, 1)',
          [
            tenant.tenant_id,
            tenant.location_name || 'Lokasi Utama',
            tenant.latitude,
            tenant.longitude,
            tenant.location_radius || 100
          ]
        );
        console.log(`✅ Migrated location for tenant: ${tenant.tenant_id}`);
      } else {
        console.log(`⏭️  Location already exists for tenant: ${tenant.tenant_id}`);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Tenants with locations migrated: ${existingTenants.length}`);
    console.log('   - tenant_locations table ready');
    console.log('   - use_central_rules column ready');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    process.exit();
  }
}

migrateTenantLocations();