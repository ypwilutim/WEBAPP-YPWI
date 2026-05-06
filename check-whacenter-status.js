// Check whacenter service status
const checkWhacenterStatus = async () => {
  const endpoints = [
    'https://app.whacenter.id',
    'https://whacenter.id',
    'https://api.whacenter.id',
    'https://app.whacenter.id/api/send'
  ];

  console.log('Checking whacenter service availability...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'HEAD', // Just check if reachable
        timeout: 5000
      });

      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
    console.log('');
  }
};

checkWhacenterStatus();