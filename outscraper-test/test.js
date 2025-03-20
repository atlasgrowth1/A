const axios = require('axios');
const https = require('https');

const apiKey = 'ZDM0ZTJiODBhZDE3NDk2YTgwZDBjMTc0ODg4MGMxMGN8ZmZhZDM4Y2EyNw';
const requestId = '20250320004518xs6f';

// Create a custom https agent with relaxed settings
const agent = new https.Agent({
  rejectUnauthorized: false,
  secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
});

// Fetch request results using the request ID
async function fetchRequestResults() {
  try {
    console.log(`Fetching request results for ID: ${requestId}`);
    
    const response = await axios.get(
      `https://api.outscraper.com/api/v1/requests/${requestId}`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json'
        },
        httpsAgent: agent
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Extract and display reviews if available
    if (response.data && response.data.data && response.data.data.length > 0) {
      const placeData = response.data.data[0];
      if (placeData.reviews_data) {
        console.log(`Found ${placeData.reviews_data.length} reviews`);
        console.log('First review:', JSON.stringify(placeData.reviews_data[0], null, 2));
      }
    }
  } catch (error) {
    console.error('Error fetching request results:');
    if (error.response) {
      // Server responded with a non-2xx status
      console.error('Server response:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Error in setting up the request
      console.error('Request setup error:', error.message);
    }
    console.error('Full error:', error);
  }
}

// Execute the function
fetchRequestResults();