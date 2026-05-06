# WhatsApp API Setup Guide

## 🚀 CallMeBot Setup (Recommended)

### Step 1: Create CallMeBot Account
1. Go to: https://www.callmebot.com/
2. Create a free account
3. Add your phone number to the system

### Step 2: Get Your API Key
1. After adding your phone, you'll get an API key
2. The API key will look like: `1234567890` (numeric)

### Step 3: Update .env file
```env
WHATSAPP_ENDPOINT=https://api.callmebot.com/whatsapp.php
WHATSAPP_API_KEY=1234567890
WHATSAPP_PHONE=6281234567890
```

### Step 4: Test the API
```javascript
// Test URL format:
https://api.callmebot.com/whatsapp.php?phone=6281234567890&text=Hello&apikey=1234567890
```

## 📱 Alternative WhatsApp APIs

### Option 1: Twilio WhatsApp API
```env
WHATSAPP_ENDPOINT=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json
WHATSAPP_API_KEY=YOUR_TWILIO_AUTH_TOKEN
WHATSAPP_PHONE=+14155238886
```

### Option 2: 360Dialog (Meta Official)
```env
WHATSAPP_ENDPOINT=https://waba.360dialog.io/v1/messages
WHATSAPP_API_KEY=YOUR_360DIALOG_API_KEY
```

## 🔧 Current Configuration

Update your `.env` file with actual CallMeBot credentials:

```env
NODE_ENV=production
WHATSAPP_ENDPOINT=https://api.callmebot.com/whatsapp.php
WHATSAPP_API_KEY=YOUR_ACTUAL_API_KEY
WHATSAPP_PHONE=YOUR_PHONE_NUMBER
```

## 🧪 Testing

After configuration, restart the server and test WhatsApp sending. You should see:
```
Sending WhatsApp via CallMeBot API...
WhatsApp API response: Message sent successfully
```

Instead of the mock response.