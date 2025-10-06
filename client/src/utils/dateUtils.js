/**
 * Format a date object into a readable string
 * @param {Date|string} date - The date to format
 * @param {string} format - The format to use (short, medium, long, full, datetime)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'medium') => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const options = {};
  
  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = 'numeric';
      options.day = 'numeric';
      break;
    case 'medium':
      options.year = 'numeric';
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'long':
      options.weekday = 'long';
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'full':
      options.weekday = 'long';
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = 'short';
      options.day = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    default:
      options.year = 'numeric';
      options.month = 'short';
      options.day = 'numeric';
  }
  
  return d.toLocaleDateString('en-US', options);
};

/**
 * Calculate the time difference between now and a given date
 * @param {Date|string} date - The date to compare
 * @returns {string} Human-readable time difference (e.g., "2 days ago")
 */
export const getTimeAgo = (date) => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return `${interval} year${interval === 1 ? '' : 's'} ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return `${interval} month${interval === 1 ? '' : 's'} ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return `${interval} day${interval === 1 ? '' : 's'} ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  }
  
  return 'Just now';
};

/**
 * Format a duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return '';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
};

/**
 * Check if a date is today
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is in the past
 */
export const isPast = (date) => {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return d < now;
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is in the future
 */
export const isFuture = (date) => {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return d > now;
};

export const timeAgo = getTimeAgo; // Alias for backward compatibility

const dateUtils = {
  formatDate,
  getTimeAgo,
  timeAgo: getTimeAgo,
  formatDuration,
  isToday,
  isPast,
  isFuture,
};

export default dateUtils;
