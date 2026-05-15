const fs = require('fs');

// Check for HTML/JavaScript parsing issues around line 491
const content = fs.readFileSync('public/admin-dashboard.html', 'utf8');
const lines = content.split('\n');

// Check line 491 and surrounding context
console.log('=== Line 491 Analysis ===');
console.log('Line 491:', lines[490]); // 0-indexed

// Check for script tags and brackets around this area
console.log('\n=== Script and Bracket Analysis ===');

let openBraces = 0, openParens = 0, openBrackets = 0;
let inScript = false;
let scriptStart = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Track script tags
  if (line.includes('<script')) {
    inScript = true;
    scriptStart = i + 1;
    console.log(`Script starts at line ${i + 1}`);
  }
  if (line.includes('</script>')) {
    console.log(`Script ends at line ${i + 1} (started at line ${scriptStart})`);
    inScript = false;
  }

  // Check brackets only in script context
  if (inScript) {
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      switch (char) {
        case '{': openBraces++; break;
        case '}': openBraces--; break;
        case '(': openParens++; break;
        case ')': openParens--; break;
        case '[': openBrackets++; break;
        case ']': openBrackets--; break;
      }
    }

    // Check for await usage
    if (line.includes('await')) {
      console.log(`Await found at line ${i + 1}: ${line.trim()}`);
    }
  }

  // Focus on area around line 491
  if (i >= 485 && i <= 495) {
    console.log(`Line ${i + 1}: ${line}`);
  }
}

console.log(`\nFinal bracket counts - Braces: ${openBraces}, Parens: ${openParens}, Brackets: ${openBrackets}`);

// Check for unclosed templates or quotes
let templateDepth = 0;
let singleQuotes = 0, doubleQuotes = 0, backticks = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  switch (char) {
    case '`': backticks++; break;
    case "'": singleQuotes++; break;
    case '"': doubleQuotes++; break;
  }
}

console.log(`\nQuote/Template analysis:`);
console.log(`Backticks: ${backticks} (should be even)`);
console.log(`Single quotes: ${singleQuotes} (should be even)`);
console.log(`Double quotes: ${doubleQuotes} (should be even)`);