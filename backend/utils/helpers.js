/**
 * Utility functions for the Retell Form Integration project
 */

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePhoneNumber = (phone) => {
  // Remove any non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's exactly 10 digits
  return /^[0-9]{10}$/.test(cleanPhone);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
  }
  
  return phone; // Return original if not 10 digits
};

/**
 * Generate a simple UUID for tracking purposes
 * @returns {string} - Simple UUID
 */
export const generateSimpleId = () => {
  return 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

/**
 * Format duration in milliseconds to human readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Human readable duration
 */
export const formatDuration = (ms) => {
  if (!ms || ms < 0) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Log with timestamp and emoji
 * @param {string} level - Log level (info, error, warning, success)
 * @param {string} message - Message to log
 * @param {object} data - Optional data to log
 */
export const logWithEmoji = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const emojis = {
    info: 'ℹ️',
    error: '❌',
    warning: '⚠️',
    success: '✅',
    debug: '🐛'
  };
  
  const emoji = emojis[level] || 'ℹ️';
  const logMessage = `${emoji} [${timestamp}] ${message}`;
  
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

/**
 * Retry function with exponential backoff
 * @param {function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - Promise that resolves with function result
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logWithEmoji('warning', `Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Check if environment is development
 * @returns {boolean} - True if development environment
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Get client IP address from request
 * @param {object} req - Express request object
 * @returns {string} - Client IP address
 */
export const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
};

export default {
  validatePhoneNumber,
  validateEmail,
  formatPhoneNumber,
  generateSimpleId,
  sanitizeInput,
  formatDuration,
  logWithEmoji,
  retryWithBackoff,
  isDevelopment,
  getClientIP
};
