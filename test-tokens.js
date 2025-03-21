#!/usr/bin/env node

/**
 * Simple script to test GitHub and Vercel API tokens
 * without any complex dependencies or logic.
 */

// GitHub token
const githubToken = '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';
// Vercel token
const vercelToken = 'xGNyNr4cnjxCEGSIpnRLUhaT';

// Function to make a simple fetch request
async function fetchWithToken(url, token, tokenType) {
  try {
    console.log(`Testing ${tokenType} token with URL: ${url}`);
    
    // Different auth header formats
    const headers = {
      'User-Agent': 'Token-Tester-Script'
    };
    
    if (tokenType === 'GitHub') {
      headers['Authorization'] = `token ${token}`;
    } else if (tokenType === 'Vercel') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Request headers:', headers);
    
    const response = await fetch(url, { headers });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response body (first 200 chars): ${text.substring(0, 200)}`);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON response:', json);
      console.log(`${tokenType} token is VALID!`);
      return true;
    } catch (e) {
      console.error(`Response is not valid JSON:`, e.message);
      console.error('This likely means the token is invalid or the response is HTML');
      return false;
    }
  } catch (error) {
    console.error(`Error testing ${tokenType} token:`, error.message);
    return false;
  }
}

// Main function
async function testTokens() {
  console.log('==========================================');
  console.log('TESTING GITHUB TOKEN');
  console.log('==========================================');
  const githubValid = await fetchWithToken('https://api.github.com/user', githubToken, 'GitHub');
  
  console.log('\n\n==========================================');
  console.log('TESTING VERCEL TOKEN');
  console.log('==========================================');
  const vercelValid = await fetchWithToken('https://api.vercel.com/v2/user', vercelToken, 'Vercel');
  
  console.log('\n\n==========================================');
  console.log('SUMMARY');
  console.log('==========================================');
  console.log(`GitHub token: ${githubValid ? 'VALID ✅' : 'INVALID ❌'}`);
  console.log(`Vercel token: ${vercelValid ? 'VALID ✅' : 'INVALID ❌'}`);
}

// Run the test
testTokens().catch(error => {
  console.error('Error in test script:', error);
});