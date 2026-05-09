@echo off
echo 🚀 Starting deployment...

REM Check commit message
if "%~1"=="" (
    echo ❌ Commit message required
    echo Usage: git-deploy.bat "your commit message"
    pause
    exit /b 1
)

echo 📝 Committing changes...
git add .
git commit -m "%~1"

echo 🔄 Pushing to origin...
git push origin main

echo ⚡ Triggering auto-deploy...
curl -X POST http://100.115.156.20:3000/auto-deploy

echo ✅ Deployment complete!
echo 📱 You can now test button clicks in mobile browser
echo 📱 Check server logs with: pm2 logs ypwisys
pause