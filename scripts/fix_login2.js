const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Cek apakah sudah ada assignments di token payload
if (content.includes('tokenPayload.assignments')) {
  console.log('Sudah ada assignments di token payload - SKIP');
} else {
  // Cari blok tokenPayload
  var marker = 'absensi_method: absensiMethod,';
  var idx = content.indexOf(marker);
  if (idx !== -1) {
    // Cari titik koma setelah timestamp
    var afterTs = content.indexOf('timestamp: new Date().toISOString()\n', idx);
    if (afterTs !== -1) {
      var insertPoint = afterTs + 'timestamp: new Date().toISOString()'.length;
      // Pastikan ada }; setelah timestamp
      var nextLines = content.substring(insertPoint, insertPoint + 30).trimStart();
      if (nextLines.startsWith('};')) {
        var newCode = `,\n       timestamp: new Date().toISOString()
     };

     // Cari assignments guru untuk akses admin sekolah
     if (user.role !== 'admin' && user.guru_id) {
       try {
         var assignments = await db.query(
           "SELECT ta.tenant_id, ta.jabatan_di_unit, t.nama_sekolah FROM teacher_assignments ta JOIN tenants t ON ta.tenant_id = t.tenant_id WHERE ta.teacher_id = ?",
           [user.guru_id]
         );
         tokenPayload.assignments = assignments;
       } catch (e) {
         tokenPayload.assignments = [];
       }
     }

     const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });`;

        var oldCode = `,\n       timestamp: new Date().toISOString()
     };

     const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });`;

        content = content.replace(oldCode, newCode);
        console.log('Token payload: UPDATED');
      } else {
        console.log('Token payload: format tidak dikenali setelah timestamp, nextLines:', JSON.stringify(nextLines));
      }
    } else {
      console.log('Token payload: tidak menemukan timestamp line');
    }
  } else {
    console.log('Token payload: tidak menemukan marker absensi_method');
  }
}

fs.writeFileSync('server.js', content);
console.log('server.js saved');
console.log('Verification:', content.includes('tokenPayload.assignments') ? 'OK' : 'FAILED');