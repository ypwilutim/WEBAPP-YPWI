@echo off
echo Testing full tenants response...
curl -X GET "http://localhost:3000/api/admin/tenants" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIwLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoiWVBXSUxVVElNIiwidGltZXN0YW1wIjoiMjAyNi0wNS0wNlQwMzoyNTozNi45NjdaIiwiaWF0IjoxNzc4MDM3OTM2LCJleHAiOjE3NzgwNjY3MzZ9.yEaXsTDSV44E4pic9G8E2F9UiafRqyJgked-fEg1CoA" -H "Content-Type: application/json" > tenants_response.json
echo Response saved to tenants_response.json
echo First few lines:
type tenants_response.json | head -5
echo Press any key to continue...
pause >nul