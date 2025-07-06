#!/bin/bash

# Test script for AI Chat API endpoints
# Run this after starting the worker with `pnpm dev:worker`

BASE_URL="http://localhost:8787"
AUTH_TOKEN="your-test-jwt-token"

echo "🧪 Testing AI Chat API Endpoints"
echo "================================="

# First, let's get an auth token (assuming auth is working)
echo "📋 1. Testing chat endpoint..."
curl -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "message": "Tell me about artificial intelligence",
    "context_limit": 3
  }' | jq .

echo -e "\n📋 2. Testing chat with streaming..."
curl -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "message": "What are the benefits of AI?",
    "stream": true
  }' | jq .

echo -e "\n📋 3. Testing chat history..."
curl -X GET "$BASE_URL/api/chat/history" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

echo -e "\n📋 4. Testing conversations list..."
curl -X GET "$BASE_URL/api/chat/conversations" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

echo -e "\n📋 5. Testing validation with invalid input..."
curl -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "message": "",
    "context_limit": 15
  }' | jq .

echo -e "\n✅ Chat API testing completed!"