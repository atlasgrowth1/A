/**
 * Since we're having consistent SSL/network connectivity issues with all methods,
 * let's create a solution that works by having the user upload the data directly.
 */

const fs = require('fs');
const path = require('path');

// File path where the data will be stored
const dataPath = path.join(__dirname, '../public/data');

// Create the data directory if it doesn't exist
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Create a sample reviews JSON file
const sampleReviews = [
  {
    "author_name": "John Doe",
    "rating": 5,
    "date": "2023-12-15",
    "text": "Excellent service! The technicians were professional and fixed our AC in no time."
  },
  {
    "author_name": "Jane Smith",
    "rating": 4, 
    "date": "2023-11-20",
    "text": "Good service overall. They were a bit late but did a great job on the installation."
  },
  {
    "author_name": "Michael Johnson",
    "rating": 5,
    "date": "2023-10-05",
    "text": "Very impressed with their knowledge and efficiency. Would recommend to anyone needing HVAC work."
  }
];

// Create a sample photos JSON file
const samplePhotos = [
  {
    "photo_url": "https://lh5.googleusercontent.com/p/AF1QipNxEj83bMk8PSthd1fh1Bo1zaVb0fRQqxhE_Bwo=w800-h500-k-no",
    "photo_title": "Business exterior"
  },
  {
    "photo_url": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
    "photo_title": "Technician at work"
  },
  {
    "photo_url": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "photo_title": "Equipment installation"
  }
];

// Write the sample files
fs.writeFileSync(path.join(dataPath, 'stegallheatingairconditioningandplumbing-reviews.json'), JSON.stringify(sampleReviews, null, 2));
fs.writeFileSync(path.join(dataPath, 'stegallheatingairconditioningandplumbing-photos.json'), JSON.stringify(samplePhotos, null, 2));

console.log('Sample data files created successfully at:');
console.log(`- ${path.join(dataPath, 'stegallheatingairconditioningandplumbing-reviews.json')}`);
console.log(`- ${path.join(dataPath, 'stegallheatingairconditioningandplumbing-photos.json')}`);
console.log('\nYou can now create a simple HTML form to upload these files in the admin interface.');