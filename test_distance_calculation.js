// Test distance calculation
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
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

console.log('Testing distance calculations...\n');

// Test with real coordinates
const testCases = [
  {
    name: 'Same location',
    user: { lat: -2.64552, lng: 121.127793 },
    school: { lat: -2.64552, lng: 121.127793 },
    expected: 0
  },
  {
    name: 'Nearby location (1km)',
    user: { lat: -2.64552, lng: 121.127793 },
    school: { lat: -2.63652, lng: 121.127793 }, // Approximately 1km north
    expected: 1
  },
  {
    name: 'Different school location',
    user: { lat: -2.64552, lng: 121.127793 },
    school: { lat: -2.2166, lng: 113.9209 }, // SMPITWI01 coordinates
    expected: 700 // Approximately 700km away
  }
];

testCases.forEach(test => {
  const distance = calculateDistance(test.user.lat, test.user.lng, test.school.lat, test.school.lng);
  console.log(`${test.name}:`);
  console.log(`  User: ${test.user.lat}, ${test.user.lng}`);
  console.log(`  School: ${test.school.lat}, ${test.school.lng}`);
  console.log(`  Distance: ${distance.toFixed(2)} km (expected: ~${test.expected} km)`);
  console.log('');
});