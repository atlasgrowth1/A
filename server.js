const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.businessSlug) {
    return next();
  } else {
    res.redirect('/login');
  }
}

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

// API endpoint to get leads for a business
app.get('/api/leads', requireAuth, (req, res) => {
  try {
    const slug = req.session.businessSlug;
    
    // Get the leads file path
    const leadsFilePath = path.join(leadsDir, `${slug}-leads.json`);
    
    // Check if the file exists
    if (!fs.existsSync(leadsFilePath)) {
      return res.json({ leads: [] }); // Return empty array if no leads file
    }
    
    // Read and parse the leads file
    const leadsData = fs.readFileSync(leadsFilePath, 'utf8');
    const leads = JSON.parse(leadsData);
    
    // Sort leads by timestamp (newest first)
    leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

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

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

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

// Dashboard route (protected)
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API to get current business info
app.get('/api/business-info', requireAuth, (req, res) => {
  res.json({
    slug: req.session.businessSlug,
    name: req.session.businessName
  });
});

// Deployment endpoints
const { Octokit } = require('@octokit/rest');
const axios = require('axios');

// Load tokens from environment variables or use defaults for development
// GitHub tokens can be in formats like: "ghp_...", "github_pat_..." or "gho_..."
// Note that GitHub tokens prefixed with ghp_ or github_pat_ might need specific scopes/permissions
const githubToken = process.env.GITHUB_TOKEN || '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';
// Vercel tokens are typically a simple string without prefixes
const vercelToken = process.env.VERCEL_TOKEN || 'xGNyNr4cnjxCEGSIpnRLUhaT';

// Check tokens for basic validity
if (!githubToken || githubToken.length < 10) {
  console.error('WARNING: GitHub token looks invalid or missing');
}
if (!vercelToken || vercelToken.length < 10) {
  console.error('WARNING: Vercel token looks invalid or missing');
}

// For security, only show first few characters
console.log(`Setting up GitHub client with token starting with: ${githubToken.substring(0, 5)}...`);
console.log(`Vercel token starts with: ${vercelToken.substring(0, 5)}...`);

// Set proxy configuration for axios if needed
axios.defaults.proxy = false; // Disable any proxy settings that might be causing issues

// Try different authorization formats
let octokitAuth;
if (githubToken.startsWith('ghp_')) {
  // Personal access token
  console.log('GitHub token appears to be a personal access token (ghp_)');
  octokitAuth = githubToken;
} else if (githubToken.startsWith('github_pat_')) {
  // Fine-grained personal access token
  console.log('GitHub token appears to be a fine-grained personal access token (github_pat_)');
  octokitAuth = githubToken;
} else {
  // Try with 'token ' prefix
  console.log('Using token prefix for GitHub token');
  octokitAuth = `token ${githubToken}`;
}

const octokit = new Octokit({ 
  auth: octokitAuth,
  baseUrl: 'https://api.github.com', // Explicitly set the base URL
  log: {
    debug: (message) => console.log(`GitHub Debug: ${message}`),
    info: (message) => console.log(`GitHub Info: ${message}`),
    warn: (message) => console.log(`GitHub Warning: ${message}`),
    error: (message) => console.error(`GitHub Error: ${message}`)
  },
  request: {
    // Add more debugging for requests
    hook: (request, options) => {
      console.log(`Making GitHub request to: ${options.url}`);
    }
  }
});

// Store active deployments
const deployments = new Map();

// Diagnostic endpoint to test API tokens
app.get('/api/test-tokens', async (req, res) => {
  try {
    console.log('Testing tokens directly...');
    
    // Test GitHub token
    const githubResults = { success: false, message: '', error: null };
    try {
      console.log('Testing GitHub token with direct fetch...');
      const gitResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'Token-Tester'
        }
      });
      
      const status = gitResponse.status;
      const contentType = gitResponse.headers.get('content-type');
      const text = await gitResponse.text();
      
      githubResults.status = status;
      githubResults.contentType = contentType;
      
      if (status === 200) {
        githubResults.success = true;
        githubResults.message = 'GitHub token is valid';
        try {
          const json = JSON.parse(text);
          githubResults.username = json.login;
        } catch (e) {
          githubResults.error = 'Response not JSON';
          githubResults.rawResponse = text.substring(0, 500);
        }
      } else {
        githubResults.message = `GitHub token validation failed with status ${status}`;
        githubResults.rawResponse = text.substring(0, 500);
      }
    } catch (error) {
      githubResults.error = error.message;
    }
    
    // Test Vercel token
    const vercelResults = { success: false, message: '', error: null };
    try {
      console.log('Testing Vercel token with direct fetch...');
      const vercelResponse = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const status = vercelResponse.status;
      const contentType = vercelResponse.headers.get('content-type');
      const text = await vercelResponse.text();
      
      vercelResults.status = status;
      vercelResults.contentType = contentType;
      
      if (status === 200) {
        vercelResults.success = true;
        vercelResults.message = 'Vercel token is valid';
        try {
          const json = JSON.parse(text);
          vercelResults.username = json.user?.username || json.user?.email;
        } catch (e) {
          vercelResults.error = 'Response not JSON';
          vercelResults.rawResponse = text.substring(0, 500);
        }
      } else {
        vercelResults.message = `Vercel token validation failed with status ${status}`;
        vercelResults.rawResponse = text.substring(0, 500);
      }
    } catch (error) {
      vercelResults.error = error.message;
    }
    
    res.json({
      github: githubResults,
      vercel: vercelResults,
      github_token_first_chars: githubToken.substring(0, 5),
      vercel_token_first_chars: vercelToken.substring(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to deploy a client site
app.post('/api/deploy-client-site', async (req, res) => {
  try {
    console.log('Deployment request received:', req.body);
    const { slug } = req.body;
    
    if (!slug) {
      return res.status(400).json({ error: 'Business slug is required' });
    }
    
    // Try different token formats for GitHub
    const TOKEN_FORMATS = [
      { type: 'Bearer token', authHeader: `Bearer ${githubToken}` },
      { type: 'Token prefix', authHeader: `token ${githubToken}` },
      { type: 'Raw token', authHeader: githubToken }
    ];
    
    // Try a direct fetch to GitHub API to test connectivity
    try {
      console.log('Testing basic GitHub API connectivity...');
      const directResponse = await fetch('https://api.github.com/zen', {
        headers: {
          'User-Agent': 'Client-Site-Deployer'
        }
      });
      
      if (directResponse.ok) {
        const zen = await directResponse.text();
        console.log('GitHub API direct connection successful, response:', zen);
      } else {
        console.error('GitHub API direct connection failed with status:', directResponse.status);
        const errorText = await directResponse.text();
        console.error('Error response:', errorText);
      }
    } catch (directError) {
      console.error('Direct GitHub API connection failed:', directError);
    }
    
    // Validate GitHub token with multiple formats
    let githubAuthSuccess = false;
    let githubAuthFormat = '';
    
    console.log('Testing GitHub token validity with multiple formats...');
    
    for (const format of TOKEN_FORMATS) {
      try {
        console.log(`Trying GitHub auth format: ${format.type}`);
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': format.authHeader,
            'User-Agent': 'Client-Site-Deployer',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        console.log(`GitHub token validation status with ${format.type}:`, response.status);
        
        if (response.status === 200) {
          const userData = await response.json();
          console.log(`GitHub token is valid with ${format.type}. User: ${userData.login}`);
          githubAuthSuccess = true;
          githubAuthFormat = format.type;
          break;
        } else {
          const errorText = await response.text();
          console.log(`GitHub token invalid with ${format.type}. Error: ${errorText}`);
        }
      } catch (fetchError) {
        console.error(`Fetch-based GitHub token validation failed with ${format.type}:`, fetchError);
      }
    }
    
    if (githubAuthSuccess) {
      console.log(`✅ Found working GitHub auth format: ${githubAuthFormat}`);
    } else {
      console.error('❌ All GitHub auth formats failed. Token may be invalid or expired.');
    }
    
    // Validate GitHub token with Octokit
    try {
      console.log('Testing GitHub token with Octokit library...');
      
      // Then try with octokit
      const user = await octokit.users.getAuthenticated();
      console.log(`GitHub token is valid. Authenticated as: ${user.data.login}`);
    } catch (tokenError) {
      console.error('GitHub token validation failed:', tokenError);
      
      // Log the raw response if available
      if (tokenError.response) {
        console.error('Raw response data:', tokenError.response.data);
        if (typeof tokenError.response.data === 'string' && tokenError.response.data.includes('<')) {
          console.error('WARNING: HTML response detected instead of expected JSON');
          console.error('First 200 characters of response:', tokenError.response.data.substring(0, 200));
        }
      }
      
      return res.status(500).json({ 
        error: 'GitHub authentication failed', 
        details: tokenError.message,
        stack: tokenError.stack,
        rawResponse: typeof tokenError.response?.data === 'string' ? 
          tokenError.response.data.substring(0, 500) : 'No raw response available'
      });
    }
    
    // Validate Vercel token
    try {
      console.log('Testing Vercel token validity...');
      console.log('Vercel token (first 5 chars):', vercelToken.substring(0, 5) + '...');
      
      // First test with direct fetch to see raw response
      try {
        console.log('Testing Vercel API connectivity with direct fetch...');
        const response = await fetch('https://api.vercel.com/v2/user', {
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Vercel token validation status:', response.status);
        
        if (response.status === 401) {
          console.error('Vercel token is invalid (401 Unauthorized)');
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error('Vercel token is invalid: 401 Unauthorized');
        }
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        try {
          const userData = JSON.parse(responseText);
          console.log('Vercel token is valid. User data:', userData);
        } catch (jsonError) {
          console.error('Failed to parse Vercel response as JSON:', jsonError);
          throw new Error(`Invalid JSON response from Vercel: ${responseText.substring(0, 100)}...`);
        }
      } catch (fetchError) {
        console.error('Fetch-based Vercel token validation failed:', fetchError);
      }
      
      // Then try with axios
      const vercelUser = await axios.get('https://api.vercel.com/v2/user', {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Vercel token is valid. Authenticated as: ${vercelUser.data.user?.email || vercelUser.data.user?.username || 'Unknown'}`);
    } catch (tokenError) {
      console.error('Vercel token validation failed:', tokenError);
      
      // Log the raw response if available
      if (tokenError.response) {
        console.error('Status code:', tokenError.response.status);
        console.error('Raw response data:', tokenError.response.data);
        if (typeof tokenError.response.data === 'string' && tokenError.response.data.includes('<')) {
          console.error('WARNING: HTML response detected instead of expected JSON');
          console.error('First 200 characters of response:', tokenError.response.data.substring(0, 200));
        }
      } else if (tokenError.request) {
        console.error('No response received. Request details:', tokenError.request);
      }
      
      return res.status(500).json({ 
        error: 'Vercel authentication failed', 
        details: tokenError.message,
        stack: tokenError.stack,
        rawResponse: typeof tokenError.response?.data === 'string' ? 
          tokenError.response.data.substring(0, 500) : JSON.stringify(tokenError.response?.data || {})
      });
    }
    
    // Generate a unique deployment ID
    const deploymentId = Date.now().toString();
    console.log(`Created deployment ID: ${deploymentId} for business: ${slug}`);
    
    // Store deployment info
    deployments.set(deploymentId, {
      slug,
      status: 'started',
      progress: 10,
      message: 'Deployment started',
      timestamp: new Date().toISOString()
    });
    
    // Start the deployment process in the background
    deployClientSite(deploymentId, slug).catch(error => {
      console.error(`Deployment error for ${slug}:`, error);
      const errorDetails = error.response?.data || {message: error.message, stack: error.stack};
      deployments.set(deploymentId, {
        ...deployments.get(deploymentId),
        status: 'failed',
        error: error.message,
        errorDetails: JSON.stringify(errorDetails)
      });
    });
    
    // Return the deployment ID
    res.json({ 
      success: true, 
      deploymentId 
    });
  } catch (error) {
    console.error('Error starting deployment:', error);
    const errorDetails = error.response?.data || {message: error.message, stack: error.stack};
    res.status(500).json({ 
      error: 'Failed to start deployment',
      details: error.message,
      stack: error.stack,
      response: JSON.stringify(errorDetails, null, 2)
    });
  }
});

// API endpoint to check deployment status
app.get('/api/deployment-status/:deploymentId', (req, res) => {
  try {
    const { deploymentId } = req.params;
    console.log(`Checking status for deployment: ${deploymentId}`);
    
    // Get deployment info
    const deployment = deployments.get(deploymentId);
    
    if (!deployment) {
      console.log(`Deployment ${deploymentId} not found in active deployments`);
      return res.status(404).json({ 
        error: 'Deployment not found',
        activeDeployments: Array.from(deployments.keys())
      });
    }
    
    console.log(`Deployment ${deploymentId} status:`, deployment);
    
    // Return deployment status
    res.json(deployment);
  } catch (error) {
    console.error('Error checking deployment status:', error);
    res.status(500).json({ 
      error: 'Failed to check deployment status',
      details: error.message,
      stack: error.stack
    });
  }
});

// Function to deploy a client site
async function deployClientSite(deploymentId, slug) {
  try {
    console.log(`Starting deployment process for ${slug} (ID: ${deploymentId})`);
    
    // Get the deployment
    const deployment = deployments.get(deploymentId);
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployment,
      progress: 20,
      message: 'Loading business data...'
    });
    
    // Read the businesses.json file
    console.log('Reading businesses.json file...');
    const businessesPath = path.join(__dirname, 'public', 'businesses.json');
    console.log(`Businesses file path: ${businessesPath}`);
    
    if (!fs.existsSync(businessesPath)) {
      throw new Error(`Businesses file does not exist at path: ${businessesPath}`);
    }
    
    const businessesData = fs.readFileSync(businessesPath, 'utf8');
    console.log(`Businesses data length: ${businessesData.length} characters`);
    
    let businesses;
    let business;
    
    try {
      businesses = JSON.parse(businessesData);
      console.log(`Found ${businesses.length} businesses in the file`);
      
      // Find the business with the matching slug
      business = businesses.find(b => b.slug === slug);
      
      if (!business) {
        throw new Error(`Business with slug '${slug}' not found in businesses data`);
      }
      
      console.log(`Found business: ${business.name} (${business.slug})`);
    } catch (jsonError) {
      console.error('Error parsing businesses.json:', jsonError);
      console.log('First 100 characters of businessesData:', businessesData.substring(0, 100));
      throw new Error(`Failed to parse businesses.json: ${jsonError.message}`);
    }
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      progress: 30,
      message: 'Creating GitHub branch...'
    });
    
    // Create a new branch for the client site
    const branchName = `client-site-${slug}`;
    
    // Get GitHub repository details - hardcoded
    const repoOwner = 'atlasgrowth1';  // GitHub username
    const repoName = 'A';
    
    console.log(`Deploying from GitHub repository: ${repoOwner}/${repoName}`);
    
    // Check if the repo exists
    let repoInfo;
    try {
      console.log(`Checking if repository exists: ${repoOwner}/${repoName}`);
      const repoResponse = await octokit.repos.get({
        owner: repoOwner,
        repo: repoName
      });
      repoInfo = repoResponse.data;
      console.log(`Repository found: ${repoInfo.full_name}, default branch: ${repoInfo.default_branch}`);
    } catch (error) {
      console.error('Error getting repository info:', error);
      console.log('Error response:', error.response?.data);
      throw new Error(`GitHub repository not found: ${error.message}`);
    }
    
    const defaultBranch = repoInfo.default_branch;
    
    // Get the latest commit on the default branch
    let latestCommitSha;
    try {
      console.log(`Getting the latest commit on branch: ${defaultBranch}`);
      const refData = await octokit.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${defaultBranch}`
      });
      
      latestCommitSha = refData.data.object.sha;
      console.log(`Latest commit SHA: ${latestCommitSha}`);
    } catch (error) {
      console.error('Error getting latest commit:', error);
      console.log('Error response:', error.response?.data);
      throw new Error(`Failed to get latest commit: ${error.message}`);
    }
    
    // Create a new branch from the latest commit
    try {
      console.log(`Creating new branch: ${branchName} from commit: ${latestCommitSha}`);
      await octokit.git.createRef({
        owner: repoOwner,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha
      });
      console.log(`Branch created successfully: ${branchName}`);
    } catch (error) {
      console.log(`Error creating branch (${error.status}):`, error.message);
      
      // If the branch already exists, delete it and create it again
      if (error.status === 422) {
        console.log(`Branch ${branchName} already exists. Deleting and recreating...`);
        try {
          await octokit.git.deleteRef({
            owner: repoOwner,
            repo: repoName,
            ref: `heads/${branchName}`
          });
          console.log(`Deleted existing branch: ${branchName}`);
          
          await octokit.git.createRef({
            owner: repoOwner,
            repo: repoName,
            ref: `refs/heads/${branchName}`,
            sha: latestCommitSha
          });
          console.log(`Recreated branch: ${branchName}`);
        } catch (deleteError) {
          console.error('Error deleting/recreating branch:', deleteError);
          console.log('Error response:', deleteError.response?.data);
          throw new Error(`Failed to recreate branch: ${deleteError.message}`);
        }
      } else {
        console.error('Error creating branch:', error);
        console.log('Error response:', error.response?.data);
        throw new Error(`Failed to create branch: ${error.message}`);
      }
    }
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      progress: 40,
      message: 'Creating client site files...'
    });
    
    // Create client-specific index.html with hardcoded business data
    try {
      console.log(`Reading index.html file...`);
      const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
      
      if (!fs.existsSync(indexHtmlPath)) {
        throw new Error(`Index.html file does not exist at path: ${indexHtmlPath}`);
      }
      
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      console.log(`Read index.html file, length: ${indexHtml.length} characters`);
      
      // Modify the index.html to hardcode the business data
      console.log(`Modifying index.html to hardcode business data for: ${business.name}`);
      
      // Try different patterns to find the dynamic business data loading
      const patterns = [
        /fetch\('\/businesses\.json'\)[\s\S]*?businesses\.find\(b => b\.slug === slug\);/g,
        /fetch\(['"]\/businesses\.json['"]\)[\s\S]*?businesses\.find\(.*?slug.*?\);/g,
        /fetch\(['"].*?businesses\.json['"]\)[\s\S]*?businesses\.find/g
      ];
      
      let foundPattern = false;
      let modifiedHtml = indexHtml;
      
      for (const pattern of patterns) {
        if (pattern.test(indexHtml)) {
          console.log(`Found matching pattern for business data loading`);
          foundPattern = true;
          modifiedHtml = indexHtml.replace(
            pattern,
            `// Hardcoded business data for ${business.name}
            const currentBusiness = ${JSON.stringify(business, null, 2)};`
          );
          break;
        }
      }
      
      if (!foundPattern) {
        console.log('WARNING: Could not find dynamic business data code in index.html');
        console.log('Will inject business data at the beginning of the first script tag');
        
        // Inject at the beginning of the first script tag
        modifiedHtml = indexHtml.replace(
          /<script>/, 
          `<script>
          // Hardcoded business data for ${business.name}
          const currentBusiness = ${JSON.stringify(business, null, 2)};
          `
        );
      }
      
      indexHtml = modifiedHtml;
      
      // Remove admin-related code
      console.log(`Removing admin-related code from index.html`);
      const adminPatterns = [
        /<div class="login-button[\s\S]*?<\/div>/g,
        /<a [^>]*class="login-button[\s\S]*?<\/a>/g,
        /<button [^>]*class="login-button[\s\S]*?<\/button>/g,
        /<a [^>]*href="\/login[\s\S]*?<\/a>/g
      ];
      
      let adminElementsRemoved = false;
      
      for (const pattern of adminPatterns) {
        if (pattern.test(indexHtml)) {
          console.log(`Found and removing admin element matching pattern`);
          indexHtml = indexHtml.replace(pattern, '');
          adminElementsRemoved = true;
        }
      }
      
      if (!adminElementsRemoved) {
        console.log('WARNING: Could not find any admin-related code in index.html');
      }
      
      // First get the current file to get its SHA
      console.log(`Getting current index.html SHA for branch: ${branchName}`);
      let fileSha;
      try {
        // Try to get the current file content to get its SHA
        const fileResponse = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: 'public/index.html',
          ref: branchName
        });
        fileSha = fileResponse.data.sha;
        console.log(`Found existing index.html with SHA: ${fileSha}`);
      } catch (error) {
        if (error.status === 404) {
          console.log(`File does not exist in branch yet, creating new file`);
        } else {
          throw error;
        }
      }

      // Commit the modified index.html
      console.log(`Committing modified index.html to branch: ${branchName}`);
      try {
        const commitParams = {
          owner: repoOwner,
          repo: repoName,
          path: 'public/index.html',
          message: `Create client site for ${business.name}`,
          content: Buffer.from(indexHtml).toString('base64'),
          branch: branchName
        };
        
        // If we found an existing file, include its SHA
        if (fileSha) {
          commitParams.sha = fileSha;
        }
        
        const commitResponse = await octokit.repos.createOrUpdateFileContents(commitParams);
        
        console.log(`Successfully committed index.html: ${commitResponse.data.commit.html_url}`);
      } catch (commitError) {
        console.error('Error committing index.html:', commitError);
        console.log('Error response:', commitError.response?.data);
        throw new Error(`Failed to commit index.html: ${commitError.message}`);
      }
    } catch (fileError) {
      console.error('Error processing index.html:', fileError);
      throw new Error(`Failed to process index.html: ${fileError.message}`);
    }
    
    // Create a simplified server.js without admin features
    try {
      console.log(`Reading server.js file...`);
      const serverJsPath = path.join(__dirname, 'server.js');
      
      if (!fs.existsSync(serverJsPath)) {
        throw new Error(`Server.js file does not exist at path: ${serverJsPath}`);
      }
      
      let serverJs = fs.readFileSync(serverJsPath, 'utf8');
      console.log(`Read server.js file, length: ${serverJs.length} characters`);
      
      // Create a simplified server for client site
      console.log(`Simplifying server.js for client site`);
      
      // Remove session middleware
      const sessionPattern = /\/\/ Session middleware[\s\S]*?}}\);/g;
      if (!sessionPattern.test(serverJs)) {
        console.log('WARNING: Could not find session middleware code in server.js');
      }
      serverJs = serverJs.replace(sessionPattern, '// Session middleware removed for client site');
      
      // Remove authentication middleware
      const authPattern = /\/\/ Authentication middleware[\s\S]*?}\n}/g;
      if (!authPattern.test(serverJs)) {
        console.log('WARNING: Could not find authentication middleware code in server.js');
      }
      serverJs = serverJs.replace(authPattern, '// Authentication middleware removed for client site');
      
      // Remove API endpoints for leads
      const leadsApiPattern = /\/\/ API endpoint to get leads[\s\S]*?}\n}\);/g;
      if (!leadsApiPattern.test(serverJs)) {
        console.log('WARNING: Could not find leads API code in server.js');
      }
      serverJs = serverJs.replace(leadsApiPattern, '// Admin API endpoints removed for client site');
      
      // Remove login routes
      const loginPattern = /\/\/ Login route[\s\S]*?}\);/g;
      if (!loginPattern.test(serverJs)) {
        console.log('WARNING: Could not find login route code in server.js');
      }
      serverJs = serverJs.replace(loginPattern, '// Login routes removed for client site');
      
      // Remove dashboard route
      const dashboardPattern = /\/\/ Dashboard route[\s\S]*?}\);/g;
      if (!dashboardPattern.test(serverJs)) {
        console.log('WARNING: Could not find dashboard route code in server.js');
      }
      serverJs = serverJs.replace(dashboardPattern, '// Dashboard route removed for client site');
      
      // Remove admin routes
      const adminPattern = /\/\/ Admin route[\s\S]*?}\);/g;
      if (!adminPattern.test(serverJs)) {
        console.log('WARNING: Could not find admin route code in server.js');
      }
      serverJs = serverJs.replace(adminPattern, '// Admin route removed for client site');
      
      // Remove the deployment code (to avoid token exposure)
      const deploymentPattern = /\/\/ Deployment endpoints[\s\S]*?\/\/ IMPORTANT: Define specific routes/g;
      if (!deploymentPattern.test(serverJs)) {
        console.log('WARNING: Could not find deployment endpoints code in server.js');
      }
      serverJs = serverJs.replace(deploymentPattern, '// IMPORTANT: Define specific routes');
      
      // Add hardcoded business data
      serverJs = serverJs.replace(
        /const PORT = process\.env\.PORT \|\| 3000;/,
        `const PORT = process.env.PORT || 3000;

// Hardcoded business data for ${business.name}
const BUSINESS_DATA = ${JSON.stringify(business, null, 2)};`
      );
      
      // Get the SHA for server.js
      console.log(`Getting current server.js SHA for branch: ${branchName}`);
      let serverJsSha;
      try {
        // Try to get the current file content to get its SHA
        const fileResponse = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: 'server.js',
          ref: branchName
        });
        serverJsSha = fileResponse.data.sha;
        console.log(`Found existing server.js with SHA: ${serverJsSha}`);
      } catch (error) {
        if (error.status === 404) {
          console.log(`server.js does not exist in branch yet, creating new file`);
        } else {
          throw error;
        }
      }

      // Commit the modified server.js
      console.log(`Committing modified server.js to branch: ${branchName}`);
      try {
        const commitParams = {
          owner: repoOwner,
          repo: repoName,
          path: 'server.js',
          message: `Simplify server for ${business.name} client site`,
          content: Buffer.from(serverJs).toString('base64'),
          branch: branchName
        };
        
        // If we found an existing file, include its SHA
        if (serverJsSha) {
          commitParams.sha = serverJsSha;
        }
        
        const commitResponse = await octokit.repos.createOrUpdateFileContents(commitParams);
        
        console.log(`Successfully committed server.js: ${commitResponse.data.commit.html_url}`);
      } catch (commitError) {
        console.error('Error committing server.js:', commitError);
        console.log('Error response:', commitError.response?.data);
        throw new Error(`Failed to commit server.js: ${commitError.message}`);
      }
    } catch (fileError) {
      console.error('Error processing server.js:', fileError);
      throw new Error(`Failed to process server.js: ${fileError.message}`);
    }
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      progress: 70,
      message: 'Deploying to Vercel...'
    });
    
    // Deploy to Vercel using the Vercel API
    let deploymentUrl;
    try {
      console.log(`Deploying to Vercel: branch ${branchName}`);
      
      // First, get the repository ID from GitHub for Vercel integration
      console.log(`Getting repository details for Vercel integration`);
      let repoId;
      
      try {
        // Get project details from Vercel
        const projectsResponse = await axios.get(
          'https://api.vercel.com/v9/projects',
          {
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Look for a project that matches our repo
        const matchingProject = projectsResponse.data.projects.find(
          project => project.name === repoName || 
            (project.gitRepository && 
             project.gitRepository.repo === `${repoOwner}/${repoName}`)
        );
        
        if (matchingProject) {
          console.log(`Found matching Vercel project: ${matchingProject.name}`);
          
          if (matchingProject.gitRepository && matchingProject.gitRepository.repo) {
            repoId = matchingProject.id;
            console.log(`Found git repository ID: ${repoId}`);
          }
        }
      } catch (error) {
        console.warn('Could not get Vercel projects:', error.message);
      }
      
      // Prepare deployment payload
      const deploymentPayload = {
        name: `client-site-${slug}`,
        target: 'production'
      };
      
      // Add git source info if we have a repo ID, otherwise use GitHub defaults
      if (repoId) {
        // Use project ID
        deploymentPayload.gitSource = {
          type: 'github',
          repo: `${repoOwner}/${repoName}`,
          ref: branchName,
          repoId: repoId
        };
      } else {
        // Alternative approach without repoId - try with different format
        deploymentPayload.gitSource = {
          type: 'github',
          org: repoOwner,
          repo: repoName,
          ref: branchName
        };
      }
      
      console.log('Vercel deployment payload:', JSON.stringify(deploymentPayload, null, 2));
      
      // Try to make the deployment request
      try {
        const vercelDeployment = await axios.post(
          'https://api.vercel.com/v13/deployments',
          deploymentPayload,
          {
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Vercel deployment response:', JSON.stringify(vercelDeployment.data, null, 2));
        
        // Get the deployment URL
        deploymentUrl = `https://${vercelDeployment.data.url}`;
      } catch (deployError) {
        console.error('Error with Git-based deployment:', deployError.message);
        console.log('Detailed error:', deployError.response?.data);
        
        // If Git-based deployment fails, try alternative approach - creating a project directly
        console.log('Trying alternative deployment approach without Git integration...');
        
        // Update progress
        deployments.set(deploymentId, {
          ...deployments.get(deploymentId),
          progress: 80,
          message: 'Trying alternative deployment approach...'
        });
        
        // The client site is already on GitHub, so we can just return a success message
        // with instructions to manually set up in Vercel
        console.log('Branch created successfully. Manual Vercel setup needed.');
        deploymentUrl = `https://github.com/${repoOwner}/${repoName}/tree/${branchName}`;
        
        // Set a more informative message
        deployments.set(deploymentId, {
          ...deployments.get(deploymentId),
          manualSetupRequired: true,
          githubBranchUrl: deploymentUrl,
          vercelSetupInstructions: `
          1. Go to https://vercel.com/new
          2. Import this GitHub repository: ${repoOwner}/${repoName}
          3. Select the branch: ${branchName}
          4. Deploy the projectI 
          `
        });
      }
      console.log(`Deployment URL: ${deploymentUrl}`);
      
      // Update deployment status
      const deploymentStatus = deployments.get(deploymentId);
      if (deploymentStatus.manualSetupRequired) {
        // Manual Vercel setup is needed
        deployments.set(deploymentId, {
          ...deploymentStatus,
          status: 'completed',
          progress: 100,
          message: 'GitHub branch created successfully, but Vercel deployment requires manual setup',
          url: deploymentUrl,
          setupType: 'manual'
        });
      } else {
        // Automatic deployment completed successfully
        deployments.set(deploymentId, {
          ...deploymentStatus,
          status: 'completed',
          progress: 100,
          message: 'Deployment completed',
          url: deploymentUrl,
          setupType: 'automatic'
        });
      }
    } catch (vercelError) {
      console.error('Error deploying to Vercel:', vercelError);
      console.log('Error response:', vercelError.response?.data);
      
      // Update deployment status
      deployments.set(deploymentId, {
        ...deployments.get(deploymentId),
        status: 'failed',
        progress: 100,
        message: 'Vercel deployment failed',
        error: vercelError.message,
        errorDetails: JSON.stringify(vercelError.response?.data || {})
      });
      
      throw new Error(`Vercel deployment failed: ${vercelError.message}`);
    }
    
    console.log(`Client site deployment completed successfully: ${deploymentUrl}`);
    return deploymentUrl;
  } catch (error) {
    console.error('Error deploying client site:', error);
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      status: 'failed',
      progress: 100,
      error: error.message
    });
    
    throw error;
  }
}

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
  console.log(`Login page available at http://localhost:${PORT}/login`);
});