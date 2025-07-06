#!/bin/bash

# Test script for Worker API endpoints
BASE_URL="http://localhost:8787"

echo "🧪 Testing SkyNote AI Worker API"
echo "================================="

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s -X GET "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Root endpoint
echo "2. Testing root endpoint..."
curl -s -X GET "$BASE_URL/" | jq '.'
echo ""

# Test 3: Auth endpoints (should work without auth)
echo "3. Testing auth login endpoint..."
curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}' | jq '.'
echo ""

echo "4. Testing auth refresh endpoint..."
curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "test"}' | jq '.'
echo ""

# Test 5: Notes endpoints (should require auth)
echo "5. Testing notes endpoint without auth (should fail)..."
curl -s -X GET "$BASE_URL/api/notes" | jq '.'
echo ""

echo "6. Testing notes endpoint with invalid auth (should fail)..."
curl -s -X GET "$BASE_URL/api/notes" \
  -H "Authorization: Bearer invalid-token" | jq '.'
echo ""

# Test 7: CORS preflight
echo "7. Testing CORS preflight..."
curl -s -X OPTIONS "$BASE_URL/api/notes" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v 2>&1 | grep -E "(Access-Control|HTTP/)"
echo ""

# Test 8: Rate limiting headers
echo "8. Testing rate limiting headers..."
curl -s -X GET "$BASE_URL/" -I | grep -E "(X-RateLimit|HTTP/)"
echo ""

echo "✅ All tests completed!"