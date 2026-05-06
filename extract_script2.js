const fs = require('fs');

// Extract script 2 from dashboard.html
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let scriptCount = 0;

while ((match = scriptRegex.exec(content)) !== null) {
  scriptCount++;

  if (scriptCount === 2) { // Script kedua (bukan module)
    const scriptContent = match[1];
    console.log('Script 2 extracted, length:', scriptContent.length);

    // Save to file for manual inspection
    fs.writeFileSync('script2.js', scriptContent);
    console.log('Script saved to script2.js for inspection');

    // Try basic syntax check
    try {
      new Function(scriptContent);
      console.log('✅ Script 2 syntax OK');
    } catch (e) {
      console.log('❌ Script 2 syntax error:', e.message);

      // Find the 'else' that's causing issues
      const lines = scriptContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('else')) {
          console.log(`Found 'else' at line ${i + 1}: ${lines[i].trim()}`);
        }
      }

      // Check for unmatched braces around error area
      const errorArea = lines.slice(Math.max(0, lines.length - 20), lines.length);
      console.log('\nLast 20 lines of script:');
      errorArea.forEach((line, idx) => {
        console.log(`${lines.length - 20 + idx + 1}: ${line}`);
      });
    }
    break;
  }
}