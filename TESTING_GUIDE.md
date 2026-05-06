# YPWI Lutim System - Testing Guide

## 🚀 Quick Start

1. **Start the system:**
   ```cmd
   test-full-system.bat
   ```

2. **Run automated tests:**
   ```cmd
   node run-system-tests.js
   ```

## 🧪 Manual Testing Checklist

### ✅ Complete Profile Flow
1. Open browser: `http://localhost:3000/login.html`
2. Login with teacher credentials
3. If redirected to complete-profile, fill all fields
4. Add assignments using modal
5. Upload photo
6. Submit form
7. Check WhatsApp notification received
8. Login again with new account

### ✅ Admin Dashboard
1. Login as admin
2. Check teacher management
3. Test bulk WhatsApp messaging
4. Verify attendance logs

### ✅ WhatsApp Integration
1. Complete profile as teacher
2. Check server logs for WhatsApp API calls
3. Verify Islamic message formatting

## 🔧 Troubleshooting

### Server Won't Start
```cmd
# Check syntax
node -c server.js

# Check dependencies
npm install

# Check database
node -e "require('./db')"
```

### WhatsApp Not Working
- Check `.env` file for correct `WHATSAPP_ENDPOINT` and `WHATSAPP_DEVICE_ID`
- Verify Whacenter account is active
- Check server logs for API errors

### Database Issues
- Ensure MySQL is running
- Check database credentials in `.env`
- Run migration if needed: `node migrate.js`

## 📊 Expected Test Results

```
🧪 YPWI LUTIM FULL SYSTEM TEST

✅ Server Health Check
✅ Server Response Format
✅ Public Tenants Endpoint
✅ Tenants Data Structure
✅ Islamic Message Format
✅ Duplicate Assignment Detection
✅ New Assignment Addition
✅ Assignment Removal

📊 TEST RESULTS SUMMARY
Total Tests: 8
Passed: 8
Failed: 0
Success Rate: 100.0%

🎉 ALL TESTS PASSED! System is ready for production.
```

## 🎯 Key Features Verified

- ✅ **Profile Completion** with photo upload
- ✅ **Assignment Management** (accumulate before submit)
- ✅ **Auto User Creation** with default password
- ✅ **Islamic WhatsApp Messages** with proper etiquette
- ✅ **Admin Dashboard** with bulk messaging
- ✅ **Security Hardening** (CSP, rate limiting, sanitization)
- ✅ **Database Integrity** with proper relationships

## 🆘 Support

If tests fail, check:
1. Node.js version (18+ recommended)
2. Database connection
3. Environment variables
4. Network connectivity for WhatsApp API

System is production-ready when all tests pass! 🚀