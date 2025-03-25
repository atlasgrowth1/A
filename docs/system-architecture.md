# HVAC Dashboard System Architecture

## System Overview

The HVAC Dashboard is built on a Node.js/Express framework serving both dynamic business websites and an administrative dashboard. The system uses file-based data storage with JSON files rather than a traditional database for simplicity.

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Outscraper     │────▶│  CSV Processing │────▶│  JSON Data      │
│  Data Source    │     │  Scripts        │     │  Storage        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Customer       │◀───▶│  Express        │◀───▶│  Weather API    │
│  Website        │     │  Server         │     │  Integration    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Admin          │◀───▶│  Lead/Review    │────▶│  Vercel/GitHub  │
│  Dashboard      │     │  Management     │     │  Deployment     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components Detail

### 1. Data Ingestion Layer

- **Outscraper Data Collection**: External CSV files containing HVAC business data and Google reviews
- **Processing Scripts**:
  - `simple-csv-to-json.js`: Basic CSV to JSON conversion
  - `generate-custom-json.js`: Creates formatted business data with slugs and customization options
  - `process-reviews.js`: Processes review data and links to businesses by place_id

### 2. Data Storage Layer

- **File-based Storage**:
  - `/public/businesses.json`: Main database of all business information
  - `/public/reviews.json`: Processed review data
  - `/data/leads/[slug]-leads.json`: Customer inquiries organized by business

### 3. Server Layer

- **Express.js Backend** (`server.js`):
  - HTTP server handling all requests
  - Dynamic routing based on business slugs
  - API endpoints for data management
  - Authentication middleware
  - Static file serving

### 4. Presentation Layer

- **Customer Websites**:
  - Dynamic HTML templates populated with business data
  - Bootstrap-based responsive design
  - Weather widget with HVAC recommendations
  - Contact forms for lead generation
  
- **Administrative Dashboard**:
  - Authentication system for business owners
  - Lead management interface
  - Review display and analytics
  - Weather forecast integration
  - Customization controls

### 5. Integration Layer

- **Weather API**: Integration for local weather forecasts and HVAC demand prediction
- **Deployment Integration**:
  - GitHub repository connection for version control
  - Vercel deployment for hosting individual business sites

## Request Flow

1. **Website Request Flow**:
   - User navigates to `{domain}/{business-slug}`
   - Server identifies business by slug
   - Server renders HTML with business data
   - Weather data is fetched from API based on business location
   - Page displays with customized branding and content

2. **Lead Submission Flow**:
   - Customer completes contact form
   - Form data is sent to `/api/chat-message` endpoint
   - Server saves lead to business-specific JSON file
   - Confirmation is returned to customer

3. **Admin Dashboard Flow**:
   - Business owner logs in with credentials
   - Authentication middleware validates session
   - Dashboard components load business-specific data
   - API endpoints provide leads, reviews, and customization controls

4. **Deployment Flow**:
   - Admin initiates deployment of customized site
   - Server creates GitHub branch with customized files
   - Deployment to Vercel is triggered
   - Custom domain for business site is configured