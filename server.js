const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Outscraper API Key
const OUTSCRAPER_API_KEY = 'ZDM0ZTJiODBhZDE3NDk2YTgwZDBjMTc0ODg4MGMxMGN8ZmZhZDM4Y2EyNw';

// Test endpoint for reviews
app.get('/api/test-reviews', async (req, res) => {
  try {
    console.log('Testing reviews API with direct place_id...');
    
    // Use a known good place_id for testing
    const placeId = 'ChIJ8f6CLLcbiYgRfUvF6UFcazU';
    
    // Create a custom https agent to handle SSL issues
    const https = require('https');
    const agent = new https.Agent({  
      rejectUnauthorized: false,
      secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
    });
    
    const reviewsResponse = await axios.post(
      'https://api.outscraper.com/api/v1/google-maps/reviews-v3',
      {
        query: [placeId],
        limit: 5,
        async: false
      },
      {
        headers: {
          'X-API-KEY': OUTSCRAPER_API_KEY,
          'Accept': 'application/json'
        },
        httpsAgent: agent
      }
    );
    
    console.log('Reviews API test response:', JSON.stringify(reviewsResponse.data));
    
    res.json({ success: true, data: reviewsResponse.data });
  } catch (error) {
    console.error('Error in test-reviews:', error.response?.data || error.message);
    res.status(500).json({ error: 'Test failed', details: error.response?.data || error.message });
  }
});

// Test endpoint for photos
app.get('/api/test-photos', async (req, res) => {
  try {
    console.log('Testing photos API with direct place_id...');
    
    // Use a known good place_id for testing
    const placeId = 'ChIJ8f6CLLcbiYgRfUvF6UFcazU';
    
    // Create a custom https agent to handle SSL issues
    const https = require('https');
    const agent = new https.Agent({  
      rejectUnauthorized: false,
      secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
    });
    
    const photosResponse = await axios.post(
      'https://api.outscraper.com/api/v1/google-maps/photos',
      {
        query: [placeId],
        async: false
      },
      {
        headers: {
          'X-API-KEY': OUTSCRAPER_API_KEY,
          'Accept': 'application/json'
        },
        httpsAgent: agent
      }
    );
    
    console.log('Photos API test response:', JSON.stringify(photosResponse.data));
    
    res.json({ success: true, data: photosResponse.data });
  } catch (error) {
    console.error('Error in test-photos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Test failed', details: error.response?.data || error.message });
  }
});

// Middleware for parsing JSON
app.use(express.json());

// Middleware to fix ordering issue - these need to come BEFORE route definitions
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to save customization
app.post('/api/save-customization', (req, res) => {
  try {
    const { slug, customization } = req.body;
    
    if (!slug) {
      return res.status(400).json({ error: 'Business slug is required' });
    }
    
    // Read the current businesses.json file
    const businessesPath = path.join(__dirname, 'public', 'businesses.json');
    const businessesData = fs.readFileSync(businessesPath, 'utf8');
    const businesses = JSON.parse(businessesData);
    
    // Find the business with the matching slug
    const businessIndex = businesses.findIndex(b => b.slug === slug);
    
    if (businessIndex === -1) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Update the customization
    businesses[businessIndex].customization = customization;
    
    // Write the updated businesses back to the file
    fs.writeFileSync(businessesPath, JSON.stringify(businesses, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving customization:', error);
    res.status(500).json({ error: 'Failed to save customization' });
  }
});

// API endpoint to fetch reviews from local JSON file
app.post('/api/fetch-reviews', (req, res) => {
  try {
    const { slug } = req.body;
    
    if (!slug) {
      return res.status(400).json({ error: 'Business slug is required' });
    }
    
    console.log(`Loading reviews from local file for business: ${slug}`);
    
    // Read the current businesses.json file
    const businessesPath = path.join(__dirname, 'public', 'businesses.json');
    const businessesData = fs.readFileSync(businessesPath, 'utf8');
    const businesses = JSON.parse(businessesData);
    
    // Find the business with the matching slug
    const businessIndex = businesses.findIndex(b => b.slug === slug);
    
    if (businessIndex === -1) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Check if the reviews JSON file exists
    const reviewsFilePath = path.join(__dirname, 'public', 'data', `${slug}-reviews.json`);
    
    if (!fs.existsSync(reviewsFilePath)) {
      return res.status(404).json({ 
        error: 'Reviews file not found', 
        details: `Please create a file at ${reviewsFilePath} with the review data from Outscraper` 
      });
    }
    
    // Read and parse the reviews file
    const reviewsData = JSON.parse(fs.readFileSync(reviewsFilePath, 'utf8'));
    
    // Update the business with reviews data
    businesses[businessIndex].reviewsData = reviewsData;
    
    // Write the updated businesses back to the file
    fs.writeFileSync(businessesPath, JSON.stringify(businesses, null, 2));
    
    res.json({ 
      success: true, 
      reviews: businesses[businessIndex].reviewsData
    });
  } catch (error) {
    console.error('Error loading reviews from file:', error.message);
    res.status(500).json({ error: 'Failed to load reviews from file' });
  }
});

// API endpoint to fetch photos from local JSON file
app.post('/api/fetch-photos', (req, res) => {
  try {
    const { slug } = req.body;
    
    if (!slug) {
      return res.status(400).json({ error: 'Business slug is required' });
    }
    
    console.log(`Loading photos from local file for business: ${slug}`);
    
    // Read the current businesses.json file
    const businessesPath = path.join(__dirname, 'public', 'businesses.json');
    const businessesData = fs.readFileSync(businessesPath, 'utf8');
    const businesses = JSON.parse(businessesData);
    
    // Find the business with the matching slug
    const businessIndex = businesses.findIndex(b => b.slug === slug);
    
    if (businessIndex === -1) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Check if the photos JSON file exists
    const photosFilePath = path.join(__dirname, 'public', 'data', `${slug}-photos.json`);
    
    if (!fs.existsSync(photosFilePath)) {
      return res.status(404).json({ 
        error: 'Photos file not found', 
        details: `Please create a file at ${photosFilePath} with the photo data from Outscraper` 
      });
    }
    
    // Read and parse the photos file
    const photosData = JSON.parse(fs.readFileSync(photosFilePath, 'utf8'));
    
    // Update the business with photos data
    businesses[businessIndex].photosData = photosData;
    
    // Write the updated businesses back to the file
    fs.writeFileSync(businessesPath, JSON.stringify(businesses, null, 2));
    
    res.json({ 
      success: true, 
      photos: businesses[businessIndex].photosData
    });
  } catch (error) {
    console.error('Error loading photos from file:', error.message);
    res.status(500).json({ error: 'Failed to load photos from file' });
  }
});

// IMPORTANT: Define specific routes BEFORE the catch-all route

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Business admin route
app.get('/:slug/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all route - MUST be last
app.get('*', (req, res) => {
  // Check if the path includes a file extension
  const hasExtension = req.path.includes('.');
  
  // If it has extension, let express.static handle it
  if (hasExtension) {
    return res.status(404).send('File not found');
  }
  
  // Otherwise serve index.html for client-side routing
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin page available at http://localhost:${PORT}/admin`);
});