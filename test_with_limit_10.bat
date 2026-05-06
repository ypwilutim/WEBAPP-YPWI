@echo off
echo Testing tenants endpoint with limit 10...
curl -s -X GET "http://localhost:3000/api/admin/tenants?limit=10" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIwLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoiWVBXSUxVVElNIiwidGltZXN0YW1wIjoiMjAyNi0wNS0wNlQwMzoyNTozNi45NjdaIiwiaWF0IjoxNzc4MDM3OTM2LCJleHAiOjE3NzgwNjY3MzZ9.yEaXsTDSV44E4pic9G8E2F9UiafRqyJgked-fEg1CoA" -H "Content-Type: application/json" > temp_response2.txt
findstr "SDIT" temp_response2.txt
echo.
echo Press any key to continue...
pause >nul