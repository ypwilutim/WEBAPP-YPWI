const fs = require('fs');
let content = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');

// Hapus baris-baris orphaned antara "if (!isAdmin)" dan "// Store user and token"
var pattern = /if\s\(!isAdmin\)\s\{[\s\S]*?return;\s*\}\s*\n\s*console\.error\('\x1b\[.*?redirecting.*?User role.*?localStorage\.clear\(\);\s*\n\s*window\.location\.replace\('login\.html'\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*\/\/ Store user and token/;

var newContent = content.replace(pattern, function(match) {
  // Cari posisi "if (!isAdmin)" sampai "return;" terakhirnya
  var idx = content.indexOf('if (!isAdmin) {');
  if (idx === -1) return match;

  // Cari "return;" setelah if block
  var afterIf = content.indexOf('return;\n', idx);
  if (afterIf === -1) return match;

  // Cari awal kode orphaned (console.error setelah return)
  var orphanedStart = content.indexOf('\n           console.error', afterIf);
  if (orphanedStart === -1) return match;

  // Cari akhir kode orphaned (sebelum "// Store user")
  var orphanedEnd = content.indexOf('\n         // Store user', orphanedStart);
  if (orphanedEnd === -1) orphanedEnd = content.indexOf('\n\n         // Store user', orphanedStart);
  if (orphanedEnd === -1) return match;

  // Buang kode orphaned, sisakan newline sebelum "// Store user"
  return content.substring(idx, afterIf + 8) + '\n\n' + content.substring(orphanedEnd + 1);
});

if (newContent !== content) {
  fs.writeFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', newContent);
  console.log('Orphaned code: REMOVED');
} else {
  // Fallback: hapus manual dengan regex sederhana
  // Cari pola tepat dari setelah "return;" sampai "// Store user"
  var fallback = content.replace(
    /(return;\s*\n\s*\}\s*\n)\s*console\.error\('\x1b\[[^\]]*\].*?redirecting.*?User role[^;]*;\s*\n\s*localStorage\.clear\(\);\s*\n\s*window\.location\.replace\('login\.html'\);\s*\n\s*return;\s*\n\s*\}\s*\n/,
    '$1'
  );

  if (fallback !== content) {
    fs.writeFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', fallback);
    console.log('Orphaned code: REMOVED (fallback)');
  } else {
    console.log('Trying manual removal...');
    // Manual: cari baris dan hapus
    var lines = content.split('\n');
    var newLines = [];
    var skipUntilStoreUser = false;

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].includes('console.error') &&
          (lines[i].includes('[AUTH CHECK] User not admin') || lines[i].includes('redirecting to login'))) {
        skipUntilStoreUser = true;
        continue;
      }
      if (skipUntilStoreUser && lines[i].includes('// Store user and token')) {
        skipUntilStoreUser = false;
        // Jangan push "}" sebelumnya - cari tahu apakah kita perlu menambahkannya
        // Tambah baris "}" sebelum "// Store user" karena itu penutup try
      }
      if (skipUntilStoreUser) {
        continue;
      }
      newLines.push(lines[i]);
    }

    fs.writeFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', newLines.join('\n'));
    console.log('Orphaned code: REMOVED (manual)');
  }
}

// Verifikasi tidak ada syntax error
var final = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');
try {
  new Function(final.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  console.log('VERIFIED: No syntax errors');
} catch(e) {
  console.log('SYNTAX WARNING:', e.message);
}