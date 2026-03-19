// Test script to check stations API
async function testStationsAPI() {
  try {
    // Test with different user roles
    const testCases = [
      { user_id: 1, role: '5' }, // Admin
      { user_id: 2, role: '2' }, // Incharge
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTesting with user_id: ${testCase.user_id}, role: ${testCase.role}`);
      
      const response = await fetch(`http://localhost:3000/api/stations?user_id=${testCase.user_id}&role=${testCase.role}`);
      const data = await response.json();
      
      console.log('Response:', data);
      
      if (data.success && data.stations) {
        console.log(`Found ${data.stations.length} stations:`);
        data.stations.forEach((station, index) => {
          console.log(`${index + 1}. ID: ${station.id}, Name: ${station.station_name}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testStationsAPI();
