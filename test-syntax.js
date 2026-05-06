// Test syntax isolation
console.log('Testing basic syntax...');

// Test bracket matching
function testFunction() {
  if (true) {
    console.log('OK');
  }
}

console.log('✅ Basic syntax OK');
testFunction();