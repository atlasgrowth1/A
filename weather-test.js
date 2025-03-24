const axios = require('axios');

// The business slug to test with
const businessSlug = 'stegallheatingairconditioningandplumbing';

// Function to test the weather API
async function testWeatherAPI() {
  try {
    console.log(`Testing weather API for business slug: ${businessSlug}`);
    
    // Make request to the weather API endpoint
    const response = await axios.get(`http://localhost:3000/api/weather/${businessSlug}`);
    
    // Log the basic structure of the response (not the entire data which could be large)
    console.log('API Response Status:', response.status);
    console.log('Response includes current weather:', !!response.data.current);
    console.log('Response includes daily forecast:', !!response.data.daily);
    console.log('Response includes HVAC demand:', !!response.data.hvac_demand);
    
    // Log current temperature and conditions
    if (response.data.current) {
      console.log('\nCurrent Weather:');
      console.log(`Temperature: ${response.data.current.temp}°F`);
      console.log(`Feels Like: ${response.data.current.feels_like}°F`);
      console.log(`Humidity: ${response.data.current.humidity}%`);
      console.log(`Conditions: ${response.data.current.weather[0].main}`);
    }
    
    // Log the HVAC demand if available
    if (response.data.hvac_demand) {
      console.log('\nHVAC Demand (0-10 scale):');
      console.log('Cooling Demand:', response.data.hvac_demand.cooling.join(', '));
      console.log('Heating Demand:', response.data.hvac_demand.heating.join(', '));
      
      console.log('\nMaintenance Tips:');
      response.data.hvac_demand.maintenance_tips.forEach(tip => {
        console.log(`- [${tip.type}] ${tip.message} (Priority: ${tip.priority})`);
      });
    }
    
    // If there are any weather alerts, log them
    if (response.data.alerts && response.data.alerts.length > 0) {
      console.log('\nWeather Alerts:');
      response.data.alerts.forEach((alert, index) => {
        console.log(`Alert ${index + 1}: ${alert.event}`);
      });
    } else {
      console.log('\nNo weather alerts at this time.');
    }
    
    console.log('\nWeather API test completed successfully');
  } catch (error) {
    console.error('Error testing weather API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    }
  }
}

// Run the test
testWeatherAPI();