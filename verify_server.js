try {
  const fs = require('fs');
  const path = 'E:\\\\YPWI ABSENSI\\\\server.js';
  const content = fs.readFileSync(path, 'utf8');
  console.log('File length:', content.length, 'characters');
  
  // Quick syntax checks
  const checks = [
    { name: 'Express', test: () => content.includes('express') },
    { name: 'Login route', test: () => content.includes("app.post('/api/login'") },
    { name: 'Bcrypt compare', test: () => content.includes('bcrypt.compare') },
    { name: 'Logger', test: () => content.includes('logger.loginDebug') },
    { name: 'Admin summary', test: () => content.includes("/api/admin/summary'") },
    { name: 'Admin teachers', test: () => content.includes("/api/admin/teachers'") },
    { name: 'Static files', test: () => content.includes('express.static') },
    { name: 'Role check', test: () => content.includes("user.role === 'admin'") },
    { name: 'Tenant in response', test: () => content.includes('tenant_id: user.tenant_id') },
  ];
  
  let allPass = true;
  checks.forEach(c => {
    const pass = c.test();
    console.log(`${pass ? '✓' : '✗'} ${c.name}`);
    if (!pass) allPass = false;
  });
  
  console.log(allPass ? '\nAll checks passed!' : '\nSome checks failed!');
  process.exit(allPass ? 0 : 1);
} catch(e) {
  console.error('Error:', e.message);
  process.exit(1);
}
