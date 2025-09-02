# 🚀 Deployment Guide

## Quick Deployment Options

### Option 1: Railway (Recommended for Backend) + Vercel (Frontend)

#### **Deploy Backend to Railway:**

1. **Create Railway Account**: https://railway.app/
2. **Connect GitHub**: Link your repository
3. **Create New Project** → Deploy from GitHub repo
4. **Select Backend Folder**: Configure to deploy from `/backend` directory
5. **Set Environment Variables**: Copy from `backend/.env.production`
6. **Deploy**: Railway will automatically build and deploy

#### **Deploy Frontend to Vercel:**

1. **Create Vercel Account**: https://vercel.com/
2. **Import Project**: Connect your GitHub repository
3. **Configure Project**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Set Environment Variables**:
   ```
   VITE_API_URL=https://your-railway-backend-url.railway.app/api
   ```
5. **Deploy**: Vercel will build and deploy automatically

### Option 2: All-in-One Railway Deployment

1. **Deploy Backend**: Follow Railway steps above
2. **Deploy Frontend**: Create another Railway project for frontend
3. **Update CORS**: Add frontend URL to backend CORS settings

## 🔧 Post-Deployment Setup

### 1. Update Retell AI Webhook URL
- Go to Retell AI Dashboard
- Update webhook URL to: `https://your-backend-url.railway.app/`

### 2. Update Frontend API URL
- Update `frontend/.env.production`:
  ```
  VITE_API_URL=https://your-backend-url.railway.app/api
  ```

### 3. Update CORS Settings
- Update `backend/express.js` CORS origin:
  ```javascript
  origin: ['https://your-frontend-domain.vercel.app']
  ```

## 📋 Environment Variables for Production

### Backend (Railway/Render):
```bash
PORT=3000
NODE_ENV=production
RETELL_API_KEY=your_key_here
RETELL_AGENT_ID=your_agent_id_here
SENDGRID_API_KEY=your_sendgrid_key_here
EMAIL_FROM_EMAIL=ttee20243@gmail.com
EMAIL_FROM_NAME=Rahul
# ... copy all from .env.production
```

### Frontend (Vercel):
```bash
VITE_API_URL=https://your-backend-url.railway.app/api
```

## 🔍 Testing Deployed Application

1. **Health Check**: `https://your-backend-url.railway.app/health`
2. **Frontend**: `https://your-frontend-domain.vercel.app`
3. **Form Submission**: Test the complete flow
4. **Webhook**: Monitor logs in Railway dashboard

## 🐛 Troubleshooting

### Common Issues:
1. **CORS Errors**: Update CORS origins in backend
2. **Environment Variables**: Ensure all variables are set correctly
3. **Build Errors**: Check logs in deployment platform
4. **Webhook Not Working**: Verify Retell AI webhook URL

### Useful Commands:
```bash
# Test health endpoint
curl https://your-backend-url.railway.app/health

# Check logs
railway logs (in Railway)
vercel logs (in Vercel)
```

## 📞 Support

If you encounter issues:
1. Check deployment platform logs
2. Verify environment variables
3. Test locally first
4. Check webhook configuration in Retell AI

## 🎯 Production Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS updated for production domains
- [ ] Retell AI webhook URL updated
- [ ] SendGrid API working
- [ ] Health check endpoint responding
- [ ] Test call flow working end-to-end
