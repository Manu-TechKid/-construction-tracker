const UAParser = require('ua-parser-js');

/**
 * Extracts and parses device information from request headers
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
const getDeviceInfo = (req) => {
  // Default values
  const deviceInfo = {
    userAgent: '',
    platform: 'unknown',
    os: 'unknown',
    browser: 'unknown',
    isMobile: false,
    ip: getClientIp(req),
    timestamp: new Date()
  };

  try {
    // Get user agent from headers
    const userAgent = req.headers['user-agent'] || '';
    deviceInfo.userAgent = userAgent;

    // Parse user agent
    if (userAgent) {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      
      deviceInfo.browser = result.browser.name || 'unknown';
      deviceInfo.os = result.os.name || 'unknown';
      deviceInfo.platform = result.device.type || 'desktop';
      deviceInfo.isMobile = result.device.type === 'mobile' || result.device.type === 'tablet';
      
      // Add version info if available
      if (result.browser.version) {
        deviceInfo.browser += ` ${result.browser.version}`;
      }
      if (result.os.version) {
        deviceInfo.os += ` ${result.os.version}`;
      }
    }
    
    // Get additional info from headers
    deviceInfo.language = req.headers['accept-language'] || '';
    
  } catch (error) {
    console.error('Error parsing device info:', error);
  }

  return deviceInfo;
};

/**
 * Extracts client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
const getClientIp = (req) => {
  // Check for forwarded IP (if behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  
  // Fall back to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.connection?.socket?.remoteAddress || 'unknown';
};

module.exports = {
  getDeviceInfo,
  getClientIp
};
