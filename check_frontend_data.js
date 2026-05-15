// Simple test to check if tenant data has location fields
const testData = {
  "success": true,
  "data": [
    {
      "tenant_id": "SDIT",
      "nama_sekolah": "SDIT WAHDAH ISLAMIYAH",
      "latitude": "-3.79560000",
      "longitude": "119.65210000",
      "location_radius": 200,
      "location_name": "Lokasi Sekolah SDIT WAHDAH ISLAMIYAH"
    },
    {
      "tenant_id": "SDITIR",
      "nama_sekolah": "SDIT INSAN RABBANI",
      "latitude": null,
      "longitude": null,
      "location_radius": 100,
      "location_name": null
    }
  ]
};

// Simulate frontend logic
console.log('Testing frontend data display logic...\n');

testData.data.forEach(tenant => {
  console.log(`Tenant: ${tenant.nama_sekolah}`);
  console.log(`Latitude: ${tenant.latitude ? parseFloat(tenant.latitude).toFixed(6) : 'Belum diatur'}`);
  console.log(`Longitude: ${tenant.longitude ? parseFloat(tenant.longitude).toFixed(6) : 'Belum diatur'}`);
  console.log(`Radius: ${tenant.location_radius || 100}m`);
  console.log(`Status: ${tenant.latitude && tenant.longitude ? 'Aktif' : 'Tidak Aktif'}`);
  console.log('---');
});