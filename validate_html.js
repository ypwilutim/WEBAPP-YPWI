const fs = require('fs');
const content = fs.readFileSync('E:/YPWI ABSENSI/public/admin-dashboard.html', 'utf8');

// Check for duplicate IDs
const idRegex = /id="([^"]+)"/g;
const ids = [];
let match;
while ((match = idRegex.exec(content)) !== null) {
  ids.push(match[1]);
}
const idCounts = {};
ids.forEach(function(id) { idCounts[id] = (idCounts[id] || 0) + 1; });
const dups = Object.entries(idCounts).filter(function(entry) { return entry[1] > 1; });
if (dups.length > 0) {
  console.log('Duplicate IDs:');
  dups.forEach(function(entry) { console.log('  ' + entry[0] + ': ' + entry[1] + ' times'); });
} else {
  console.log('No duplicate IDs found');
}

// Count tags
const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;
console.log('Div open: ' + openDivs + ', close: ' + closeDivs);

const openScripts = (content.match(/<script/g) || []).length;
const closeScripts = (content.match(/<\/script>/g) || []).length;
console.log('Script open: ' + openScripts + ', close: ' + closeScripts);

const openForms = (content.match(/<form/g) || []).length;
const closeForms = (content.match(/<\/form>/g) || []).length;
console.log('Form open: ' + openForms + ', close: ' + closeForms);

// Check for img without closing
const imgTags = (content.match(/<img/g) || []).length;
console.log('Img tags: ' + imgTags);

// Check unclosed tags
const liOpens = (content.match(/<li/g) || []).length;
const liCloses = (content.match(/<\/li>/g) || []).length;
console.log('Li open: ' + liOpens + ', close: ' + liCloses);