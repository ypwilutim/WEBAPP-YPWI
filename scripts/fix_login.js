const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Fix 1: Tambahkan assignments ke token payload setelah absensiMethod
const oldPayload = `const tokenPayload = {
       id: user.id,
       username: user.username,
       role: user.role,
       guru_id: user.guru_id,
       tenant_id: user.tenant_id,
       absensi_method: absensiMethod,
       timestamp: new Date().toISOString()
     };

     const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });`;

const newPayload = `const tokenPayload = {
       id: user.id,
       username: user.username,
       role: user.role,
       guru_id: user.guru_id,
       tenant_id: user.tenant_id,
       absensi_method: absensiMethod,
       timestamp: new Date().toISOString()
     };

     // Cari assignments untuk guru (untuk akses admin sekolah)
     if (user.role !== 'admin') {
       try {
         var assignments = await db.query(
           'SELECT ta.tenant_id, ta.jabatan_di_unit, t.nama_sekolah FROM teacher_assignments ta JOIN tenants t ON ta.tenant_id = t.tenant_id WHERE ta.teacher_id = ?',
           [user.guru_id]
         );
         tokenPayload.assignments = assignments;
       } catch (e) {
         tokenPayload.assignments = [];
       }
     }

     const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });`;

if (content.includes(oldPayload)) {
  content = content.replace(oldPayload, newPayload);
  console.log('Token payload: UPDATED (assignments ditambahkan)');
} else {
  console.log('Token payload: GAGAL (format tidak cocok)');
}

fs.writeFileSync('server.js', content);
console.log('server.js saved');