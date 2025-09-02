import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import Retell from 'retell-sdk';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
dotenv.config();
// Middleware
app.use(cors());
app.use(bodyParser.json());
//call initialization
const client = new Retell({
  apiKey: process.env.RETELL_API_KEY,
});
const callMap = {}; // In-memory store for call_id to email mapping
app.post('/api/initiate-call', async (req, res) => {
  const { phone, name, email } = req.body;
  // Validate input
  if (!phone || !email) {
    return res.status(400).send({ error: 'Phone and email are required.' });
  }
  try {
    const phoneCallResponse = await client.call.createPhoneCall({
      from_number: '+18783029885',
      to_number: `+91${phone}`,
      agent_id: process.env.RETELL_AGENT_ID, // Add this if you have a specific agent
    },
    {
        headers: {
            authorization: `Bearer ${process.env.RETELL_API_KEY}`,
            'Content-Type': 'application/json',
        }
    });
    const callId = phoneCallResponse.call_id;
    // CRITICAL: Store the mapping of call_id to user info
    callMap[callId] = {
      email: email,
      name: name,
      phone: phone
    };
    console.log(`Call initiated - Call ID: ${callId}, Email: ${email}, Name: ${name}`);
    console.log('Current callMap:', callMap);
    res.status(200).send({ 
      message: 'Call initiated successfully.',
      callId: callId 
    });
  } catch (err) {
    console.error('Call initiation failed:', err);
    res.status(500).send({ error: 'Call initiation failed.' });
  }
});

app.post('/', async (req, res) => {
    const { event, call } = req.body;
    // Validate webhook payload structure
    if (!event || !call || !call.call_id) {
        console.error('Invalid webhook payload received:', req.body);
        return res.status(400).json({ error: 'Invalid payload structure' });
    }
    const { call_id, call_status, to_number, from_number, direction, disconnection_reason, end_timestamp } = call;
    console.log(`Webhook received - Event: ${event}, Call ID: ${call_id}, Status: ${call_status}, Direction: ${direction}`);
    console.log('Current callMap state:', callMap);
    try {
        // Handle different webhook events
        switch (event) {
            case 'call_started':
                console.log(`Call started for Call ID: ${call_id}`);
                // You can add any call start logic here
                break;
            case 'call_ended':
                console.log(`Call ended for Call ID: ${call_id}, Reason: ${disconnection_reason}`);
                // Only process completed calls (registered status means call was successful)
                if (call_status === 'ended' && end_timestamp) {
                    // Retrieve user info from callMap using call_id
                    const userInfo = callMap[call_id];
                    if (userInfo && userInfo.email) {
                        console.log(`Processing transcript for Call ID: ${call_id}, Email: ${userInfo.email}, Name: ${userInfo.name}`);
                        // Send email with transcript
                        await getTranscriptAndSendEmail(call_id, userInfo.email, userInfo.name);
                        // Clean up the mapping after successful email send
                        delete callMap[call_id];
                        console.log(`Cleaned up mapping for Call ID: ${call_id}`);
                    } else {
                        console.log(`No email mapping found for Call ID: ${call_id}`);
                        console.log('Available mappings:', Object.keys(callMap));
                    }
                } else {
                    console.log(`Call ${call_id} not processed - Status: ${call_status}, Disconnection: ${disconnection_reason}`);
                    // Clean up mapping for failed calls
                    if (callMap[call_id]) {
                        delete callMap[call_id];
                        console.log(`Cleaned up mapping for failed Call ID: ${call_id}`);
                    }
                }
                break;
            case 'call_analyzed':
                console.log(`Call analysis complete for Call ID: ${call_id}`);
                // The transcript should be available now if you need it here
                break;
            default:
                console.log(`Unknown webhook event: ${event} for Call ID: ${call_id}`);
        }
        // Return success response (2xx required by Retell AI)
        res.status(200).json({
            success: true,
            message: `Webhook processed for event: ${event}`
        });
    } catch (error) {
        console.error(`Error processing webhook for Call ID: ${call_id}`, {
            error: error.message,
            stack: error.stack,
            event,
            call_status
        });
        // Return error response - this will trigger Retell AI's retry mechanism
        res.status(500).json({
            error: 'Internal server error',
            call_id
        });
    }
});

// Improved transcript retrieval and email sending
async function getTranscriptAndSendEmail(callId, email, name = 'User') {
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 15000; // 15 seconds
  async function attemptToGetTranscript() {
    try {
      console.log(`Attempting to get transcript for Call ID: ${callId} (Attempt ${retryCount + 1}/${maxRetries})`);
      // Get call info from Retell
      const callResponse = await client.call.retrieve(callId);
      if (!callResponse.transcript || callResponse.transcript === '') {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Transcript not ready yet for Call ID: ${callId}. Retrying in ${retryDelay/1000} seconds...`);
          setTimeout(attemptToGetTranscript, retryDelay);
          return;
        } else {
          console.error(`Failed to get transcript after ${maxRetries} attempts for Call ID: ${callId}`);
          await sendErrorEmail(email, name, callId);
          return;
        }
      }
      // Format the transcript
      const formattedTranscript = formatTranscript(callResponse.transcript);
      // Send transcript via email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "ayus.hhnew@gmail.com",
          pass: process.env.EMAIL_PASS
        },
      });
      const mailOptions = {
        from: '"Your Company" <ayus.hhnew@gmail.com>',
        to: email,
        subject: `Call Transcript - ${new Date().toLocaleDateString()}`,
        html: `
<h2>Call Transcript</h2>
<p>Dear ${name},</p>
<p>Thank you for your call. Below is the transcript of our conversation:</p>
<hr>
<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
<pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${formattedTranscript}</pre>
</div>
<hr>
<p><small>Call ID: ${callId}</small></p>
<p><small>Date: ${new Date().toLocaleString()}</small></p>
        `
      };
      await transporter.sendMail(mailOptions);
      console.log(`Transcript emailed successfully to ${email} for Call ID: ${callId}`);
    } catch (err) {
      console.error(`Error fetching/sending transcript for Call ID: ${callId}:`, err);
      // Send error notification email
      await sendErrorEmail(email, name, callId);
    }
  }
  // Start the first attempt
  attemptToGetTranscript();
}
 
// Helper function to format transcript
function formatTranscript(transcript) {
  if (!transcript) return 'No transcript available.';
  // If transcript is already formatted, return as is
  if (typeof transcript === 'string') {
    return transcript;
  }
  // If transcript is an object/array, format it
  if (typeof transcript === 'object') {
    return JSON.stringify(transcript, null, 2);
  }
  return String(transcript);
}
 
// Helper function to send error email
async function sendErrorEmail(email, name, callId) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "ayus.hhnew@gmail.com",
        pass: process.env.EMAIL_PASS
      },
    });
    await transporter.sendMail({
      from: '"Your Company" <ayus.hhnew@gmail.com>',
      to: email,
      subject: `Call Completed - Transcript Processing Issue`,
      html: `
<h2>Call Completed</h2>
<p>Dear ${name},</p>
<p>Your call has been completed. However, we encountered an issue processing the transcript.</p>
<p>Our team has been notified and will follow up with you shortly.</p>
<hr>
<p><small>Call ID: ${callId}</small></p>
<p><small>Date: ${new Date().toLocaleString()}</small></p>
      `
    });
    console.log(`Error notification email sent to ${email}`);
  } catch (err) {
    console.error('Failed to send error notification email:', err);
  }
}
 
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    activeCallsCount: Object.keys(callMap).length,
    timestamp: new Date().toISOString()
  });
});
 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhook`);
});





//mail webhook
// app.post('/api/webhook', async (req, res) => {
//     const { call_id, call_status, to_number } = req.body;

//     console.log(`webhook received for Call ID: ${call_id}`);

//     try{
//         if (call_status === 'registered') {
//         const email = callMap[to_number];
//         if (email) {
//             await getTranscriptAndSendEmail(call_id, email);
//         } else {
//             console.log(`No email found for Call ID: ${call_id}`);
//         }
//     }

//     res.status(200).send('Webhook received');
//     }catch(err){
//         console.error(`Error processing webhook for Call ID: ${call_id}`, err);
//         res.status(500).send('Internal server error');
//     }

// });

// third party mail service

// import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

// const mailerSend = new MailerSend({
//   apiKey: process.env.MAILER_SERVICE,
// });

// const sentFrom = new Sender("ayushpal274@gmail.com", "AYUSH");

// const recipients = [
//   new Recipient(`${email}`, "client") // Replace with actual recipient email) 
// ];

// const emailParams = new EmailParams()
//   .setFrom(sentFrom)
//   .setTo(recipients)
//   .setReplyTo(sentFrom)
//   .setSubject(`Transcript for Call ID: ${callId}`)
//   .setText(`Here is the transcript for your call:\n\n${transcript}`); // Replace 'transcript' with actual transcript variable

// await mailerSend.email.send(emailParams);

