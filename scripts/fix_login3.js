const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// Cari baris "const tokenPayload = {" dan sisipkan setelah penutup };
let found = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const token = jwt.sign(tokenPayload')) {
    // Pastikan belum diupdate
    if (!lines[i-1].includes('tokenPayload.assignments')) {
      // Sisipkan kode sebelum baris "const token = jwt.sign..."
      lines.splice(i, 0,
        '',
        '     // Cari assignments guru untuk akses admin sekolah',
        '     if (user.role !== \'admin\' && user.guru_id) {',
        '       try {',
        '         var tokenAssignments = await db.query(',
        '           \'SELECT ta.tenant_id, ta.jabatan_di_unit, t.nama_sekolah FROM teacher_assignments ta JOIN tenants t ON ta.tenant_id = t.tenant_id WHERE ta.teacher_id = ?\',',
        '           [user.guru_id]',
        '         );',
        '         tokenPayload.assignments = tokenAssignments;',
        '       } catch (e) {',
        '         tokenPayload.assignments = [];',
        '       }',
        '     }'
      );
      found = true;
      console.log('Assignments ditambahkan ke token payload di baris ke-' + (i + 1));
      break;
    } else {
      console.log('Assignments sudah ada di token payload');
      found = true;
      break;
    }
  }
}

if (!found) {
  console.log('WARNING: Tidak menemukan baris jwt.sign');
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log('server.js saved');

// Verifikasi
let verify = fs.readFileSync('server.js', 'utf8');
if (verify.includes('tokenPayload.assignments')) {
  console.log('VERIFIED: tokenPayload.assignments ditemukan');
} else {
  console.log('GAGAL: tokenPayload.assignments TIDAK ditemukan');
}