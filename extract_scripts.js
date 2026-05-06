const fs = require('fs');

// Extract all script tags from dashboard.html
const content = fs.readFileSync('public/admin-dashboard.html', 'utf8');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let scriptCount = 0;

console.log('Extracting scripts from dashboard.html...\n');

while ((match = scriptRegex.exec(content)) !== null) {
  scriptCount++;
  const scriptContent = match[1].trim();

  console.log(`\n=== Script ${scriptCount} ===`);
  console.log(`Length: ${scriptContent.length} characters`);

  // Check for await usage
  const awaitMatches = scriptContent.match(/\bawait\b/g);
  console.log(`Await keywords found: ${awaitMatches ? awaitMatches.length : 0}`);

  // Check for async function declarations
  const asyncMatches = scriptContent.match(/async\s+function/g);
  console.log(`Async functions found: ${asyncMatches ? asyncMatches.length : 0}`);

  // Try to parse the script
  try {
    new Function(scriptContent);
    console.log('✅ Syntax OK');
  } catch (e) {
    console.log('❌ Syntax Error:', e.message);

    // Show the problematic area
    const lines = scriptContent.split('\n');
    const errorLine = e.lineNumber ? e.lineNumber - 1 : 0;

    console.log('\nProblematic area:');
    for (let i = Math.max(0, errorLine - 3); i <= Math.min(lines.length - 1, errorLine + 3); i++) {
      const marker = i === errorLine ? '>>>' : '   ';
      console.log(`${marker} Line ${i + 1}: ${lines[i]}`);
    }

    // Show await usage in problematic area
    const problematicSection = lines.slice(Math.max(0, errorLine - 5), errorLine + 5).join('\n');
    const awaitInSection = problematicSection.match(/await/g);
    console.log(`Await in problematic section: ${awaitInSection ? awaitInSection.length : 0}`);

    // Stop at first error
    break;
  }
}

console.log(`\nTotal scripts processed: ${scriptCount}`);