const { exec } = require('child_process');

const apiKey = 'ZDM0ZTJiODBhZDE3NDk2YTgwZDBjMTc0ODg4MGMxMGN8ZmZhZDM4Y2EyNw';
const requestId = '20250320004518xs6f';

// Construct the curl command
const curlCommand = `curl -s -X GET "https://api.outscraper.com/api/v1/requests/${requestId}" -H "X-API-KEY: ${apiKey}" -k`;

// Execute the curl command
exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing curl: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Curl stderr: ${stderr}`);
    return;
  }
  
  console.log('Response received successfully');
  
  try {
    // Parse the JSON response
    const response = JSON.parse(stdout);
    console.log('Response status:', response.status);
    console.log('Response data summary:', JSON.stringify({
      id: response.id,
      status: response.status,
      data_count: response.data ? response.data.length : 0
    }));
    
    // Extract and display reviews if available
    if (response.data && response.data.length > 0) {
      const placeData = response.data[0];
      if (placeData.reviews_data) {
        console.log(`Found ${placeData.reviews_data.length} reviews`);
        if (placeData.reviews_data.length > 0) {
          const firstReview = placeData.reviews_data[0];
          console.log('Sample review:', {
            author: firstReview.author_name,
            rating: firstReview.rating,
            text_snippet: firstReview.text ? firstReview.text.substring(0, 100) + '...' : 'No text'
          });
        }
      } else {
        console.log('No reviews data found in the response');
      }
    } else {
      console.log('No data found in the response');
    }
  } catch (parseError) {
    console.error('Error parsing response:', parseError);
    console.log('Raw response:', stdout);
  }
});