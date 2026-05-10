const fs = require('fs');
const lines = fs.readFileSync('public/admin-dashboard.html', 'utf8').split('\n');
const start = 1513; // 0-indexed? line 1514 is index 1513
const end = 1616;
let depth = 0;
for (let i = start; i <= end; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  // Count opening and closing braces ignoring those in strings/comments? simplified
  for (const ch of line) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  console.log(`${i+1}: depth=${depth} ${line}`);
}
