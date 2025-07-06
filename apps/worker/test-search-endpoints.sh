#!/bin/bash

# Test script for Search API endpoints
# This script tests the search functionality manually

BASE_URL="http://localhost:8787"
TOKEN="your-test-token-here" # Replace with actual token

echo "🔍 Testing Search API Endpoints"
echo "================================="

# Function to make authenticated requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data" \
            "$BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            "$BASE_URL$endpoint"
    fi
}

echo "1. Testing keyword search validation (empty query)..."
response=$(make_request "GET" "/api/search?q=")
echo "Response: $response"
echo ""

echo "2. Testing keyword search validation (short query)..."
response=$(make_request "GET" "/api/search?q=a")
echo "Response: $response"
echo ""

echo "3. Testing valid keyword search..."
response=$(make_request "GET" "/api/search?q=test&limit=5")
echo "Response: $response"
echo ""

echo "4. Testing semantic search validation..."
response=$(make_request "GET" "/api/search/semantic?q=")
echo "Response: $response"
echo ""

echo "5. Testing valid semantic search..."
response=$(make_request "GET" "/api/search/semantic?q=machine%20learning")
echo "Response: $response"
echo ""

echo "6. Testing search with filters..."
response=$(make_request "GET" "/api/search?q=test&folder=work&tag=important")
echo "Response: $response"
echo ""

echo "7. Testing similar notes endpoint..."
response=$(make_request "GET" "/api/search/similar/test-note-id")
echo "Response: $response"
echo ""

echo "8. Testing search history..."
response=$(make_request "GET" "/api/search/history?limit=5")
echo "Response: $response"
echo ""

echo "✅ Search API endpoint tests completed!"
echo "Note: Replace TOKEN variable with actual authentication token for real testing"