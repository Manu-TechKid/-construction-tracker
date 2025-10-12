# SiteGround Deployment Guide for Construction Tracker Frontend

## ✅ Build Status
- **Build Completed Successfully**: October 12, 2025
- **Build Folder Location**: `client/build/`
- **Build Size**: ~530KB (gzipped)

## 📦 Files to Upload to SiteGround

### Step 1: Prepare Files
The React build has been created in the `client/build/` folder. You need to upload:
- All files and folders from `client/build/`
- The `.htaccess` file (create this on SiteGround)

### Step 2: Create .htaccess File
Create a file named `.htaccess` in your SiteGround public_html folder with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle React Router
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
  
  # Security Headers
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  
  # Compression
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
  </IfModule>
  
  # Cache Control
  <FilesMatch "\.(ico|jpg|jpeg|png|gif|svg|js|css|woff|woff2|ttf|eot)$">
    Header set Cache-Control "max-age=31536000, public"
  </FilesMatch>
</IfModule>
```

### Step 3: Update API URL
Before uploading, you need to update the API URL in the build files:

1. Open `client/build/static/js/main.*.js` (the exact filename includes a hash)
2. Search for `http://localhost:5000/api/v1`
3. Replace ALL occurrences with your Render backend URL:
   ```
   https://your-app-name.onrender.com/api/v1
   ```

**Alternative Method (Recommended):**
Create a file `client/build/config.js` with:
```javascript
window.REACT_APP_API_URL = 'https://your-app-name.onrender.com/api/v1';
```

### Step 4: Upload to SiteGround

#### Using File Manager (SiteGround Control Panel):
1. Log into SiteGround Site Tools
2. Navigate to **Site > File Manager**
3. Go to your `public_html` folder
4. Delete any existing files (backup first if needed)
5. Upload all files from `client/build/`:
   - `index.html`
   - `favicon.ico`
   - `manifest.json`
   - `robots.txt`
   - `static/` folder (with all subfolders)
   - `logo192.png` and `logo512.png` (if present)
6. Create the `.htaccess` file with the content above

#### Using FTP (FileZilla or similar):
1. Connect to your SiteGround FTP:
   - **Host**: Your domain or FTP server
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Port**: 21 (or 22 for SFTP)
2. Navigate to `public_html`
3. Upload all files from `client/build/`
4. Upload the `.htaccess` file

### Step 5: Verify Deployment

1. **Clear Browser Cache**: Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. **Test Navigation**: 
   - Homepage loads
   - Login works
   - Dashboard displays
   - All routes work (refresh on any page should work)
3. **Check API Connection**:
   - Open browser console (F12)
   - Try to login
   - Check for any API errors

## 🔧 Troubleshooting

### White Screen / App Not Loading
- Check if `.htaccess` file exists and has correct content
- Verify all files were uploaded to `public_html`
- Clear browser cache

### API Connection Errors
- Verify the API URL is correctly updated
- Check if Render backend is running
- Ensure CORS is configured on backend

### 404 Errors on Refresh
- `.htaccess` file is missing or incorrect
- mod_rewrite is not enabled (contact SiteGround support)

### Mixed Content Errors
- Ensure API URL uses HTTPS (not HTTP)
- Check all external resources use HTTPS

## 📝 Important Notes

1. **API URL**: Must point to your Render backend
2. **HTTPS**: Both frontend and backend should use HTTPS
3. **Caching**: Users may need to clear cache after deployment
4. **Build Size**: Current build is ~530KB (acceptable but could be optimized)

## 🚀 Quick Deployment Checklist

- [ ] Build completed successfully ✅
- [ ] GitHub repository updated ✅
- [ ] Render backend deployed and running
- [ ] API URL updated in build files
- [ ] All files uploaded to SiteGround public_html
- [ ] .htaccess file created
- [ ] Browser cache cleared
- [ ] Test login functionality
- [ ] Test all major features

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API URL is correct
3. Ensure backend is running on Render
4. Contact SiteGround support for server-specific issues

## 🎉 Success!

Once deployed, your Construction Tracker app will be live at your domain!
Remember to:
- Monitor for any errors in the first 24 hours
- Ask users to clear cache if they see old version
- Keep the Render backend active (it may sleep after inactivity)
