const fs = require('fs');
try {
  const content = fs.readFileSync('server.js', 'utf8');
  console.log('server.js length:', content.length);
  // Cek struktur dasar
  const checks = [
    { name: 'Express', ok: /require\s*\(\s*['"]express['"]\s*\)/.test(content) },
    { name: 'Login POST route', ok: /app\.post\(\s*['"]\/api\/login['"]/.test(content) },
    { name: 'Bcrypt compare', ok: /bcrypt\.compare/.test(content) },
    { name: 'Logger loginDebug', ok: /logger\.loginDebug/.test(content) },
    { name: 'Admin summary', ok: /\/api\/admin\/summary/.test(content) },
    { name: 'Admin teachers', ok: /\/api\/admin\/teachers/.test(content) },
    { name: 'Teachers table query', ok: /SELECT[^;]*FROM teachers/i.test(content) },
    { name: 'Count with alias total', ok: /SELECT COUNT\(\*\) as total FROM teachers/.test(content) },
    { name: 'Express static', ok: /express\.static/.test(content) },
  ];
  let pass = 0;
  checks.forEach(c => {
    console.log(`${c.ok ? '✓' : '✗'} ${c.name}`);
    if (c.ok) pass++;
  });
  console.log(`\n${pass}/${checks.length} passed`);
  process.exit(pass === checks.length ? 0 : 1);
} catch(e) {
  console.error('Error:', e.message);
  process.exit(1);
}
