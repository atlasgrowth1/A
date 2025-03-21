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

// Initialize GitHub and Vercel clients
const githubToken = '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';
const vercelToken = 'xGNyNr4cnjxCEGSIpnRLUhaT';
const octokit = new Octokit({ auth: githubToken });

// Store active deployments
const deployments = new Map();

// API endpoint to deploy a client site
app.post('/api/deploy-client-site', async (req, res) => {
  try {
    const { slug } = req.body;
    
    if (!slug) {
      return res.status(400).json({ error: 'Business slug is required' });
    }
    
    // Generate a unique deployment ID
    const deploymentId = Date.now().toString();
    
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
      deployments.set(deploymentId, {
        ...deployments.get(deploymentId),
        status: 'failed',
        error: error.message
      });
    });
    
    // Return the deployment ID
    res.json({ 
      success: true, 
      deploymentId 
    });
  } catch (error) {
    console.error('Error starting deployment:', error);
    res.status(500).json({ error: 'Failed to start deployment' });
  }
});

// API endpoint to check deployment status
app.get('/api/deployment-status/:deploymentId', (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    // Get deployment info
    const deployment = deployments.get(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    // Return deployment status
    res.json(deployment);
  } catch (error) {
    console.error('Error checking deployment status:', error);
    res.status(500).json({ error: 'Failed to check deployment status' });
  }
});

// Function to deploy a client site
async function deployClientSite(deploymentId, slug) {
  try {
    // Get the deployment
    const deployment = deployments.get(deploymentId);
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployment,
      progress: 20,
      message: 'Loading business data...'
    });
    
    // Read the businesses.json file
    const businessesPath = path.join(__dirname, 'public', 'businesses.json');
    const businessesData = fs.readFileSync(businessesPath, 'utf8');
    const businesses = JSON.parse(businessesData);
    
    // Find the business with the matching slug
    const business = businesses.find(b => b.slug === slug);
    
    if (!business) {
      throw new Error('Business not found');
    }
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      progress: 30,
      message: 'Creating GitHub branch...'
    });
    
    // Create a new branch for the client site
    const branchName = `client-site-${slug}`;
    
    // Get GitHub repository details from environment
    const githubRepo = process.env.GITHUB_REPOSITORY || 'A';
    const repoOwner = githubRepo.split('/')[0] || 'placeholder';
    const repoName = githubRepo.split('/')[1] || 'A';
    
    console.log(`Deploying from GitHub repository: ${repoOwner}/${repoName}`);
    
    // Check if the repo exists
    try {
      await octokit.repos.get({
        owner: repoOwner,
        repo: repoName
      });
    } catch (error) {
      throw new Error('GitHub repository not found');
    }
    
    // Get the default branch
    const repoInfo = await octokit.repos.get({
      owner: repoOwner,
      repo: repoName
    });
    
    const defaultBranch = repoInfo.data.default_branch;
    
    // Get the latest commit on the default branch
    const refData = await octokit.git.getRef({
      owner: repoOwner,
      repo: repoName,
      ref: `heads/${defaultBranch}`
    });
    
    const latestCommitSha = refData.data.object.sha;
    
    // Create a new branch from the latest commit
    try {
      await octokit.git.createRef({
        owner: repoOwner,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha
      });
    } catch (error) {
      // If the branch already exists, delete it and create it again
      if (error.status === 422) {
        await octokit.git.deleteRef({
          owner: repoOwner,
          repo: repoName,
          ref: `heads/${branchName}`
        });
        
        await octokit.git.createRef({
          owner: repoOwner,
          repo: repoName,
          ref: `refs/heads/${branchName}`,
          sha: latestCommitSha
        });
      } else {
        throw error;
      }
    }
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      progress: 40,
      message: 'Creating client site files...'
    });
    
    // Create client-specific index.html with hardcoded business data
    const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
    let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // Modify the index.html to hardcode the business data
    indexHtml = indexHtml.replace(
      /fetch\('\/businesses\.json'\)[\s\S]*?businesses\.find\(b => b\.slug === slug\);/g,
      `// Hardcoded business data for ${business.name}
      const currentBusiness = ${JSON.stringify(business, null, 2)};`
    );
    
    // Remove admin-related code
    indexHtml = indexHtml.replace(
      /<div class="login-button[\s\S]*?<\/div>/g,
      ''
    );
    
    // Commit the modified index.html
    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: 'public/index.html',
      message: `Create client site for ${business.name}`,
      content: Buffer.from(indexHtml).toString('base64'),
      branch: branchName
    });
    
    // Create a simplified server.js without admin features
    let serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    
    // Remove admin routes and middleware
    serverJs = serverJs.replace(
      /\/\/ Session middleware[\s\S]*?}}\);/g,
      '// Session middleware removed for client site'
    );
    
    serverJs = serverJs.replace(
      /\/\/ Authentication middleware[\s\S]*?}\n}/g,
      '// Authentication middleware removed for client site'
    );
    
    serverJs = serverJs.replace(
      /\/\/ API endpoint to get leads[\s\S]*?}\n}\);/g,
      '// Admin API endpoints removed for client site'
    );
    
    serverJs = serverJs.replace(
      /\/\/ Login route[\s\S]*?}\);/g,
      '// Login routes removed for client site'
    );
    
    serverJs = serverJs.replace(
      /\/\/ Dashboard route[\s\S]*?}\);/g,
      '// Dashboard route removed for client site'
    );
    
    serverJs = serverJs.replace(
      /\/\/ Admin route[\s\S]*?}\);/g,
      '// Admin route removed for client site'
    );
    
    // Remove the deployment code (to avoid token exposure)
    serverJs = serverJs.replace(
      /\/\/ Deployment endpoints[\s\S]*?\/\/ IMPORTANT: Define specific routes/g,
      '// IMPORTANT: Define specific routes'
    );
    
    // Commit the modified server.js
    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: 'server.js',
      message: `Simplify server for ${business.name} client site`,
      content: Buffer.from(serverJs).toString('base64'),
      branch: branchName
    });
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      progress: 70,
      message: 'Deploying to Vercel...'
    });
    
    // Deploy to Vercel using the Vercel API
    const vercelDeployment = await axios.post(
      'https://api.vercel.com/v13/deployments',
      {
        name: `client-site-${slug}`,
        target: 'production',
        gitSource: {
          type: 'github',
          repo: `${repoOwner}/${repoName}`,
          ref: branchName
        }
      },
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`
        }
      }
    );
    
    // Get the deployment URL
    const deploymentUrl = `https://${vercelDeployment.data.url}`;
    
    // Update deployment status
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      status: 'completed',
      progress: 100,
      message: 'Deployment completed',
      url: deploymentUrl
    });
    
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