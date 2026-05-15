const fs = require('fs');

// Extract all scripts from dashboard.html and check for syntax errors
const content = fs.readFileSync('public/admin-dashboard.html', 'utf8');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let scriptCount = 0;

console.log('Checking all scripts in dashboard.html...\n');

while ((match = scriptRegex.exec(content)) !== null) {
  scriptCount++;
  const scriptContent = match[1].trim();

  console.log(`\n=== Script ${scriptCount} ===`);
  console.log(`Length: ${scriptContent.length} characters`);

  // Check for await usage
  const awaitCount = (scriptContent.match(/\bawait\b/g) || []).length;
  console.log(`Await keywords: ${awaitCount}`);

  // Check for async function declarations
  const asyncCount = (scriptContent.match(/async\s+function/g) || []).length;
  console.log(`Async functions: ${asyncCount}`);

  try {
    new Function(scriptContent);
    console.log('✅ Syntax OK');
  } catch (e) {
    console.log('❌ Syntax Error:', e.message);
    console.log('Error at line:', e.lineNumber);

    // Show problematic area
    const lines = scriptContent.split('\n');
    const errorLine = e.lineNumber - 1;

    console.log('\nProblematic code area:');
    for (let i = Math.max(0, errorLine - 3); i <= Math.min(lines.length - 1, errorLine + 3); i++) {
      const marker = i === errorLine ? '>>>' : '   ';
      console.log(`${marker} Line ${i + 1}: ${lines[i]}`);
    }

    // Check for bracket balance
    let openBraces = 0, openParens = 0, openBrackets = 0;
    for (let i = 0; i < scriptContent.length; i++) {
      const char = scriptContent[i];
      switch (char) {
        case '{': openBraces++; break;
        case '}': openBraces--; break;
        case '(': openParens++; break;
        case ')': openParens--; break;
        case '[': openBrackets++; break;
        case ']': openBrackets--; break;
      }
    }
    console.log(`\nBracket balance - Braces: ${openBraces}, Parens: ${openParens}, Brackets: ${openBrackets}`);

    // Stop at first error
    process.exit(1);
  }
}

console.log(`\n✅ All ${scriptCount} scripts checked - no syntax errors found!`);