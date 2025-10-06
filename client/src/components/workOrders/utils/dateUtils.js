/**
 * Formats a date string or Date object to a localized date string
 * @param {string|Date} date - The date to format
 * @param {Object} options - Options for date formatting
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options });
};

/**
 * Formats a date to YYYY-MM-DD format for date inputs
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parses a date string from YYYY-MM-DD format
 * @param {string} dateString - The date string to parse
 * @returns {Date} Parsed Date object
 */
export const parseDateFromInput = (dateString) => {
  if (!dateString) return null;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Calculates the difference in days between two dates
 * @param {Date|string} startDate - The start date
 * @param {Date|string} endDate - The end date
 * @returns {number} Number of days between the dates
 */
export const getDaysBetween = (startDate, endDate) => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Adds days to a date
 * @param {Date|string} date - The base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date with days added
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Checks if a date is today
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  const today = new Date();
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Checks if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is in the past
 */
export const isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = typeof date === 'string' ? new Date(date) : new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate < today;
};

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
export const formatDuration = (milliseconds) => {
  if (!milliseconds && milliseconds !== 0) return '';
  
  const seconds = Math.floor(milliseconds / 1000);
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
