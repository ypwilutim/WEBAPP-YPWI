const fs = require('fs');

// Extract the main script (type="module") from dashboard.html
const content = fs.readFileSync('public/admin-dashboard.html', 'utf8');
const moduleScriptRegex = /<script type="module">([\s\S]*?)<\/script>/;
const match = content.match(moduleScriptRegex);

if (match) {
  const scriptContent = match[1];
  console.log('Main script extracted, length:', scriptContent.length);

  // Write to file for testing
  fs.writeFileSync('main_script.js', scriptContent);
  console.log('Script written to main_script.js');

  // Test syntax
  try {
    new Function(scriptContent);
    console.log('✅ Syntax OK');
  } catch (e) {
    console.log('❌ Syntax Error:', e.message);
    console.log('Line:', e.lineNumber);

    // Show problematic area
    const lines = scriptContent.split('\n');
    const errorLine = e.lineNumber - 1;
    console.log('\nProblematic area:');
    for (let i = Math.max(0, errorLine - 3); i <= Math.min(lines.length - 1, errorLine + 3); i++) {
      const marker = i === errorLine ? '>>>' : '   ';
      console.log(`${marker} Line ${i + 1}: ${lines[i]}`);
    }
  }
} else {
  console.log('No module script found');
}