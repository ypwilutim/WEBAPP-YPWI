@echo off
echo Logging in to get admin token...
curl -X POST "http://localhost:3000/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"ypwi123\"}"
echo.
echo Press any key to continue...
pause >nul