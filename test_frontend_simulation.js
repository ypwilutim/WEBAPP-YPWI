// Simulate frontend data processing
const simulateFrontend = async () => {
  try {
    // Simulate API response
    const mockResponse = {
      success: true,
      data: [
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
      ]
    };

    console.log('Simulating frontend data processing...\n');

    // Simulate frontend logic
    const res = mockResponse;
    console.log('Tenants API response:', res);

    if (res.success) {
      const items = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      console.log('Processed items:', items.length, 'tenants');
      console.log('First item sample:', items[0]);

      // Simulate template rendering
      console.log('\nSimulating template rendering:');
      items.forEach(tenant => {
        console.log('Rendering tenant:', tenant.nama_sekolah, 'lat:', tenant.latitude, 'lng:', tenant.longitude);

        const latitudeDisplay = tenant.latitude ? parseFloat(tenant.latitude).toFixed(6) : 'Belum diatur';
        const longitudeDisplay = tenant.longitude ? parseFloat(tenant.longitude).toFixed(6) : 'Belum diatur';
        const radiusDisplay = `${tenant.location_radius || 100}m`;

        console.log(`  Latitude: ${latitudeDisplay}`);
        console.log(`  Longitude: ${longitudeDisplay}`);
        console.log(`  Radius: ${radiusDisplay}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Simulation error:', error);
  }
};

simulateFrontend();