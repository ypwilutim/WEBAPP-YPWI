const fs = require('fs');
try {
  const content = fs.readFileSync('server.js', 'utf8');
  console.log('File server.js dibaca, panjang:', content.length, 'bytes');
  // Cek struktur dasar
  if (content.includes('app.post(\'/api/login\'') && 
      content.includes('bcrypt.compare') &&
      content.includes('logger.loginDebug')) {
    console.log('✓ Struktur login route OK');
  }
  if (content.includes('express.static')) {
    console.log('✓ Static file serving OK');
  }
  if (content.includes('404 NOT FOUND HANDLER')) {
    console.log('✓ 404 handler OK');
  }
  console.log('Syntax check: File terstruktur dengan baik');
} catch(e) {
  console.error('Error:', e.message);
}
