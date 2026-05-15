const fs = require('fs');
const path = 'E:\\YPWI ABSENSI\\public\\admin-dashboard.html';
const content = fs.readFileSync(path, 'utf8');

// Extract script blocks
const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
if (!scriptMatch) { console.log('Tidak ada tag script ditemukan'); process.exit(1); }

const lastScript = scriptMatch[scriptMatch.length - 1];
const jsCode = lastScript.replace(/<\/?script>/g, '');

// Validate JavaScript syntax
try {
  new Function(jsCode);
  console.log('Sintaks JavaScript: OK');
} catch (e) {
  console.log('Sintaks JavaScript ERROR:', e.message);
}

// Check for duplicate IDs
const idRegex = /id="([^"]+)"/g;
const ids = {};
let match;
while ((match = idRegex.exec(content)) !== null) {
  if (!ids[match[1]]) ids[match[1]] = [];
  ids[match[1]].push(match.index);
}
const dupes = Object.entries(ids).filter(function(x) { return x[1].length > 1; });
if (dupes.length === 0) {
  console.log('ID duplikat: TIDAK ADA');
} else {
  console.log('ID DUPLIKAT DITEMUKAN: ' + dupes.length);
  dupes.forEach(function(d) { console.log('  ' + d[0] + ' x' + d[1].length); });
}

// Check critical IDs
const criticalIds = [
  'tenantLocationModal', 'tenantLocationForm', 'tenantLocationTenantId',
  'latitudeInput', 'longitudeInput', 'locationMap', 'coordinates',
  'addDeviceModal', 'addDeviceForm', 'deviceTenantId',
  'mainContent', 'sidebar', 'menuToggle',
  'teacherModal', 'ruleModal', 'addDeviceModal',
  'teacherForm', 'ruleForm', 'tenantLocationForm', 'addDeviceForm'
];
console.log('\n=== Pengecekan ID Kritis ===');
criticalIds.forEach(function(id) {
  var count = ids[id] ? ids[id].length : 0;
  var status = count === 1 ? 'OK' : (count === 0 ? 'HILANG!' : 'DUPLIKAT!');
  console.log('  ' + id + ': ' + count + ' [' + status + ']');
});

// Check tag balance
var openDivs = (content.match(/<div[^/]/g) || []).length;
var closeDivs = (content.match(/<\/div>/g) || []).length;
console.log('\n=== Tag Div ===');
console.log('  Buka:', openDivs, 'Tutup:', closeDivs, openDivs === closeDivs ? 'SEIMBANG' : 'TIDAK SEIMBANG!');

var openForms = (content.match(/<form[^/]/g) || []).length;
var closeForms = (content.match(/<\/form>/g) || []).length;
console.log('\n=== Tag Form ===');
console.log('  Buka:', openForms, 'Tutup:', closeForms, openForms === closeForms ? 'SEIMBANG' : 'TIDAK SEIMBANG!');

var openSpans = (content.match(/<span[^/]/g) || []).length;
var closeSpans = (content.match(/<\/span>/g) || []).length;
console.log('\n=== Tag Span ===');
console.log('  Buka:', openSpans, 'Tutup:', closeSpans, openSpans === closeSpans ? 'SEIMBANG' : 'TIDAK SEIMBANG!');

// Check for duplicate function declarations
const funcRegex = /^\s+function\s+(\w+)\s*\(/gm;
const funcs = {};
let funcMatch;
while ((funcMatch = funcRegex.exec(content)) !== null) {
  if (!funcs[funcMatch[1]]) funcs[funcMatch[1]] = [];
  funcs[funcMatch[1]].push(funcMatch.index);
}
const funcDupes = Object.entries(funcs).filter(function(x) { return x[1].length > 1; });
if (funcDupes.length === 0) {
  console.log('\nDeklarasi fungsi duplikat: TIDAK ADA');
} else {
  console.log('\n=== Deklarasi Fungsi DUPLIKAT ===');
  funcDupes.forEach(function(d) { console.log('  ' + d[0] + ' x' + d[1].length); });
}

// Check for duplicate async function declarations
const asyncFuncRegex = /^\s+async\s+function\s+(\w+)\s*\(/gm;
const asyncFuncs = {};
let asyncMatch;
while ((asyncMatch = asyncFuncRegex.exec(content)) !== null) {
  if (!asyncFuncs[asyncMatch[1]]) asyncFuncs[asyncMatch[1]] = [];
  asyncFuncs[asyncMatch[1]].push(asyncMatch.index);
}
const asyncFuncDupes = Object.entries(asyncFuncs).filter(function(x) { return x[1].length > 1; });
if (asyncFuncDupes.length === 0) {
  console.log('Deklarasi async fungsi duplikat: TIDAK ADA');
} else {
  console.log('\n=== Deklarasi Async Fungsi DUPLIKAT ===');
  asyncFuncDupes.forEach(function(d) { console.log('  ' + d[0] + ' x' + d[1].length); });
}

console.log('\n=== Selesai ===');