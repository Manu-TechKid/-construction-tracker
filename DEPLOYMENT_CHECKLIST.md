# Construction Tracker - Deployment Checklist

## 🚀 Pre-Deployment Steps

### 1. Environment Variables Setup
- [ ] **MongoDB Atlas**
  - Verify connection string is correct
  - Ensure IP whitelisting is configured
  - Check database user permissions

- [ ] **JWT Configuration**
  - Generate a strong JWT_SECRET
  - Set appropriate token expiration

- [ ] **Email Service** (if used)
  - Configure SMTP settings
  - Verify email credentials

### 2. Render.com Setup
- [ ] **New Web Service**
  - Connect GitHub repository
  - Select main branch
  - Set build command: `npm run build:prod`
  - Set start command: `npm run start:prod`
  - Set environment to Node.js 18

- [ ] **Environment Variables**
  ```
  NODE_ENV=production
  PORT=10000
  MONGO_URI=your_mongodb_connection_string
  JWT_SECRET=your_secure_jwt_secret
  JWT_EXPIRES_IN=90d
  JWT_COOKIE_EXPIRES=90
  REACT_APP_API_URL=${RENDER_EXTERNAL_URL}/api/v1
  ```

### 3. Client Configuration
- [ ] Update `client/package.json`
  - Verify all dependencies
  - Check build scripts

- [ ] Update API base URL
  - Ensure it points to the new Render URL

## 🛠️ Deployment Steps

1. **Push Changes to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Deploy to Render**
   - Go to Render Dashboard
   - Create new Web Service
   - Connect GitHub repository
   - Configure as per settings above
   - Deploy

3. **Verify Deployment**
   - Check build logs for errors
   - Test API endpoints
   - Verify static files are served
   - Test authentication flow

## 🔍 Post-Deployment Tests

### API Endpoints
```
GET    /api/v1/health       # Health check
POST   /api/v1/auth/login   # User login
GET    /api/v1/work-orders  # Work orders list
```

### Frontend Tests
- [ ] Home page loads
- [ ] User authentication works
- [ ] Dashboard displays correctly
- [ ] All forms submit properly
- [ ] Mobile responsiveness

## 🔄 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment | production |
| PORT | Server port | 10000 |
| MONGO_URI | MongoDB connection string | mongodb+srv://... |
| JWT_SECRET | JWT signing key | random-secure-key |
| JWT_EXPIRES_IN | Token expiration | 90d |
| REACT_APP_API_URL | API base URL | https://yourapp.onrender.com/api/v1 |

## 🚨 Troubleshooting

### Build Fails
- Check Node.js version (requires >=18)
- Verify all dependencies are installed
- Check for syntax errors in code

### Database Connection Issues
- Verify MONGO_URI is correct
- Check MongoDB Atlas IP whitelist
- Verify database user permissions

### Frontend Not Loading
- Check browser console for errors
- Verify API endpoints are accessible
- Ensure environment variables are set correctly

## 📞 Support
For deployment issues, contact:
- **Developer:** Manu-TechKid
- **Email:** [Your Email]
- **GitHub:** [GitHub Issues](https://github.com/Manu-TechKid/-construction-tracker/issues)
