@echo off
echo Starting server and testing WhatsApp...
start /b node server.js
timeout /t 3 /nobreak > nul
echo Testing WhatsApp endpoint...
node test-server-endpoint.js
pause