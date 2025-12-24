# IMPORTANT: Update API Path in JavaScript

Since we're accessing the site at `/portai/public/index.php`, the JavaScript needs to know the correct API path.

## Quick Fix

Edit this file:
`/var/www/sol.inoutconnect.com/portai/public/js/app.js`

Change line 5 from:
```javascript
const API_URL = '/portai/api';
```

To:
```javascript
const API_URL = 'https://sol.inoutconnect.com/portai/api';
```

Or use relative path:
```javascript
const API_URL = '/portai/api';
```

This should work fine with the simple nginx config.
