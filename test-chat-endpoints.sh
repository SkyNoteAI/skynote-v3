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

printf "\n📋 2. Testing chat with streaming...\n"
curl -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "message": "What are the benefits of AI?",
    "stream": true
  }' | jq .

printf "\n📋 3. Testing chat history...\n"
curl -X GET "$BASE_URL/api/chat/history" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

printf "\n📋 4. Testing conversations list...\n"
curl -X GET "$BASE_URL/api/chat/conversations" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

printf "\n📋 5. Testing validation with invalid input...\n"
curl -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "message": "",
    "context_limit": 15
  }' | jq .

printf "\n✅ Chat API testing completed!\n"