#!/bin/bash

# Test Authentication Endpoints
# Run this script after starting the dev server with: pnpm dev

BASE_URL="http://localhost:8787"

echo "🔐 Testing Authentication System"
echo "================================="

# Test health endpoint
echo "1. Testing health endpoint..."
response=$(curl -s "$BASE_URL/health")
echo "Response: $response"
echo ""

# Test login
echo "2. Testing login..."
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}')
echo "Login Response: $login_response"

# Extract access token
access_token=$(echo "$login_response" | jq -r '.data.accessToken')
refresh_token=$(echo "$login_response" | jq -r '.data.refreshToken')

if [ "$access_token" != "null" ] && [ "$access_token" != "" ]; then
  echo "✅ Login successful! Access token received."
  echo ""
  
  # Test /me endpoint
  echo "3. Testing /me endpoint with access token..."
  me_response=$(curl -s "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $access_token")
  echo "Me Response: $me_response"
  echo ""
  
  # Test protected notes endpoint
  echo "4. Testing protected notes endpoint..."
  notes_response=$(curl -s "$BASE_URL/api/notes" \
    -H "Authorization: Bearer $access_token")
  echo "Notes Response: $notes_response"
  echo ""
  
  # Test refresh token
  echo "5. Testing refresh token..."
  refresh_response=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$refresh_token\"}")
  echo "Refresh Response: $refresh_response"
  echo ""
  
  # Test logout
  echo "6. Testing logout..."
  logout_response=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
    -H "Authorization: Bearer $access_token")
  echo "Logout Response: $logout_response"
  echo ""
  
else
  echo "❌ Login failed!"
  exit 1
fi

echo "🎉 Authentication system tests completed!"