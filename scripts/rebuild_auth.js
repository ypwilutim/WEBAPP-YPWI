const fs = require('fs');
let content = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');

// Cek apakah masih rusak
if (content.includes('if (!token) {\n         // Store user and token globally')) {
  console.log('WARNING: checkAuthentication TERPOTONG, perlu rebuild');

  // Cari posisi function checkAuthentication
  var funcStart = content.indexOf('function checkAuthentication() {');
  var funcEnd = content.indexOf('// Run authentication check');

  if (funcStart === -1) {
    console.log('ERROR: Tidak menemukan function checkAuthentication');
    process.exit(1);
  }

  // Jika funcEnd tidak ditemukan, cari checkAuthentication();
  if (funcEnd === -1) {
    funcEnd = content.indexOf('checkAuthentication();');
    if (funcEnd === -1) {
      console.log('ERROR: Tidak menemukan pemanggilan checkAuthentication');
      process.exit(1);
    }
    // Geser mundur untuk dapat "\n" sebelum fungsi
    funcEnd = content.lastIndexOf('\n', funcEnd - 1) + 1;
  }

  var newFunction = `// Authentication check with better error handling
     function checkAuthentication() {
       try {
         const token = localStorage.getItem('token');
         const userData = localStorage.getItem('user');

         console.log('[AUTH CHECK] Token exists:', !!token);
         console.log('[AUTH CHECK] User data exists:', !!userData);

         if (!token) {
           console.error('[AUTH CHECK] No token found, redirecting to login');
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }

         let user;
         try {
           user = JSON.parse(userData || '{}');
           console.log('[AUTH CHECK] Parsed user:', user);
         } catch (parseError) {
           console.error('[AUTH CHECK] Failed to parse user data:', parseError);
           localStorage.clear();
           window.location.replace('login.html');
           return;
         }

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

         // Store user and token globally for page access
         currentUser = user;
         authToken = token;
         console.log('[AUTH CHECK] Authentication successful:', user.username, 'Role:', user.role);

       } catch (error) {
         console.error('[AUTH CHECK] Unexpected error during authentication:', error);
         localStorage.clear();
         window.location.replace('login.html');
       }
     }

`;

  content = content.substring(0, funcStart) + newFunction + content.substring(funcEnd);

  fs.writeFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', content);
  console.log('checkAuthentication: REBUILT');
} else {
  console.log('checkAuthentication: Tidak ada masalah terdeteksi');
}

// Verifikasi tidak ada syntax error
var final = fs.readFileSync('E:\\YPWI ABSENSI\\public\\admin-dashboard.html', 'utf8');
try {
  new Function(final.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  console.log('VERIFIED: No syntax errors');
} catch(e) {
  console.log('SYNTAX WARNING:', e.message);
}
console.log('Done');