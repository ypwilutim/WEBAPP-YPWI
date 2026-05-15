require('dotenv').config();
const db = require('./db');

// Test hari filtering logic
function isDayMatch(ruleHari, currentDay) {
  if (!ruleHari || ruleHari.trim() === '') return true; // All days if empty

  const rule = ruleHari.toLowerCase().trim();
  const day = currentDay.toLowerCase().trim();

  // Handle range: 'senin-kamis'
  if (rule.includes('-')) {
    const [start, end] = rule.split('-').map(d => d.trim());
    const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const startIdx = days.indexOf(start);
    const endIdx = days.indexOf(end);
    const currentIdx = days.indexOf(day);

    if (startIdx === -1 || endIdx === -1 || currentIdx === -1) return false;
    return currentIdx >= startIdx && currentIdx <= endIdx;
  }

  // Handle multiple days: 'senin,rabu,kamis'
  const ruleDays = rule.split(',').map(d => d.trim());
  return ruleDays.includes(day);
}

async function testHariFiltering() {
  try {
    await db.initializeDatabase();

    console.log('🧪 Testing Hari Filtering Implementation\n');

    // Test the isDayMatch function
    console.log('Testing isDayMatch function:');
    const testCases = [
      { rule: '', day: 'senin', expected: true, desc: 'Empty rule = all days' },
      { rule: 'senin', day: 'senin', expected: true, desc: 'Single day match' },
      { rule: 'senin', day: 'selasa', expected: false, desc: 'Single day no match' },
      { rule: 'senin,rabu,kamis', day: 'rabu', expected: true, desc: 'Multiple days match' },
      { rule: 'senin,rabu,kamis', day: 'jumat', expected: false, desc: 'Multiple days no match' },
      { rule: 'senin-kamis', day: 'selasa', expected: true, desc: 'Range match' },
      { rule: 'senin-kamis', day: 'jumat', expected: false, desc: 'Range no match' },
    ];

    testCases.forEach(test => {
      const result = isDayMatch(test.rule, test.day);
      const status = result === test.expected ? '✅' : '❌';
      console.log(`${status} ${test.desc}: rule="${test.rule}" day="${test.day}" → ${result}`);
    });

    // Test database queries
    console.log('\nTesting database hari column:');
    const rules = await db.query('SELECT id, tenant_id, tipe, hari FROM attendance_rules LIMIT 3');
    console.log('Sample rules with hari:');
    rules.forEach(rule => {
      console.log(`- ID ${rule.id}: ${rule.tenant_id} ${rule.tipe} → hari: "${rule.hari || 'semua hari'}"`);
    });

    // Test current day
    const currentDay = new Date().toLocaleDateString('id-ID', { weekday: 'long' }).toLowerCase();
    console.log(`\nCurrent day: ${currentDay}`);

    console.log('\n🎉 Hari filtering test completed!');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit();
  }
}

testHariFiltering();