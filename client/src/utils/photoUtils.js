/**
 * Utility functions for handling work order photos
 */

/**
 * Get a properly formatted photo URL
 * @param {Object|string} photo - Photo object or URL string
 * @returns {string|null} Formatted photo URL or null if invalid
 */
export const getPhotoUrl = (photo) => {
  if (!photo) return null;
  
  const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
  let photoPath = typeof photo === 'string' ? photo : (photo.url || photo.path);
  
  if (!photoPath) return null;
  
  // Return as is if already a complete URL or data URL
  if (typeof photoPath === 'string' && (photoPath.startsWith('http') || photoPath.startsWith('data:'))) {
    return photoPath;
  }
  
  // Handle different URL patterns
  if (typeof photoPath === 'string') {
    // Remove any existing API path to prevent duplicates
    const cleanPath = photoPath
      .replace(/^[\\/]+/, '') // Remove leading slashes
      .replace(/\/+/g, '/') // Replace multiple slashes with single
      .replace(/^api\/v1\//i, '') // Remove leading api/v1/
      .replace(/^uploads\//, '') // Remove leading uploads/
      .replace(/^photos\//, '') // Remove leading photos/
      .replace(/^api\/v1\/uploads\/photos\//i, '') // Remove full path if present
      .replace(/^uploads\/photos\//i, '') // Remove uploads/photos/ if present
      .trim();
    
    if (!cleanPath) return null;
    
    // Construct the final URL
    return `${apiUrl.replace(/\/+$/, '')}/api/v1/uploads/photos/${cleanPath.replace(/^\/+/, '')}`;
  }
  
  return null;
};

/**
 * Validate a photo file before upload
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export const validatePhotoFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' };
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).' 
    };
  }
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File is too large. Maximum size is 5MB.' 
    };
  }
  
  return { valid: true };
};
