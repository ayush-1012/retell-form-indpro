# Retell AI Form Integration Project

A barebone implementation that collects user details, initiates Retell AI phone calls, and automatically emails call transcripts to users.

## 🚀 Project Overview

This project consists of:
1. **Frontend**: React form to collect user details (name, phone, email)
2. **Backend**: Express.js server that integrates with Retell AI and handles email delivery
3. **Workflow**: 
   - User submits form → Retell AI call initiated → Webhook receives call updates → Transcript emailed to user

## 📁 Project Structure

```
├── backend/
│   ├── express.js              # Main server file
│   ├── package.json           # Backend dependencies
│   ├── .env.example          # Environment variables template
│   └── config/
│       └── environment.js    # Centralized configuration
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── main.jsx          # React entry point
│   │   └── ...
│   ├── package.json          # Frontend dependencies
│   └── ...
└── README.md
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- Gmail account with App Password enabled
- Retell AI account with API key and agent ID

### 2. Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Retell AI Configuration (REQUIRED)
   RETELL_API_KEY=your_retell_api_key_here
   RETELL_AGENT_ID=your_retell_agent_id_here
   RETELL_FROM_NUMBER=+18783029885

   # Email Configuration (REQUIRED)
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password_here
   EMAIL_FROM_NAME=Your Company Name

   # Optional Configuration
   MAX_TRANSCRIPT_RETRIES=5
   RETRY_DELAY_MS=15000
   ```

5. **Start the backend server:**
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

### 4. Configure Retell AI Webhook

In your Retell AI dashboard, set your webhook URL to:
```
http://your-domain.com/
```

For local development with ngrok:
```
https://your-ngrok-url.ngrok.io/
```

## 📱 Usage Flow

1. **User submits form** with name, phone number, and email
2. **Backend initiates Retell AI call** to the provided phone number
3. **Retell AI webhook sends updates** as call progresses
4. **When call ends**, backend retrieves transcript with retry logic
5. **Transcript is emailed** to user with call details and metadata

## 🔧 API Endpoints

### Backend Endpoints

- **POST /api/initiate-call** - Initiates a phone call
  ```json
  {
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com"
  }
  ```

- **POST /** - Webhook endpoint for Retell AI callbacks

- **GET /health** - Health check endpoint

- **GET /api/status** - API status and configuration info

## 🎯 Key Features

### ✅ Implemented Features

- **Form validation** for phone numbers and email addresses
- **Retell AI integration** with proper error handling
- **Webhook processing** for call events (started, ended, analyzed)
- **Retry logic** for transcript retrieval (configurable attempts)
- **Email delivery** with HTML templates and call metadata
- **Error handling** with fallback error notification emails
- **Logging** with emojis for easy debugging
- **Health monitoring** endpoints
- **Environment configuration** with validation

### 🔄 Call Flow

1. **Call Initiated** (`call_started` webhook)
2. **Call Ended** (`call_ended` webhook)
3. **Transcript Retrieved** (with 5 retry attempts, 15-second intervals)
4. **Email Sent** (formatted HTML with call details)

### 📧 Email Features

- **Professional HTML templates**
- **Call metadata** (duration, timestamps, call ID)
- **Formatted transcripts** with proper styling
- **Error notifications** if transcript processing fails

## 🚨 Troubleshooting

### Common Issues

1. **Environment variables not loaded**
   - Ensure `.env` file exists in backend directory
   - Check that all required variables are set

2. **Retell AI calls not working**
   - Verify API key and agent ID are correct
   - Check that phone number format is correct (+91 prefix)

3. **Emails not sending**
   - Ensure Gmail App Password is generated and used
   - Check that 2FA is enabled on Gmail account

4. **Webhook not receiving events**
   - Verify webhook URL is correctly configured in Retell AI dashboard
   - Use ngrok for local development testing

### Debug Commands

```bash
# Check server health
curl http://localhost:3000/health

# Check API status
curl http://localhost:3000/api/status

# View server logs
npm run dev
```

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- Implement proper input validation and sanitization
- Consider rate limiting for production deployments

## 📝 Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `RETELL_API_KEY` | ✅ | Your Retell AI API key | - |
| `RETELL_AGENT_ID` | ✅ | Your Retell AI agent ID | - |
| `EMAIL_PASS` | ✅ | Gmail app password | - |
| `PORT` | ❌ | Server port | 3000 |
| `RETELL_FROM_NUMBER` | ❌ | Your Retell phone number | +18783029885 |
| `EMAIL_USER` | ❌ | Gmail address | ayus.hhnew@gmail.com |
| `MAX_TRANSCRIPT_RETRIES` | ❌ | Transcript retry attempts | 5 |
| `RETRY_DELAY_MS` | ❌ | Delay between retries | 15000 |

## 🎯 Next Steps

To enhance this project, consider adding:

- Database integration for persistent call storage
- User authentication and call history
- Dashboard for monitoring calls and analytics
- SMS notifications as backup delivery method
- Call recording storage and playback
- Multi-language support
- Advanced error monitoring and alerting

## 📞 Support

If you encounter any issues or need assistance:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all environment variables are correctly set
4. Test with the health check endpoints
