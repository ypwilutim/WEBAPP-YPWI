const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// Cari dan ganti rules endpoint (baris ~1354-1363)
for (let i = 0; i < lines.length; i++) {
  // Fix 1: rules endpoint - cari "SELECT * FROM attendance_rules ORDER BY"
  if (lines[i].includes("const rules = await db.query('SELECT * FROM attendance_rules ORDER BY tenant_id, tipe, jam_mulai');")) {
    console.log('Found rules query at line', i + 1);
    // Ganti dengan blok baru
    lines[i] = "    var tenantId = req.query.tenant_id;";
    lines.splice(i + 1, 0,
      "    var query = 'SELECT * FROM attendance_rules';",
      "    var params = [];",
      "    if (tenantId) {",
      "      query += ' WHERE tenant_id = ?';",
      "      params.push(tenantId);",
      "    }",
      "    query += ' ORDER BY tenant_id, tipe, jam_mulai';",
      "    var rules = await db.query(query, params);"
    );
    console.log('Rules endpoint fixed at line', i + 1);
    break;
  }
}

// Fix 2: attendance-logs endpoint - cari dan tambahkan filter tenant_id
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("app.get('/api/admin/attendance-logs'") && lines[i+5] && lines[i+5].includes('const dateFilter')) {
    console.log('Found attendance-logs at line', i + 1);
    // Cari baris "let params = [];" setelah "WHERE 1=1"
    for (let j = i; j < i + 30; j++) {
      if (lines[j].includes("let params = [];")) {
        // Sisipkan tenant_id filter setelah params
        lines[j] = "    let tenantId = req.query.tenant_id;";
        lines.splice(j + 1, 0,
          "    let query = '';",
          "    let params = [];",
          "",
          "    if (tenantId) {",
          "      query = `",
          "        SELECT",
          "          al.id, al.teacher_id, al.waktu_scan, al.jenis, al.status, al.metode,",
          "          t.nama, t.nip",
          "        FROM attendance_logs al",
          "        JOIN teachers t ON al.teacher_id = t.id",
          "        JOIN teacher_assignments ta ON t.id = ta.teacher_id AND ta.tenant_id = ?",
          "        WHERE 1=1",
          "      `;",
          "      params.push(tenantId);",
          "    } else {",
          "      query = `",
          "        SELECT",
          "          al.id, al.teacher_id, al.waktu_scan, al.jenis, al.status, al.metode,",
          "          t.nama, t.nip",
          "        FROM attendance_logs al",
          "        JOIN teachers t ON al.teacher_id = t.id",
          "        WHERE 1=1",
          "      `;",
          "    }"
        );
        // Hapus baris lama "let params = [];" yang duplikat jika ada
        console.log('Attendance logs endpoint fixed');
        break;
      }
    }
    break;
  }
}

// Fix 3: devices endpoint - tambah filter tenant_id
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("app.get('/api/admin/devices'") && lines[i+1] && lines[i+1].includes('authenticateAdmin')) {
    console.log('Found devices endpoint at line', i + 1);
    // Cari "let query = 'SELECT"
    for (let j = i; j < i + 20; j++) {
      if (lines[j].includes("app.get('/api/admin/devices") && lines[j+3] && lines[j+3].includes('var query')) {
        // Sudah diupdate
        console.log('Devices endpoint already updated or not found');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log('server.js updated successfully');