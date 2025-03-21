#!/usr/bin/env node

/**
 * This script sets up the environment variables for tokens
 * and then starts the server.
 */

// Set up environment variables
process.env.GITHUB_TOKEN = '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';
process.env.VERCEL_TOKEN = 'xGNyNr4cnjxCEGSIpnRLUhaT';

// Print startup message
console.log('Starting server with environment variables for tokens...');
console.log(`GitHub token: ${process.env.GITHUB_TOKEN.substring(0, 5)}...`);
console.log(`Vercel token: ${process.env.VERCEL_TOKEN.substring(0, 5)}...`);

// Start the server
require('./server.js');