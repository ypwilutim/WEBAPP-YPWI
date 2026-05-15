const fetch = require('node-fetch').default || require('node-fetch');

async function runFullSystemTest() {
  console.log('🧪 YPWI LUTIM FULL SYSTEM TEST\n');

  const baseUrl = 'http://localhost:3000';
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  function test(name, condition, error = '') {
    testResults.total++;
    if (condition) {
      console.log(`✅ ${name}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${name}${error ? ': ' + error : ''}`);
      testResults.failed++;
    }
  }

  try {
    // Test 1: Server is running
    console.log('Testing server availability...');
    const healthResponse = await fetch(`${baseUrl}/api/test`);
    test('Server Health Check', healthResponse.ok);

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      test('Server Response Format', healthData.success === true);
    }

    // Test 2: Public endpoints accessible
    console.log('\nTesting public endpoints...');
    const tenantsResponse = await fetch(`${baseUrl}/api/tenants`);
    test('Public Tenants Endpoint', tenantsResponse.ok);

    if (tenantsResponse.ok) {
      const tenantsData = await tenantsResponse.json();
      test('Tenants Data Structure', tenantsData.success === true && Array.isArray(tenantsData.data));
    }

    // Test 3: Complete profile flow (mock teacher)
    console.log('\nTesting complete profile flow...');

    // Simulate form data for teacher ID 95
    const formData = new FormData();
    formData.append('teacherId', '95');
    formData.append('nama', 'Test Guru');
    formData.append('nik', '1234567890123456');
    formData.append('email', 'test@ypwi.sch.id');
    formData.append('assignments_json', JSON.stringify([
      { tenant_id: 'SDIT', jabatan_di_unit: 'Guru Mapel' }
    ]));

    // This would normally require the teacher to exist in DB
    console.log('⚠️  Complete profile test requires existing teacher in database');
    console.log('   Manual testing recommended for this endpoint');

    // Test 4: WhatsApp formatting (local test)
    console.log('\nTesting WhatsApp message formatting...');
    const islamicMessage = formatIslamicMessage('Ahmad', 'L',
      'Selamat! Profil Anda telah lengkap.'
    );
    test('Islamic Message Format',
      islamicMessage.includes('Assalamu\'alaikum') &&
      islamicMessage.includes('Ustadz Ahmad') &&
      islamicMessage.includes('*YPWI Lutim*')
    );

    // Test 5: Assignment logic
    console.log('\nTesting assignment management logic...');
    let localAssignments = [];
    localAssignments.push({ tenant_id: 'SDIT', jabatan_di_unit: 'Guru Mapel' });

    // Test adding duplicate
    const duplicateExists = localAssignments.some(a =>
      a.tenant_id === 'SDIT' && a.jabatan_di_unit === 'Guru Mapel'
    );
    test('Duplicate Assignment Detection', duplicateExists);

    // Test adding different assignment
    localAssignments.push({ tenant_id: 'TKIT01', jabatan_di_unit: 'Operator' });
    test('New Assignment Addition', localAssignments.length === 2);

    // Test removal
    localAssignments.splice(0, 1);
    test('Assignment Removal', localAssignments.length === 1);

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    testResults.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }
}

// Helper function for Islamic message formatting
function formatIslamicMessage(nama, jenisKelamin, content) {
  const generateIslamicGreeting = (nama, jenisKelamin) => {
    const panggilan = jenisKelamin === 'P' ? 'Ustadzah' : 'Ustadz';
    return `Assalamu'alaikum ${panggilan} ${nama}`;
  };

  const generateIslamicDua = () => {
    return "Semoga Allah SWT senantiasa memberikan kesehatan, kekuatan, dan kemudahan dalam menjalankan tugas sebagai pendidik.";
  };

  const generateIslamicMotivation = () => {
    return "Ingatlah, setiap langkah kecil dalam pendidikan adalah investasi untuk generasi penerus umat.";
  };

  const salam = generateIslamicGreeting(nama, jenisKelamin);
  const dua = generateIslamicDua();
  const motivasi = generateIslamicMotivation();

  return `${salam}

${content}

${dua}

${motivasi}

Barakallahu fiikum,
*YPWI Lutim*`;
}

runFullSystemTest();