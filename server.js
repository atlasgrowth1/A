const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded business data for Grissom Brother Service Company HVAC
const BUSINESS_DATA = {
  "slug": "grissombrotherservicecompanyhvac",
  "name": "Grissom Brother Service Company HVAC",
  "phone": {
    "phones_enricher": {
      "carrier_name": "",
      "carrier_type": ""
    }
  },
  "street": "4907 Powell Ave S",
  "city": "Birmingham",
  "postal_code": "35222",
  "state": "Alabama",
  "latitude": "33.5331309",
  "longitude": "-86.7605556",
  "rating": "5",
  "reviews": "26",
  "reviews_link": "https://search.google.com/local/reviews?placeid=ChIJ_W4A3ooaiYgRAy9fs0GUs2w&q=hvac+contractor,+35201,+Birmingham,+AL,+US&authuser=0&hl=en&gl=US",
  "place_id": "ChIJ_W4A3ooaiYgRAy9fs0GUs2w",
  "working_hours": "{\"Monday\": \"Open 24 hours\", \"Tuesday\": \"Open 24 hours\", \"Wednesday\": \"Open 24 hours\", \"Thursday\": \"Open 24 hours\", \"Friday\": \"Open 24 hours\", \"Saturday\": \"Open 24 hours\", \"Sunday\": \"Open 24 hours\"}",
  "logo": "https://lh6.googleusercontent.com/-y2q4zC8gyGA/AAAAAAAAAAI/AAAAAAAAAAA/Z8cxYWSOIu4/s44-p-k-no-ns-nd/photo.jpg",
  "email": {
    "emails_validator": {
      "status": "RECEIVING",
      "status_details": "SMTP validated"
    }
  },
  "facebook": "https://www.facebook.com/GrissomService/about/",
  "customization": {
    "heroImage": "https://lh5.googleusercontent.com/p/AF1QipN9d1EiWS4pSHnApFChsOKYiivFe02Vh_uzi7RX=w800-h500-k-no",
    "aboutImage": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "primaryColor": "#0072CE",
    "secondaryColor": "#ff7a00"
  }
};

// Create directories if they don't exist
const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Create leads directory for chat messages
const leadsDir = path.join(__dirname, 'data', 'leads');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(leadsDir)) {
  fs.mkdirSync(leadsDir);
}

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'hvac-website-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware to fix ordering issue - these need to come BEFORE route definitions
app.use(express.static(path.join(__dirname, 'public')));

// Generate a simple hash for password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Authentication middleware removed for client site

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

// API endpoint to handle chat messages
app.post('/api/chat-message', (req, res) => {
  try {
    const { slug, name, email, message, phone } = req.body;
    
    if (!slug || !message) {
      return res.status(400).json({ error: 'Business slug and message are required' });
    }
    
    // Create a lead object
    const lead = {
      id: Date.now().toString(),
      name: name || 'Anonymous',
      email: email || '',
      phone: phone || '',
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Save the lead to a JSON file for the business
    const leadsFilePath = path.join(leadsDir, `${slug}-leads.json`);
    let leads = [];
    
    // If the file already exists, read it
    if (fs.existsSync(leadsFilePath)) {
      const leadsData = fs.readFileSync(leadsFilePath, 'utf8');
      leads = JSON.parse(leadsData);
    }
    
    // Add the new lead
    leads.push(lead);
    
    // Write back to the file
    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2));
    
    res.json({ success: true, leadId: lead.id });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

// Admin API endpoints removed for client site

// API endpoint to mark a lead as read
app.post('/api/mark-lead-read', requireAuth, (req, res) => {
  try {
    const { leadId } = req.body;
    const slug = req.session.businessSlug;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }
    
    // Get the leads file path
    const leadsFilePath = path.join(leadsDir, `${slug}-leads.json`);
    
    // Check if the file exists
    if (!fs.existsSync(leadsFilePath)) {
      return res.status(404).json({ error: 'Leads file not found' });
    }
    
    // Read and parse the leads file
    const leadsData = fs.readFileSync(leadsFilePath, 'utf8');
    const leads = JSON.parse(leadsData);
    
    // Find the lead and mark it as read
    const leadIndex = leads.findIndex(lead => lead.id === leadId);
    
    if (leadIndex === -1) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    leads[leadIndex].read = true;
    
    // Write back to the file
    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking lead as read:', error);
    res.status(500).json({ error: 'Failed to mark lead as read' });
  }
});

// Login routes removed for client site

// Business specific login route
app.get('/:slug/login', (req, res) => {
  const slug = req.params.slug;
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login POST endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password });
    
    // Read the businesses.json file
    const businessesPath = path.join(__dirname, 'public', 'businesses.json');
    const businessesData = fs.readFileSync(businessesPath, 'utf8');
    const businesses = JSON.parse(businessesData);
    
    // Find business by slug (username)
    const business = businesses.find(b => b.slug === username);
    
    if (!business) {
      console.log('Business not found:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check if password matches the slug (simple authentication)
    // In a real app, you'd use a proper password hash stored in the business object
    const expectedPassword = username; // Using slug as password as requested
    
    if (password === expectedPassword) {
      // Set session data
      req.session.businessSlug = business.slug;
      req.session.businessName = business.name;
      
      console.log('Login successful for:', business.name);
      
      // Redirect to dashboard
      res.json({ success: true, redirect: '/dashboard' });
    } else {
      console.log('Password mismatch for:', username);
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Dashboard route removed for client site

// API to get current business info
app.get('/api/business-info', requireAuth, (req, res) => {
  res.json({
    slug: req.session.businessSlug,
    name: req.session.businessName
  });
});

// IMPORTANT: Define specific routes BEFORE the catch-all route

// Admin route removed for client site

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
  console.log(`Login page available at http://localhost:${PORT}/login`);
});