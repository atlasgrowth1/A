# HVAC Business Dashboard Project Overview

## Project Purpose

This project is a web-based platform designed for HVAC (Heating, Ventilation, and Air Conditioning) contractors that provides:

1. **Customer-facing websites** for HVAC businesses with customizable branding
2. **Administrative dashboard** for businesses to manage customer leads and review data
3. **Weather integration** to help HVAC companies predict service demands based on local climate conditions
4. **Lead generation tools** to capture potential customer inquiries

## Core Components

### 1. Business Data Management
- Imports business data from Outscraper CSV files containing HVAC contractor information
- Processes and stores business details including contact information, location, and operating hours
- Creates a slugified identifier for each business to use in URLs and data lookups

### 2. Customer-Facing Websites
- Dynamically generates websites for each HVAC business with customizable branding
- Displays business information, services, reviews, and contact forms
- Provides weather-based HVAC service recommendations based on local forecasts
- Mobile-responsive design for optimal viewing on all devices

### 3. Administrative Dashboard
- Secure login system for business owners to access their dashboard
- Lead management tools to track and respond to customer inquiries
- Review management to highlight positive customer feedback
- Weather forecast integration to anticipate service demand
- Maintenance reminder system to schedule customer follow-ups

### 4. Review System
- Imports and processes Google Reviews from Outscraper data
- Calculates review metrics (average rating, star breakdown, etc.)
- Displays filtered reviews on the business website
- Provides analytics in the administrative dashboard

### 5. Deployment System
- Allows for automatic deployment of individual business websites
- GitHub integration for version control of site customizations
- Vercel deployment for hosting customer-facing websites

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript with Bootstrap for responsive design
- **Backend**: Node.js with Express
- **Data Storage**: JSON files for simplicity (could be migrated to a database)
- **APIs**: Weather API integration for forecasting
- **Deployment**: GitHub and Vercel integration

## Data Flow

1. Business data is scraped from Google using Outscraper and imported as CSV
2. CSV data is processed into JSON format with business details and customization options
3. Reviews data is similarly processed and linked to businesses by place_id
4. Node.js server serves dynamic websites based on business slug in URL
5. Lead submissions from website forms are stored in JSON files
6. Business owners access their leads and data through the admin dashboard

## Key Files

- `server.js`: Main Express server with all backend routes and API endpoints
- `generate-custom-json.js`: Processes CSV data into structured business JSON
- `process-reviews.js`: Imports and processes review data
- `public/index.html`: Main template for business websites
- `public/dashboard.html`: Admin dashboard interface
- `public/businesses.json`: Central database of all business information