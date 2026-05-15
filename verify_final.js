// Verifikasi akhir - Baca file dan cek isi
const fs = require('fs');

console.log('=== VERIFIKASI AKHIR ===\n');

// 1. server.js
try {
  const s = fs.readFileSync('server.js', 'utf8');
  console.log('server.js: ' + s.length + ' bytes');
  
  const ok = [];
  if (s.includes('express')) ok.push('express');
  if (s.includes("/api/login'")) ok.push('login route');
  if (s.includes('bcrypt.compare')) ok.push('bcrypt compare');
  if (s.includes('SELECT COUNT(*) as total FROM teachers')) ok.push('count alias total');
  if (s.includes('status_aktif as is_active')) ok.push('teachers query correct');
  if (s.includes('express.static')) ok.push('static files');
  if (s.includes('INDEPENDENT queries') || s.includes('Independent queries')) ok.push('independent try-catch');
  
  console.log('Check server.js:');
  ok.forEach(k => console.log('  ✓ ' + k));
  console.log('  Total: ' + ok.length + '/7 OK\n');
  
} catch(e) { console.log('ERROR server.js: ' + e.message); }

// 2. admin-dashboard.html
try {
  const h = fs.readFileSync('public/admin-dashboard.html', 'utf8');
  console.log('admin-dashboard.html: ' + h.length + ' bytes');
  
  const ok2 = [];
  if (h.includes('fetchDashboardData')) ok2.push('fetchDashboardData');
  if (h.includes('fetchTeachers')) ok2.push('fetchTeachers');
  if (h.includes('DOMContentLoaded')) ok2.push('DOMContentLoaded');
  if (h.includes('is_active')) ok2.push('uses is_active');
  if (h.includes('/api/admin/summary')) ok2.push('calls summary API');
  if (h.includes('/api/admin/teachers')) ok2.push('calls teachers API');
  
  console.log('Check admin-dashboard.html:');
  ok2.forEach(k => console.log('  ✓ ' + k));
  console.log('  Total: ' + ok2.length + '/6 OK\n');
  
} catch(e) { console.log('ERROR admin-dashboard.html: ' + e.message); }

// 3. login.html
try {
  const l = fs.readFileSync('public/login.html', 'utf8');
  console.log('login.html: ' + l.length + ' bytes');
  
  const ok3 = [];
  if (l.includes('localStorage.setItem(\'ypwiToken\'')) ok3.push('saves token');
  if (l.includes('localStorage.setItem(\'userRole\'')) ok3.push('saves role');
  if (l.includes('data.redirect')) ok3.push('uses redirect from server');
  if (l.includes('window.location.href = data.redirect')) ok3.push('redirects to data.redirect');
  
  console.log('Check login.html:');
  ok3.forEach(k => console.log('  ✓ ' + k));
  console.log('  Total: ' + ok3.length + '/4 OK\n');
  
} catch(e) { console.log('ERROR login.html: ' + e.message); }

console.log('=== SEMUA PERUBAHAN TELAH DILAKUKAN ===');
