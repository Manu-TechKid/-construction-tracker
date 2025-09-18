# Construction Tracker - Deployment Guide

## HostGator Subdomain Deployment

### Prerequisites
1. HostGator cPanel access
2. Node.js support (contact HostGator to enable)
3. MongoDB Atlas connection string
4. Domain/subdomain configured

### Deployment Steps

#### 1. Build the Application
```bash
npm run build
```

#### 2. Upload Files
Upload the following to your subdomain's public_html folder:
- All files from `client/build/` directory
- `.htaccess` file (for React Router support)
- `server/` directory (backend files)
- `package.json` (root)

#### 3. Environment Variables
Create `.env` file in the root directory:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
REACT_APP_API_URL=https://your-subdomain.sjservices.com
```

#### 4. Install Dependencies
Via cPanel Terminal or SSH:
```bash
npm install
cd server && npm install
```

#### 5. Start the Application
```bash
npm start
```

### Mobile Optimization Features
- Responsive design for all screen sizes
- Touch-friendly buttons and inputs
- Optimized font sizes (16px+ to prevent zoom on iOS)
- Fast loading with compressed assets
- Offline-capable PWA features

### Worker Access
- Workers log in at: https://your-subdomain.sjservices.com
- Each worker sees only their assigned tasks
- Mobile-optimized dashboard for field use
- One-click task completion with notes

### Performance Optimizations
- Gzip compression enabled
- Static asset caching (1 month)
- Lazy loading of components
- Optimized bundle sizes
- CDN-ready configuration

### Security Features
- HTTPS enforcement
- XSS protection headers
- Content type validation
- Frame protection
- Secure authentication tokens

### Monitoring & Maintenance
- Error logging to console
- Performance monitoring
- Automatic session management
- Database connection pooling

### Support
For technical issues or deployment assistance, contact the development team.
