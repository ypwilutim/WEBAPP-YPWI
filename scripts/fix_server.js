const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Fix 1: /api/admin/rules - tambah filter tenant_id
const rulesOld = `app.get('/api/admin/rules', authenticateAdmin, async (req, res) => {
   try {
     const rules = await db.query('SELECT * FROM attendance_rules ORDER BY tenant_id, tipe, jam_mulai');
     res.json({ success: true, data: rules });
   } catch (error) {
     console.error('Admin rules error:', error);
     res.status(500).json({ success: false, message: 'Error fetching rules' });
   }
 });`;

const rulesNew = `app.get('/api/admin/rules', authenticateAdmin, async (req, res) => {
  try {
    var tenantId = req.query.tenant_id;
    var query = 'SELECT * FROM attendance_rules';
    var params = [];
    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      params.push(tenantId);
    }
    query += ' ORDER BY tenant_id, tipe, jam_mulai';
    var rules = await db.query(query, params);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Admin rules error:', error);
    res.status(500).json({ success: false, message: 'Error fetching rules' });
  }
});`;

if (content.includes(rulesOld)) {
  content = content.replace(rulesOld, rulesNew);
  console.log('Rules endpoint: UPDATED');
} else {
  console.log('Rules endpoint: NOT FOUND');
}

// Fix 2: /api/admin/tenant-locations - tambah filter tenant_id (jika belum diupdate)
const locOld = `app.get('/api/admin/tenant-locations', authenticateAdmin, async (req, res) => {
  try {
    var tenantId = req.query.tenant_id;
    var query = 'SELECT tl.*, t.nama_sekolah FROM tenant_locations tl JOIN tenants t ON tl.tenant_id = t.tenant_id';
    var params = [];
    if (tenantId) {
      query += ' WHERE tl.tenant_id = ?';
      params.push(tenantId);
    }
    query += ' ORDER BY tl.tenant_id, tl.location_name';
    var locations = await db.query(query, params);
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('TENANT LOCATIONS LIST ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching tenant locations' });
  }
});`;

// Sudah diupdate lewat edit tool sebelumnya, cek apakah sudah ada
if (content.includes('var tenantId = req.query.tenant_id') && content.includes('SELECT tl.*, t.nama_sekolah')) {
  console.log('Tenant locations endpoint: ALREADY UPDATED');
} else {
  console.log('Tenant locations endpoint: checking...');
}

// Fix 3: /api/admin/tenants/:tenantId - verify access
// Fix 4: /api/admin/tenant-locations/:id - verify access

fs.writeFileSync('server.js', content);
console.log('server.js saved');