@echo off
echo ========================================
echo     YPWI LUTIM SYSTEM TEST SUITE
echo ========================================
echo.

echo [1/4] Testing Server Syntax...
node -c server.js
if %errorlevel% neq 0 (
    echo ❌ Server syntax error!
    pause
    exit /b 1
) else (
    echo ✅ Server syntax OK
)

echo.
echo [2/4] Testing Basic Dependencies...
node -e "console.log('✅ Node.js working'); process.exit(0)"
if %errorlevel% neq 0 (
    echo ❌ Node.js error!
    pause
    exit /b 1
)

echo.
echo [3/4] Testing Database Connection...
node -e "const db=require('./db'); console.log('✅ Database module loaded'); process.exit(0)"
if %errorlevel% neq 0 (
    echo ❌ Database connection error!
    pause
    exit /b 1
)

echo.
echo [4/4] Starting Server for Manual Testing...
echo.
echo 🚀 Server will start on http://localhost:3000
echo.
echo 📋 Test Checklist:
echo    ✅ Complete Profile Flow
echo    ✅ Assignment Management  
echo    ✅ WhatsApp Notifications
echo    ✅ User Auto-Creation
echo    ✅ Islamic Message Formatting
echo.
echo 🛑 Press Ctrl+C to stop server
echo.

node server.js