const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Fix 1: GET /api/admin/tenants/:tenantId - tambah verify tenant access
let old1 = `app.get('/api/admin/tenants/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;`;

let new1 = `app.get('/api/admin/tenants/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    // Verify operator access to this tenant
    if (req.user.role === 'guru' && req.user.adminAssignments) {
      var allowedTenants = (req.user.adminAssignments || []).map(a => a.tenant_id);
      if (!allowedTenants.includes(tenantId)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Anda tidak berwenang mengakses data sekolah ini' });
      }
    }`;

if (content.includes(old1) && !content.includes('Verify operator access to this tenant')) {
  content = content.replace(old1, new1);
  console.log('GET /api/admin/tenants/:tenantId - UPDATED');
} else {
  console.log('GET /api/admin/tenants/:tenantId - SKIP (sudah update atau tidak ditemukan)');
}

// Fix 2: PUT /api/admin/tenants/:tenantId - tambah verify
let old2 = `app.put('/api/admin/tenants/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;`;

let new2 = `app.put('/api/admin/tenants/:tenantId', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    // Verify operator access to this tenant
    if (req.user.role === 'guru' && req.user.adminAssignments) {
      var allowedTenants = (req.user.adminAssignments || []).map(a => a.tenant_id);
      if (!allowedTenants.includes(tenantId)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Anda tidak berwenang mengedit data sekolah ini' });
      }
    }`;

if (content.includes(old2) && !content.includes('Verify operator access to this tenant') ||
    content.includes(old2) && !content.includes('allowedTenants_')) {
  // Hanya update jika belum diupdate
  // Cek apakah sudah ada verify di PUT tenants
  var putTenantsIdx = content.indexOf(old2);
  if (putTenantsIdx !== -1) {
    var nearby = content.substring(putTenantsIdx, putTenantsIdx + 500);
    if (!nearby.includes('Akses ditolak')) {
      content = content.replace(old2, new2);
      console.log('PUT /api/admin/tenants/:tenantId - UPDATED');
    } else {
      console.log('PUT /api/admin/tenants/:tenantId - SKIP (sudah update)');
    }
  }
}

// Fix 3: POST /api/admin/tenant-locations - auto-set tenant_id untuk operator
let old3 = `app.post('/api/admin/tenant-locations', authenticateAdmin, async (req, res) => {
  try {
    const { tenant_id, location_name, latitude, longitude, location_radius } = req.body;`;

let new3 = `app.post('/api/admin/tenant-locations', authenticateAdmin, async (req, res) => {
  try {
    var bodyTenantId = req.body.tenant_id;
    // Jika operator, force tenant_id dari assignment
    if (req.user.role === 'guru' && req.user.adminAssignments) {
      var allowedTenants = (req.user.adminAssignments || []).map(a => a.tenant_id);
      if (allowedTenants.length === 1) {
        bodyTenantId = allowedTenants[0];
      }
    }
    const { location_name, latitude, longitude, location_radius } = req.body;
    const tenant_id = bodyTenantId;`;

// Cek apakah sudah diupdate
if (content.includes(old3) && !content.includes('Jika operator, force')) {
  content = content.replace(old3, new3);
  console.log('POST /api/admin/tenant-locations - UPDATED');
} else {
  console.log('POST /api/admin/tenant-locations - SKIP');
}

// Fix 4: DELETE /api/admin/tenant-locations/:id - tambah verify
// Cari endpoint delete tenant location
var deleteLocPattern = "app.delete('/api/admin/tenant-locations/:id'";
var deleteLocIdx = content.indexOf(deleteLocPattern);
if (deleteLocIdx !== -1) {
  var nearby = content.substring(deleteLocIdx, deleteLocIdx + 400);
  if (!nearby.includes('Akses ditolak')) {
    var old4 = `app.delete('/api/admin/tenant-locations/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [loc] = await db.query('SELECT tenant_id FROM tenant_locations WHERE id = ?', [id]);`;

    var new4 = `app.delete('/api/admin/tenant-locations/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [loc] = await db.query('SELECT tenant_id FROM tenant_locations WHERE id = ?', [id]);

    // Verify operator access
    if (req.user.role === 'guru' && req.user.adminAssignments) {
      var allowedTenants = (req.user.adminAssignments || []).map(a => a.tenant_id);
      if (loc.length > 0 && !allowedTenants.includes(loc[0].tenant_id)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak' });
      }
    }`;

    content = content.replace(old4, new4);
    console.log('DELETE /api/admin/tenant-locations/:id - UPDATED');
  } else {
    console.log('DELETE tenant-locations - SKIP (sudah update)');
  }
}

// Fix 5: attendance-logs - tambah filter tenant_id
// Sudah diupdate sebelumnya, cek apakah sudah ada
var attIdx = content.indexOf("app.get('/api/admin/attendance-logs'");
if (attIdx !== -1) {
  var attNearby = content.substring(attIdx, attIdx + 200);
  if (attNearby.includes('tenant_id')) {
    console.log('attendance-logs - SKIP (sudah update)');
  } else {
    console.log('attendance-logs - BELUM UPDATE, perlu manual');
  }
}

// Fix 6: /api/admin/summary - tambah filter tenant_id
var summaryIdx = content.indexOf("app.get('/api/admin/summary'");
if (summaryIdx !== -1) {
  var summaryNearby = content.substring(summaryIdx, summaryIdx + 300);
  if (summaryNearby.includes('tenant_id') && summaryNearby.includes('getTenantFilter')) {
    console.log('summary endpoint - SKIP (sudah update)');
  } else {
    console.log('summary endpoint - BELUM UPDATE');
  }
}

fs.writeFileSync('server.js', content);
console.log('\\nserver.js saved');