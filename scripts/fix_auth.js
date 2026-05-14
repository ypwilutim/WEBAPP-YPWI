const fs = require('fs');
const htmlFile = 'E:\\YPWI ABSENSI\\public\\admin-dashboard.html';

let content = fs.readFileSync(htmlFile, 'utf8');

// Cek apakah sudah diupdate
if (content.includes('Guru dengan jabatan admin/TU/operator')) {
  console.log('Sudah diupdate, SKIP');
  process.exit(0);
}

// Temukan dan ganti checkAuthentication
var oldPattern = "if (!user || user.role !== 'admin') {";
var newAuthCheck = `
         // Decode JWT payload to get assignments for admin school access
         try {
           var payload = JSON.parse(atob(token.split('.')[1]));
           console.log('[AUTH CHECK] JWT payload:', payload);
           window.tokenPayload = payload;
         } catch (e) {
           console.warn('[AUTH CHECK] Could not decode JWT payload');
           window.tokenPayload = {};
         }

         // Cek apakah user boleh akses: role=admin ATAU punya assignment admin/TU/operator
         var isAdmin = false;
         if (user && user.role === 'admin') {
           isAdmin = true;
         } else if (user && (user.role === 'guru' || user.role === 'operator')) {
           // Cek assignments di token payload
           var assignments = (window.tokenPayload || {}).assignments || [];
           var adminRoles = ['admin', 'tu', 'tatausaha', 'operator'];
           var hasAdminAssignment = assignments.some(function(a) {
             var jabatan = (a.jabatan_di_unit || '').toLowerCase().replace(/\\s/g, '');
             return adminRoles.indexOf(jabatan) !== -1;
           });
           if (hasAdminAssignment) {
             isAdmin = true;
             console.log('[AUTH CHECK] Guru dengan jabatan admin/TU/operator ditemukan');
           }
         }

         if (!isAdmin) {
           console.error('[AUTH CHECK] User tidak memiliki akses admin sekolah. Role:', user ? user.role : 'unknown');
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }
`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newAuthCheck);
  console.log('checkAuthentication: UPDATED');
} else {
  console.log('checkAuthentication: pattern tidak ditemukan');
}

fs.writeFileSync(htmlFile, content);

// Verifikasi
let verify = fs.readFileSync(htmlFile, 'utf8');
if (verify.includes('Guru dengan jabatan admin/TU/operator')) {
  console.log('VERIFIED: checkAuthentication sudah diperbarui');
} else {
  console.log('GAGAL: checkAuthentication TIDAK diperbarui');
}