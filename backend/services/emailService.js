/**
 * Email Service Module
 * Supports MailerSend and Gmail as backup
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';

class EmailService {
  constructor() {
    this.mailerSend = null;
    this.gmailTransporter = null;
    
    // Initialize MailerSend if API key is available
    if (config.email.mailerSendApiKey && config.email.service === 'mailersend') {
      this.mailerSend = new MailerSend({
        apiKey: config.email.mailerSendApiKey,
      });
      console.log('📧 MailerSend initialized');
    }
    
    // Initialize Gmail as backup
    if (config.email.gmail.password) {
      this.gmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.gmail.user,
          pass: config.email.gmail.password
        },
      });
      console.log('📧 Gmail backup initialized');
    }
  }

  /**
   * Send email using MailerSend (primary) or Gmail (backup)
   */
  async sendTranscriptEmail(recipientEmail, recipientName, transcript, callData) {
    const callId = callData.call_id;
    const duration = callData.duration_ms ? `${Math.round(callData.duration_ms / 1000)} seconds` : 'N/A';
    const startTime = callData.start_timestamp ? new Date(callData.start_timestamp).toLocaleString() : 'N/A';
    const endTime = callData.end_timestamp ? new Date(callData.end_timestamp).toLocaleString() : 'N/A';

    const subject = `Call Transcript - ${new Date().toLocaleDateString()}`;
    const htmlContent = this.generateTranscriptHTML(recipientName, transcript, callId, callData);

    try {
      // Try MailerSend first
      if (this.mailerSend) {
        console.log('📧 Sending via MailerSend...');
        await this.sendViaMailerSend(recipientEmail, recipientName, subject, htmlContent);
        console.log(`✅ Transcript emailed via MailerSend to ${recipientEmail} for Call ID: ${callId}`);
        return;
      }
      
      // Fallback to Gmail
      if (this.gmailTransporter) {
        console.log('📧 Sending via Gmail backup...');
        await this.sendViaGmail(recipientEmail, subject, htmlContent);
        console.log(`✅ Transcript emailed via Gmail to ${recipientEmail} for Call ID: ${callId}`);
        return;
      }
      
      throw new Error('No email service configured');
      
    } catch (error) {
      console.error(`❌ Failed to send transcript email: ${error.message}`);
      
      // Try backup service if primary fails
      if (this.mailerSend && this.gmailTransporter) {
        try {
          console.log('🔄 Trying Gmail backup...');
          await this.sendViaGmail(recipientEmail, subject, htmlContent);
          console.log(`✅ Transcript emailed via Gmail backup to ${recipientEmail}`);
          return;
        } catch (backupError) {
          console.error(`❌ Gmail backup also failed: ${backupError.message}`);
        }
      }
      
      // Send error notification
      await this.sendErrorNotification(recipientEmail, recipientName, callId);
      throw error;
    }
  }

  /**
   * Send via MailerSend
   */
  async sendViaMailerSend(recipientEmail, recipientName, subject, htmlContent) {
    const sentFrom = new Sender(config.email.fromEmail, config.email.fromName);
    const recipients = [new Recipient(recipientEmail, recipientName)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject(subject)
      .setHtml(htmlContent);

    await this.mailerSend.email.send(emailParams);
  }

  /**
   * Send via Gmail
   */
  async sendViaGmail(recipientEmail, subject, htmlContent) {
    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.gmail.user}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    };

    await this.gmailTransporter.sendMail(mailOptions);
  }

  /**
   * Send error notification email
   */
  async sendErrorNotification(recipientEmail, recipientName, callId) {
    try {
      const subject = `Call Completed - Transcript Processing Issue`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b6b;">⚠️ Call Completed</h2>
          <p>Dear <strong>${recipientName}</strong>,</p>
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

      if (this.mailerSend) {
        await this.sendViaMailerSend(recipientEmail, recipientName, subject, htmlContent);
      } else if (this.gmailTransporter) {
        await this.sendViaGmail(recipientEmail, subject, htmlContent);
      }
      
      console.log(`📧 Error notification sent to ${recipientEmail}`);
    } catch (err) {
      console.error('❌ Failed to send error notification:', err.message);
    }
  }

  /**
   * Generate HTML template for transcript email
   */
  generateTranscriptHTML(name, transcript, callId, callData) {
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
              <td style="padding: 5px 0; font-weight: bold;">Status:</td>
              <td style="padding: 5px 0;">${callData.disconnection_reason || 'Completed'}</td>
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
            <pre style="white-space: pre-wrap; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; margin: 0;">${transcript || 'No transcript available'}</pre>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p>This transcript was automatically generated and sent by our system.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p style="margin-top: 15px;"><strong>${config.email.fromName}</strong></p>
          <p style="color: #999;">Powered by Retell AI & MailerSend</p>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
