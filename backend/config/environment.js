/**
 * Environment Configuration
 * Centralized configuration for all environment variables
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'RETELL_API_KEY',
  'RETELL_AGENT_ID'
];

// Add email password requirement only if using Gmail
if (process.env.EMAIL_SERVICE === 'gmail') {
  requiredEnvVars.push('EMAIL_PASS');
}

// Add SendGrid API key requirement if using SendGrid
if (process.env.EMAIL_SERVICE === 'sendgrid') {
  requiredEnvVars.push('SENDGRID_API_KEY');
}

// Check if all required environment variables are present
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Export configuration object
export const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Retell AI Configuration
  retell: {
    apiKey: process.env.RETELL_API_KEY,
    agentId: process.env.RETELL_AGENT_ID,
    fromNumber: process.env.RETELL_FROM_NUMBER || '+18783029885',
    baseUrl: 'https://api.retellai.com',
    webhookEndpoint: process.env.WEBHOOK_ENDPOINT || '/'
  },

  // Email Configuration
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    
    // SendGrid Configuration
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER || 'ttee20243@gmail.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Your Company',
    
    // Gmail Backup Configuration
    gmail: {
      user: process.env.GMAIL_USER || 'ayus.hhnew@gmail.com',
      password: process.env.GMAIL_PASS
    }
  },

  // Call Configuration
  call: {
    maxRetries: parseInt(process.env.MAX_TRANSCRIPT_RETRIES) || 5,
    retryDelay: parseInt(process.env.RETRY_DELAY_MS) || 15000,
    timeout: parseInt(process.env.CALL_TIMEOUT_MS) || 10000
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableDebug: process.env.ENABLE_DEBUG === 'true'
  }
};

// Helper function to log configuration (without sensitive data)
export const logConfiguration = () => {
  console.log('📋 Server Configuration:');
  console.log(`   • Port: ${config.server.port}`);
  console.log(`   • Environment: ${config.server.nodeEnv}`);
  console.log(`   • From Number: ${config.retell.fromNumber}`);
  console.log(`   • Max Retries: ${config.call.maxRetries}`);
  console.log(`   • Retry Delay: ${config.call.retryDelay}ms`);
  console.log(`   • Email Service: ${config.email.service}`);
  console.log('✅ Configuration loaded successfully\n');
};

export default config;
