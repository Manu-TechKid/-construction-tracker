# 🚀 SiteGround Frontend Deployment Guide

## 📋 SiteGround Deployment Checklist

✅ **Production build created** - React app compiled successfully
✅ **Static files ready** - All assets in `/client/build/` directory
✅ **.htaccess configured** - React Router support enabled
✅ **No hardcoded URLs** - API calls use relative paths

## 🔧 SiteGround Deployment Steps

### 1. **Upload Files to SiteGround**

**Method 1: FTP Upload (Recommended)**
1. Connect to your SiteGround hosting via FTP
2. Navigate to `public_html` or your web root directory
3. Upload the entire `/client/build/` directory contents
4. Ensure `.htaccess` file is uploaded (it handles React Router)

**Method 2: SiteGround File Manager**
1. Go to SiteGround cPanel → File Manager
2. Navigate to `public_html` directory
3. Click "Upload" and select all files from `/client/build/`
4. Upload `.htaccess` file to the root directory

### 2. **Verify Upload**
After upload, check these files exist in your web root:
- `index.html` ✅
- `static/css/main.[hash].css` ✅
- `static/js/main.[hash].js` ✅
- `.htaccess` ✅

### 3. **Test Frontend**
Open your SiteGround URL in browser:
- Should load the Construction Tracker application
- All routes should work (React Router handles client-side routing)
- No console errors in browser developer tools

## 🌐 Backend Configuration (Render)

The backend is already configured for Render deployment:

### Current Render Setup:
- **Service Name**: `construction-tracker-webapp`
- **Auto-deploy**: Enabled from GitHub main branch
- **Environment**: Production with MongoDB Atlas
- **Health Check**: `/api/v1/health`

### Backend URLs:
- **Render Dashboard**: https://dashboard.render.com
- **Deployed Backend**: https://your-app.onrender.com
- **API Base**: https://your-app.onrender.com/api/v1

## 🔗 API Integration

The frontend automatically detects the environment:

```javascript
// In apiSlice.js
const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api/v1'
    : (typeof window !== 'undefined' ? window.location.origin + '/api/v1' : ''));
```

**Production Behavior:**
- SiteGround frontend → SiteGround domain
- API calls → Same domain + `/api/v1` (points to Render backend)

## 🛠️ Troubleshooting

### Common Issues:

**1. React Router not working (404 on refresh)**
- Ensure `.htaccess` is in the web root
- Check file permissions (644 for files, 755 for directories)

**2. API calls failing**
- Verify Render backend is deployed and healthy
- Check browser console for CORS errors
- Ensure MongoDB connection is working

**3. Assets not loading**
- Check file permissions
- Verify all files uploaded correctly
- Clear browser cache

### File Permissions:
```bash
# Set correct permissions via SSH (if available)
chmod 644 index.html
chmod 644 static/css/*.css
chmod 644 static/js/*.js
chmod 755 static/css/
chmod 755 static/js/
```

## 📊 Deployment Status

✅ **Frontend**: Ready for SiteGround upload
✅ **Backend**: Configured for Render auto-deployment
✅ **Database**: MongoDB Atlas configured
✅ **Environment**: Production variables set

## 🚀 Next Steps

1. **Upload to SiteGround** (Frontend files)
2. **Verify GitHub commit** (Triggers Render backend deployment)
3. **Test both frontend and backend**
4. **Configure DNS** (if needed for custom domain)

## 🔧 Environment Variables (Backend)

The following variables are configured in Render:

```bash
NODE_ENV=production
PORT=10000
MONGO_URI=${MONGO_URI} # From MongoDB Atlas
JWT_SECRET=${JWT_SECRET} # Auto-generated
REACT_APP_API_URL=${RENDER_EXTERNAL_URL}/api/v1
```

## 📝 Production URLs

After deployment:
- **Frontend**: https://your-siteground-domain.com
- **Backend API**: https://your-render-app.onrender.com/api/v1
- **Health Check**: https://your-render-app.onrender.com/api/v1/health

The frontend will automatically use the correct API endpoint based on the domain.
