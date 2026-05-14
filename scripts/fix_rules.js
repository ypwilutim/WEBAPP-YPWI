const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Fix rules endpoint
const oldRules = `const rules = await db.query('SELECT * FROM attendance_rules ORDER BY tenant_id, tipe, jam_mulai');`;
const newRules = `var tenantId = req.query.tenant_id;
    var query = 'SELECT * FROM attendance_rules';
    var params = [];
    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      params.push(tenantId);
    }
    query += ' ORDER BY tenant_id, tipe, jam_mulai';
    var rules = await db.query(query, params);`;

if (content.includes(oldRules)) {
  content = content.replace(oldRules, newRules);
  console.log('Rules endpoint: UPDATED');
} else {
  console.log('Rules endpoint: NOT FOUND');
}

fs.writeFileSync('server.js', content);
console.log('Done');