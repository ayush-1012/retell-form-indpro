import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import Retell from 'retell-sdk';
import { config, logConfiguration } from './config/environment.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: config.server.nodeEnv === 'production' 
    ? ['https://your-frontend-domain.vercel.app'] // Update this with your actual Vercel domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json());

// Log configuration on startup
logConfiguration();

// Initialize Retell client
const client = new Retell({
  apiKey: config.retell.apiKey,
});

// In-memory store for call_id to user info mapping
const callMap = {};

/**
 * POST /api/initiate-call
 * Initiates a phone call via Retell AI
 */
app.post('/api/initiate-call', async (req, res) => {
  const { phone, name, email } = req.body;

  // Validate input
  if (!phone || !email) {
    return res.status(400).json({ error: 'Phone and email are required.' });
  }

  try {
    // Create phone call using Retell API
    const phoneCallResponse = await client.call.createPhoneCall({
      from_number: config.retell.fromNumber,
      to_number: `+91${phone}`,
      override_agent_id: config.retell.agentId,
      metadata: {
        user_name: name,
        user_email: email,
        user_phone: phone,
        timestamp: new Date().toISOString()
      }
    });

    const callId = phoneCallResponse.call_id;

    // Store the mapping of call_id to user info
    callMap[callId] = {
      email: email,
      name: name,
      phone: phone,
      timestamp: new Date().toISOString()
    };

    console.log(`📞 Call initiated - Call ID: ${callId}, Email: ${email}, Name: ${name}`);
    console.log(`📊 Current callMap entries: ${Object.keys(callMap).length}`);

    res.status(200).json({ 
      message: 'Call initiated successfully.',
      callId: callId 
    });

  } catch (err) {
    console.error('❌ Call initiation failed:', err);
    res.status(500).json({ error: 'Call initiation failed.' });
  }
});

/**
 * POST / (Webhook endpoint)
 * Handles webhook events from Retell AI
 */
app.post('/', async (req, res) => {
  const { event, call } = req.body;

  // Validate webhook payload structure
  if (!event || !call || !call.call_id) {
    console.error('❌ Invalid webhook payload received:', req.body);
    return res.status(400).json({ error: 'Invalid payload structure' });
  }

  const { call_id, call_status, to_number, from_number, direction, disconnection_reason, end_timestamp } = call;
  
  console.log(`🔔 Webhook received - Event: ${event}, Call ID: ${call_id}, Status: ${call_status}, Direction: ${direction}`);

  try {
    // Handle different webhook events
    switch (event) {
      case 'call_started':
        console.log(`▶️ Call started for Call ID: ${call_id}`);
        break;

      case 'call_ended':
        console.log(`⏹️ Call ended for Call ID: ${call_id}, Reason: ${disconnection_reason}`);
        
        // Only process completed calls
        if (call_status === 'ended' && end_timestamp) {
          // Retrieve user info from callMap using call_id
          const userInfo = callMap[call_id];
          
          if (userInfo && userInfo.email) {
            console.log(`📋 Processing transcript for Call ID: ${call_id}, Email: ${userInfo.email}, Name: ${userInfo.name}`);
            
            // Send email with transcript (with retry logic)
            await getTranscriptAndSendEmail(call_id, userInfo.email, userInfo.name);
            
            // Clean up the mapping after successful processing
            delete callMap[call_id];
            console.log(`🧹 Cleaned up mapping for Call ID: ${call_id}`);
          } else {
            console.log(`⚠️ No email mapping found for Call ID: ${call_id}`);
            console.log(`📊 Available mappings: ${Object.keys(callMap).length}`);
          }
        } else {
          console.log(`⏭️ Call ${call_id} not processed - Status: ${call_status}, Disconnection: ${disconnection_reason}`);
          
          // Clean up mapping for failed calls
          if (callMap[call_id]) {
            delete callMap[call_id];
            console.log(`🧹 Cleaned up mapping for failed Call ID: ${call_id}`);
          }
        }
        break;

      case 'call_analyzed':
        console.log(`📊 Call analysis complete for Call ID: ${call_id}`);
        break;

      default:
        console.log(`❓ Unknown webhook event: ${event} for Call ID: ${call_id}`);
    }

    // Return success response (required by Retell AI)
    res.status(200).json({
      success: true,
      message: `Webhook processed for event: ${event}`
    });

  } catch (error) {
    console.error(`❌ Error processing webhook for Call ID: ${call_id}`, {
      error: error.message,
      stack: error.stack,
      event,
      call_status
    });

    // Return error response - triggers Retell AI's retry mechanism
    res.status(500).json({
      error: 'Internal server error',
      call_id
    });
  }
});

/**
 * Enhanced transcript retrieval and email sending with retry logic
 */
async function getTranscriptAndSendEmail(callId, email, name = 'User') {
  let retryCount = 0;

  async function attemptToGetTranscript() {
    try {
      console.log(`🔄 Attempting to get transcript for Call ID: ${callId} (Attempt ${retryCount + 1}/${config.call.maxRetries})`);
      
      // Get call info from Retell
      const callResponse = await client.call.retrieve(callId);
      
      if (!callResponse.transcript || callResponse.transcript === '') {
        retryCount++;
        
        if (retryCount < config.call.maxRetries) {
          console.log(`⏱️ Transcript not ready yet for Call ID: ${callId}. Retrying in ${config.call.retryDelay/1000} seconds...`);
          setTimeout(attemptToGetTranscript, config.call.retryDelay);
          return;
        } else {
          console.error(`❌ Failed to get transcript after ${config.call.maxRetries} attempts for Call ID: ${callId}`);
          await sendErrorEmail(email, name, callId);
          return;
        }
      }

      // Format the transcript
      const formattedTranscript = formatTranscript(callResponse.transcript);
      
      // Check if we should use console logging instead of email
      if (config.email.service === 'console') {
        console.log('\n🎉 ===== TRANSCRIPT READY =====');
        console.log(`📧 Would send to: ${email}`);
        console.log(`👤 Recipient: ${name}`);
        console.log(`📞 Call ID: ${callId}`);
        console.log(`⏱️ Duration: ${callResponse.duration_ms ? Math.round(callResponse.duration_ms / 1000) + ' seconds' : 'N/A'}`);
        console.log(`📝 Transcript:\n${formattedTranscript}`);
        console.log('🎉 ===========================\n');
        
        console.log(`✅ Transcript logged successfully for Call ID: ${callId}`);
        return;
      }
      
      // Send email using SendGrid or Gmail
      if (config.email.service === 'sendgrid') {
        await sendEmailWithSendGrid(email, name, formattedTranscript, callId, callResponse);
      } else {
        await sendEmailWithGmail(email, name, formattedTranscript, callId, callResponse);
      }

      console.log(`✅ Transcript emailed successfully to ${email} for Call ID: ${callId}`);

    } catch (err) {
      console.error(`❌ Error fetching/sending transcript for Call ID: ${callId}:`, err);
      await sendErrorEmail(email, name, callId);
    }
  }

  // Start the first attempt
  attemptToGetTranscript();
}

/**
 * Send email using SendGrid
 */
async function sendEmailWithSendGrid(email, name, transcript, callId, callData) {
  try {
    // Set SendGrid API key
    sgMail.setApiKey(config.email.sendgridApiKey);
    
    const duration = callData.duration_ms ? `${Math.round(callData.duration_ms / 1000)} seconds` : 'N/A';
    const startTime = callData.start_timestamp ? new Date(callData.start_timestamp).toLocaleString() : 'N/A';
    const endTime = callData.end_timestamp ? new Date(callData.end_timestamp).toLocaleString() : 'N/A';

    const htmlContent = generateTranscriptEmail(name, transcript, callId, callData);

    const msg = {
      to: email,
      from: {
        email: config.email.fromEmail,
        name: config.email.fromName
      },
      subject: `Call Transcript - ${new Date().toLocaleDateString()}`,
      html: htmlContent
    };

    await sgMail.send(msg);
    console.log(`✅ SendGrid email sent successfully to ${email} for Call ID: ${callId}`);
    
  } catch (error) {
    console.error(`❌ SendGrid email error for Call ID: ${callId}:`, error.message);
    throw error;
  }
}

/**
 * Send email using Gmail (fallback)
 */
async function sendEmailWithGmail(email, name, transcript, callId, callData) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.gmail.user,
        pass: config.email.gmail.password
      },
    });

    const htmlContent = generateTranscriptEmail(name, transcript, callId, callData);

    await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.gmail.user}>`,
      to: email,
      subject: `Call Transcript - ${new Date().toLocaleDateString()}`,
      html: htmlContent
    });

    console.log(`✅ Gmail email sent successfully to ${email} for Call ID: ${callId}`);
    
  } catch (error) {
    console.error(`❌ Gmail email error for Call ID: ${callId}:`, error.message);
    throw error;
  }
}

/**
 * Helper function to format transcript
 */
function formatTranscript(transcript) {
  if (!transcript) return 'No transcript available.';
  
  if (typeof transcript === 'string') {
    return transcript;
  }
  
  if (typeof transcript === 'object') {
    return JSON.stringify(transcript, null, 2);
  }
  
  return String(transcript);
}

/**
 * Generate HTML email template for transcript
 */
function generateTranscriptEmail(name, transcript, callId, callData) {
  const duration = callData.duration_ms ? `${Math.round(callData.duration_ms / 1000)} seconds` : 'N/A';
  const startTime = callData.start_timestamp ? new Date(callData.start_timestamp).toLocaleString() : 'N/A';
  const endTime = callData.end_timestamp ? new Date(callData.end_timestamp).toLocaleString() : 'N/A';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">📞 Call Transcript</h2>
      
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for your call. Below is the transcript and details of our conversation:</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">📊 Call Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">Start Time:</td>
            <td style="padding: 5px 0;">${startTime}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">End Time:</td>
            <td style="padding: 5px 0;">${endTime}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">Duration:</td>
            <td style="padding: 5px 0;">${duration}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">Call ID:</td>
            <td style="padding: 5px 0; font-family: monospace; font-size: 12px;">${callId}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50;">
        <h3 style="color: #333; margin-top: 0;">💬 Conversation Transcript</h3>
        <div style="background-color: white; padding: 15px; border-radius: 4px; max-height: 400px; overflow-y: auto;">
          <pre style="white-space: pre-wrap; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; margin: 0;">${transcript}</pre>
        </div>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
        <p>This transcript was automatically generated and sent by our system.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p style="margin-top: 15px;"><strong>${config.email.fromName}</strong></p>
      </div>
    </div>
  `;
}

/**
 * Helper function to send error notification email
 */
async function sendErrorEmail(email, name, callId) {
  try {
    const errorEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b6b;">⚠️ Call Completed</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your call has been completed successfully. However, we encountered an issue processing the transcript.</p>
          <p>Our technical team has been notified and will follow up with you shortly with the transcript.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Call ID:</strong> <code>${callId}</code></p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>We apologize for any inconvenience.</p>
          <p><strong>${config.email.fromName}</strong></p>
        </div>
      `;

    if (config.email.service === 'sendgrid') {
      sgMail.setApiKey(config.email.sendgridApiKey);
      
      const msg = {
        to: email,
        from: {
          email: config.email.fromEmail,
          name: config.email.fromName
        },
        subject: `Call Completed - Transcript Processing Issue`,
        html: errorEmailContent
      };

      await sgMail.send(msg);
    } else {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.gmail.user,
          pass: config.email.gmail.password
        },
      });

      await transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.gmail.user}>`,
        to: email,
        subject: `Call Completed - Transcript Processing Issue`,
        html: errorEmailContent
      });
    }

    console.log(`📧 Error notification email sent to ${email}`);
  } catch (err) {
    console.error('❌ Failed to send error notification email:', err);
  }
}

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    activeCallsCount: Object.keys(callMap).length,
    activeCalls: Object.keys(callMap),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

/**
 * GET /api/status  
 * API status endpoint
 */
app.get('/api/status', (req, res) => {
  res.status(200).json({
    message: 'Retell Form API is running',
    environment: config.server.nodeEnv,
    retellFromNumber: config.retell.fromNumber,
    activeCallMappings: Object.keys(callMap).length
  });
});

// Start server
app.listen(config.server.port, () => {
  console.log(`🚀 Server running on port ${config.server.port}`);
  console.log(`🌍 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.server.port}/health`);
  console.log(`📡 Webhook endpoint: http://localhost:${config.server.port}${config.retell.webhookEndpoint}`);
  console.log(`📞 Using Retell number: ${config.retell.fromNumber}\n`);
});

