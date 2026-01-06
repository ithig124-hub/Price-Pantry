# API Configuration Guide

## Current Configuration

The mobile app is configured to connect to the backend API at:
```
http://localhost:8001/api
```

This works in the development container environment where both the mobile app and backend run on the same machine.

## Changing the API URL

### For Local Development
If running the mobile app on a physical device or emulator that's not on the same machine as the backend:

1. Find your computer's IP address:
   - **macOS/Linux**: Run `ifconfig` and look for your local IP (usually 192.168.x.x)
   - **Windows**: Run `ipconfig` and look for IPv4 Address

2. Update the API URL in `/src/lib/api.js`:
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:8001/api';
   // Example: const API_BASE_URL = 'http://192.168.1.100:8001/api';
   ```

### For Production Deployment

When you deploy your backend to a production server:

1. Get your production backend URL (e.g., `https://your-domain.com` or `https://api.your-domain.com`)

2. Update the API URL in `/src/lib/api.js`:
   ```javascript
   const API_BASE_URL = 'https://your-domain.com/api';
   ```

3. Rebuild your mobile app with the new URL

## Testing the Connection

After updating the API URL, test the connection by:

1. Opening the app
2. Going to the Search screen
3. Searching for any product (e.g., "milk")
4. If you see products with real data (150+ products), the connection is working!

## Troubleshooting

### No products showing up?
- Check that your backend is running: `sudo supervisorctl status backend`
- Verify the API URL is correct
- Check network connectivity between your device and backend
- Check the console logs in Expo for any error messages

### "Network request failed" error?
- Ensure your device and backend are on the same network (for local development)
- Check firewall settings - port 8001 must be accessible
- Try using your IP address instead of localhost

### CORS errors?
The backend is already configured to allow all origins, but if you see CORS errors:
- Check the CORS middleware in `/app/backend/server.py`
- Ensure the backend is properly handling preflight requests

## Environment-Specific Configuration

You can use environment variables or create different config files for different environments:

```javascript
// src/lib/api.js
const API_URLS = {
  development: 'http://localhost:8001/api',
  staging: 'https://staging-api.your-domain.com/api',
  production: 'https://api.your-domain.com/api',
};

const ENV = 'development'; // Change this based on your environment
const API_BASE_URL = API_URLS[ENV];
```
