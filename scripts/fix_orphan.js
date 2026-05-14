const fs = require('fs');
let content = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');

// Hapus kode orphaned yang menyebabkan syntax error
const orphaned = `           console.error('[AUTH CHECK] User not admin or invalid, redirecting to login. User role:', user ? user.role : 'unknown');
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }`;

if (content.includes(orphaned)) {
  content = content.replace(orphaned, '');
  console.log('Orphaned code: REMOVED');
} else {
  console.log('Orphaned code: NOT FOUND');
  // Coba cari variasi lain
  var idx = content.indexOf('console.error(\'[AUTH CHECK] User not admin');
  if (idx !== -1) {
    console.log('Found orphaned code at index', idx);
    // Hapus dari sini sampai sebelum "// Store user and token"
    var storeIdx = content.indexOf('// Store user and token globally', idx);
    if (storeIdx !== -1) {
      var before = content.substring(0, idx).trimEnd();
      var after = content.substring(storeIdx).trimStart();
      content = before + '\n\n' + after;
      console.log('Orphaned code: REMOVED (variant)');
    }
  }
}

fs.writeFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', content);
console.log('admin-dashboard.html saved');