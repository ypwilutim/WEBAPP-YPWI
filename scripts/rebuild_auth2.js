const fs = require('fs');
let content = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');

// Cari dan ganti fungsi checkAuthentication
var startMarker = 'function checkAuthentication() {';
var startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.log('ERROR: function checkAuthentication tidak ditemukan');
  process.exit(1);
}

// Cari akhir fungsi - // Run authentication check
var endMarker = '\n// Run authentication check';
var endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.log('ERROR: // Run authentication check tidak ditemukan');
  process.exit(1);
}

var newFunction = `// Authentication check with better error handling
     function checkAuthentication() {
       try {
         const token = localStorage.getItem('token');
         const userData = localStorage.getItem('user');

         console.log('[AUTH] Token exists:', !!token);
         console.log('[AUTH] User data exists:', !!userData);

         if (!token) {
           console.error('[AUTH] No token found, redirecting to login');
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }

         let user;
         try {
           user = JSON.parse(userData || '{}');
           console.log('[AUTH] Parsed user:', user);
         } catch (parseError) {
           console.error('[AUTH] Failed to parse user data:', parseError);
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }

         // Decode JWT payload to get assignments for admin school access
         try {
           var payload = JSON.parse(atob(token.split('.')[1]));
           console.log('[AUTH] JWT payload:', payload);
           window.tokenPayload = payload;
         } catch (e) {
           console.warn('[AUTH] Could not decode JWT payload');
           window.tokenPayload = {};
         }

         // Cek apakah user boleh akses: role=admin ATAU punya assignment admin/TU/operator
         var isAdmin = false;
         if (user && user.role === 'admin') {
           isAdmin = true;
         } else if (user && (user.role === 'guru' || user.role === 'operator')) {
           var assignments = (window.tokenPayload || {}).assignments || [];
           var adminRoles = ['admin', 'tu', 'tatausaha', 'operator'];
           var hasAdminAssignment = assignments.some(function(a) {
             var jabatan = (a.jabatan_di_unit || '').toLowerCase().replace(/\\s/g, '');
             return adminRoles.indexOf(jabatan) !== -1;
           });
           if (hasAdminAssignment) {
             isAdmin = true;
             console.log('[AUTH] Guru dengan jabatan admin/TU/operator ditemukan');
           }
         }

         if (!isAdmin) {
           console.error('[AUTH] User tidak memiliki akses admin sekolah. Role:', user ? user.role : 'unknown');
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }

         // Store user and token globally for page access
         currentUser = user;
         authToken = token;
         console.log('[AUTH] Auth success:', user.username, 'Role:', user.role);

       } catch (error) {
         console.error('[AUTH] Unexpected error during authentication:', error);
         localStorage.clear();
         window.location.replace('login.html');
       }
     }

`;

var newContent = content.substring(0, startIdx) + newFunction + content.substring(endIdx);
fs.writeFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', newContent);
console.log('checkAuthentication: REBUILT');

// Verifikasi
var final = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');
if (final.includes('Cek apakah user boleh akses: role=admin ATAU')) {
  console.log('VERIFIED: checkAuthentication updated correctly');
} else {
  console.log('WARNING: Verification failed');
}