const fs = require('fs');
const lines = fs.readFileSync('public/admin-dashboard.html', 'utf8').split('\n');
const startLine = 1514;
const endLine = 1620;
let depth = 0;
for (let i = startLine - 1; i < endLine; i++) {
  const lineNum = i + 1;
  const line = lines[i];
  // Compute depth before this line
  const before = depth;
  // Count braces in the line
  for (const ch of line) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  console.log(`${lineNum}: before=${before} after=${depth}  ${line}`);
}
