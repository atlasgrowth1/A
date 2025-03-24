const fs = require('fs');
const csv = require('csvtojson');
const path = require('path');

// Input files - using latest Outscraper file
const inputFile = path.resolve(__dirname, 'Outscraper-20250322214057s0b (1).csv');
// Output file for reviews
const reviewsOutputFile = path.resolve(__dirname, 'public/reviews.json');
// Business data file to match place_ids
const businessesFile = path.resolve(__dirname, 'public/businesses.json');

// Process CSV file and generate review data
async function processReviews() {
  try {
    console.log(`Reading CSV file: ${inputFile}`);
    
    // Read businesses file to get existing business data
    let businesses = [];
    if (fs.existsSync(businessesFile)) {
      const businessesData = fs.readFileSync(businessesFile, 'utf8');
      businesses = JSON.parse(businessesData);
      console.log(`Loaded ${businesses.length} businesses from existing data`);
    } else {
      console.warn(`Businesses file not found: ${businessesFile}`);
    }
    
    // Convert CSV to JSON
    const reviews = await csv().fromFile(inputFile);
    console.log(`Processed ${reviews.length} reviews from CSV`);
    
    // Group reviews by place_id
    const reviewsByPlaceId = {};
    
    reviews.forEach(review => {
      const placeId = review.place_id;
      
      if (!placeId) {
        console.warn('Review without place_id, skipping:', review.name);
        return;
      }
      
      if (!reviewsByPlaceId[placeId]) {
        reviewsByPlaceId[placeId] = {
          placeId: placeId,
          businessName: review.name,
          googleId: review.google_id,
          locationLink: review.location_link,
          reviewsLink: review.reviews_link,
          reviews: [],
          summary: {
            totalReviews: 0,
            averageRating: 0,
            fiveStarCount: 0,
            fourStarCount: 0,
            threeStarCount: 0,
            twoStarCount: 0,
            oneStarCount: 0,
            latestReviewDate: null
          }
        };
      }
      
      // Only include reviews with text or images
      if (review.review_text || review.review_img_urls) {
        // Format the review object with selected fields
        const formattedReview = {
          id: review.review_id,
          author: review.author_title || 'Anonymous',
          authorId: review.author_id,
          authorImage: review.author_image,
          rating: parseFloat(review.review_rating) || 0,
          text: review.review_text || '',
          date: review.review_datetime_utc || '',
          timestamp: review.review_timestamp || '',
          images: review.review_img_urls ? review.review_img_urls.split(', ') : [],
          ownerResponse: review.owner_answer || '',
          ownerResponseDate: review.owner_answer_timestamp_datetime_utc || '',
          likes: parseInt(review.review_likes) || 0
        };
        
        reviewsByPlaceId[placeId].reviews.push(formattedReview);
      }
    });
    
    // Calculate summary metrics for each business
    for (const placeId in reviewsByPlaceId) {
      const business = reviewsByPlaceId[placeId];
      const reviews = business.reviews;
      
      // Sort reviews by date (newest first)
      reviews.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      // Calculate summary metrics
      let totalRating = 0;
      business.summary.totalReviews = reviews.length;
      
      reviews.forEach(review => {
        // Count reviews by rating
        const rating = review.rating;
        totalRating += rating;
        
        if (rating === 5) business.summary.fiveStarCount++;
        else if (rating === 4) business.summary.fourStarCount++;
        else if (rating === 3) business.summary.threeStarCount++;
        else if (rating === 2) business.summary.twoStarCount++;
        else if (rating === 1) business.summary.oneStarCount++;
      });
      
      // Calculate average rating
      business.summary.averageRating = totalRating / reviews.length || 0;
      
      // Get latest review date
      if (reviews.length > 0) {
        business.summary.latestReviewDate = reviews[0].date;
      }
    }
    
    // Add reviews to business records
    businesses.forEach(business => {
      // If business has place_id, link reviews
      if (business.place_id && reviewsByPlaceId[business.place_id]) {
        business.reviewData = reviewsByPlaceId[business.place_id];
        console.log(`Matched reviews to business: ${business.name} (${business.slug})`);
      }
    });
    
    // Save updated businesses data with reviews
    fs.writeFileSync(businessesFile, JSON.stringify(businesses, null, 2));
    console.log(`Updated businesses.json with review data`);
    
    // Also save a separate reviews file for direct access
    fs.writeFileSync(reviewsOutputFile, JSON.stringify(reviewsByPlaceId, null, 2));
    console.log(`Saved reviews to: ${reviewsOutputFile}`);
    
    return {
      reviewCount: reviews.length,
      businessCount: Object.keys(reviewsByPlaceId).length,
      matchedBusinesses: businesses.filter(b => b.reviewData).length
    };
  } catch (error) {
    console.error('Error processing reviews:', error);
    throw error;
  }
}

// Run the process
processReviews()
  .then(result => {
    console.log('Successfully processed reviews:');
    console.log(`- ${result.reviewCount} total reviews`);
    console.log(`- ${result.businessCount} businesses with reviews`);
    console.log(`- ${result.matchedBusinesses} matched to existing businesses`);
  })
  .catch(err => {
    console.error('Failed to process reviews:', err);
    process.exit(1);
  });