const fs = require('fs');

// Extract JavaScript from dashboard.html and check syntax
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let scriptCount = 0;

console.log('Checking JavaScript syntax in dashboard.html...\n');

while ((match = scriptRegex.exec(content)) !== null) {
  scriptCount++;
  const scriptContent = match[1].trim();

  console.log(`=== Script ${scriptCount} ===`);
  console.log(`Length: ${scriptContent.length} characters`);

  try {
    // Check if it's a module script
    const isModule = match[0].includes('type="module"');
    if (isModule) {
      // For module scripts, we can't directly test with new Function
      // but we can check for basic syntax issues
      console.log('Module script - checking for await outside async...');

      const lines = scriptContent.split('\n');
      let inAsyncFunction = false;
      let braceCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Track braces to detect function boundaries
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        braceCount += openBraces - closeBraces;

        // Check for async function declarations
        if (trimmed.includes('async function') || trimmed.includes('async (') || trimmed.includes('async(')) {
          inAsyncFunction = true;
        }

        // Check for function end
        if (braceCount <= 0 && inAsyncFunction) {
          inAsyncFunction = false;
        }

        // Check for await usage
        if (trimmed.includes('await') && !inAsyncFunction) {
          console.log(`❌ AWAIT OUTSIDE ASYNC at line ${i + 1}: ${trimmed}`);
          console.log(`   Current brace count: ${braceCount}`);
          console.log(`   In async function: ${inAsyncFunction}`);
          process.exit(1);
        }
      }

      console.log('✅ No await outside async functions found');
    } else {
      // Test regular script syntax
      new Function(scriptContent);
      console.log('✅ Syntax OK');
    }

  } catch (e) {
    console.log('❌ Syntax Error:', e.message);
    console.log('Line:', e.lineNumber);

    // Show problematic area
    const lines = scriptContent.split('\n');
    const errorLine = Math.max(0, e.lineNumber - 1);

    console.log('\nProblematic area:');
    for (let i = Math.max(0, errorLine - 3); i <= Math.min(lines.length - 1, errorLine + 3); i++) {
      const marker = i === errorLine ? '>>>' : '   ';
      console.log(`${marker} Line ${i + 1}: ${lines[i]}`);
    }

    process.exit(1);
  }
}

console.log(`\n✅ All ${scriptCount} scripts checked successfully!`);