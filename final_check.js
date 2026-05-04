const fs = require('fs');
console.log('=== Server.js Syntax & Structure Check ===');
const content = fs.readFileSync('server.js', 'utf8');
const checks = {
  'Express loaded': content.includes('require(\'express\')'),
  'Bcrypt loaded': content.includes('require(\'bcrypt\')'),
  'Login route exists': content.includes("app.post('/api/login'"),
  'Bcrypt compare used': content.includes('bcrypt.compare'),
  'Logger integrated': content.includes('logger.loginDebug'),
  'Role check in response': content.includes("user.role === 'admin'"),
  'Role in JSON response': /role: user\.role/.test(content),
  'Tenant in JSON response': /tenant_id: user\.tenant_id/.test(content),
  'Admin summary endpoint': content.includes("/api/admin/summary'"),
  'Admin teachers endpoint': content.includes("/api/admin/teachers'"),
  'Summary uses users table': content.includes('SELECT COUNT(*) as count FROM users WHERE role = "guru"'),
  'Teachers uses users table': content.includes('SELECT id, nama, nip, username, jabatan, status_aktif, is_profile_complete FROM users WHERE role = "guru"'),
  'Express static': content.includes('express.static'),
  'Error handling in login': content.includes('BCRYPT_ERROR'),
};
let pass = 0, total = 0;
Object.entries(checks).forEach(([name, ok]) => {
  total++;
  if (ok) { console.log('✓', name); pass++; }
  else console.log('✗', name);
});
console.log(`\n${pass}/${total} checks passed`);
console.log(pass === total ? '✅ ALL CHECKS PASSED' : '⚠ SOME CHECKS FAILED');
process.exit(pass === total ? 0 : 1);
