// Test radius validation for attendance
const testRadiusValidation = () => {
  console.log('Testing radius validation logic...\n');

  // Simulate school location (SDIT coordinates)
  const schoolLat = -2.64552;
  const schoolLng = 121.127793;
  const radius = 200; // 200 meters

  // Test cases
  const testCases = [
    {
      name: 'Within radius (50m)',
      userLat: -2.64552,
      userLng: 121.127793,
      expected: 'ALLOWED'
    },
    {
      name: 'At radius limit (200m)',
      userLat: -2.64572, // Approximately 200m north
      userLng: 121.127793,
      expected: 'ALLOWED'
    },
    {
      name: 'Outside radius (300m)',
      userLat: -2.64802, // Approximately 300m north
      userLng: 121.127793,
      expected: 'BLOCKED'
    },
    {
      name: 'Far away (5km)',
      userLat: -2.69052, // Approximately 5km north
      userLng: 121.127793,
      expected: 'BLOCKED'
    }
  ];

  // Haversine distance function
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  testCases.forEach(test => {
    const distance = calculateDistance(test.userLat, test.userLng, schoolLat, schoolLng);
    const distanceInMeters = distance * 1000;
    const isWithinRadius = distanceInMeters <= radius;

    console.log(`${test.name}:`);
    console.log(`  User: ${test.userLat}, ${test.userLng}`);
    console.log(`  School: ${schoolLat}, ${schoolLng}`);
    console.log(`  Distance: ${distanceInMeters.toFixed(0)} meters`);
    console.log(`  Radius limit: ${radius} meters`);
    console.log(`  Result: ${isWithinRadius ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Status: ${isWithinRadius === (test.expected === 'ALLOWED') ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log('');
  });
};

testRadiusValidation();