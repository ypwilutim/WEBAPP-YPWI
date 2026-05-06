// Test template rendering with sample data
const testData = [
  {
    tenant_id: "SDIT",
    nama_sekolah: "SDIT WAHDAH ISLAMIYAH",
    latitude: "-3.79560000",
    longitude: "119.65210000",
    location_radius: 200,
    location_name: "Lokasi Sekolah SDIT WAHDAH ISLAMIYAH"
  },
  {
    tenant_id: "PPIB",
    nama_sekolah: "PONDOK PESANTREN INFORMATIKA DAN BAHASA WAHDAH ISLAMIYAH",
    latitude: null,
    longitude: null,
    location_radius: 100,
    location_name: null
  }
];

// Simulate template rendering
console.log('Testing template rendering...\n');

testData.forEach(tenant => {
  console.log(`Tenant: ${tenant.nama_sekolah}`);
  console.log(`Latitude: ${tenant.latitude ? parseFloat(tenant.latitude).toFixed(6) : 'Belum diatur'}`);
  console.log(`Longitude: ${tenant.longitude ? parseFloat(tenant.longitude).toFixed(6) : 'Belum diatur'}`);
  console.log(`Radius: ${tenant.location_radius || 100}m`);
  console.log(`Status: ${tenant.latitude && tenant.longitude ? 'Configured' : 'Not Set'}`);
  console.log('---');
});