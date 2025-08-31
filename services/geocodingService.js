const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

// Cache for 1 hour (in seconds)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Reverse geocode coordinates to get address information
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Geocoding result
 */
const reverseGeocode = async (lat, lng) => {
  const cacheKey = `${lat},${lng}`;
  
  // Check cache first
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    logger.debug(`Cache hit for coordinates: ${cacheKey}`);
    return cachedResult;
  }
  
  try {
    // Using OpenStreetMap Nominatim (free and doesn't require an API key for reasonable usage)
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'en',
        zoom: 18, // Most detailed level
        namedetails: 1
      },
      headers: {
        'User-Agent': 'ConstructionTracker/1.0 (contact@example.com)' // Required by Nominatim
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Geocoding API returned status ${response.status}`);
    }
    
    const { address, display_name: displayName } = response.data;
    
    // Format the address components
    const formattedAddress = {
      formattedAddress: displayName,
      street: address.road || '',
      streetNumber: address.house_number || '',
      city: address.city || address.town || address.village || '',
      state: address.state || '',
      country: address.country || '',
      countryCode: address.country_code ? address.country_code.toUpperCase() : '',
      postalCode: address.postcode || '',
      neighborhood: address.neighbourhood || address.suburb || '',
      building: address.building || '',
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      raw: response.data
    };
    
    // Cache the result
    cache.set(cacheKey, formattedAddress);
    
    return formattedAddress;
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    
    // Return a basic response with just coordinates if geocoding fails
    return {
      formattedAddress: `${lat}, ${lng}`,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      error: 'Could not reverse geocode coordinates',
      raw: {}
    };
  }
};

/**
 * Batch reverse geocode multiple coordinates
 * @param {Array<{lat: number, lng: number}>} coordinates - Array of {lat, lng} objects
 * @returns {Promise<Array>} Array of geocoding results in the same order as input
 */
const batchReverseGeocode = async (coordinates) => {
  // Process in parallel but with a small delay between requests to respect rate limits
  const results = [];
  
  for (let i = 0; i < coordinates.length; i++) {
    const { lat, lng } = coordinates[i];
    try {
      // Add a small delay between requests (100ms)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const result = await reverseGeocode(lat, lng);
      results.push(result);
    } catch (error) {
      logger.error(`Error geocoding coordinate ${i + 1}:`, error);
      results.push({
        formattedAddress: `${lat}, ${lng}`,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        error: error.message,
        raw: {}
      });
    }
  }
  
  return results;
};

module.exports = {
  reverseGeocode,
  batchReverseGeocode
};
