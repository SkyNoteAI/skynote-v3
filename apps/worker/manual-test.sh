#!/bin/bash

echo "🧪 Manual API Testing for SkyNote AI Worker"
echo "============================================="

# Test with both local and deployed instances
ENDPOINTS=(
  "http://localhost:8787"
  # Add deployed URL here when available
)

for BASE_URL in "${ENDPOINTS[@]}"; do
  echo ""
  echo "Testing: $BASE_URL"
  echo "-------------------"
  
  # Test 1: Health check
  echo "1. Health Check:"
  curl -s "$BASE_URL/health" 2>/dev/null && echo " ✅" || echo " ❌ (endpoint not available)"
  
  # Test 2: Root endpoint
  echo "2. Root Endpoint:"
  curl -s "$BASE_URL/" 2>/dev/null | jq -r '.data.message' 2>/dev/null && echo " ✅" || echo " ❌"
  
  # Test 3: Auth endpoint
  echo "3. Auth Login:"
  curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' 2>/dev/null | jq -r '.success' 2>/dev/null && echo " ✅" || echo " ❌"
  
  # Test 4: Protected endpoint (should fail)
  echo "4. Protected Endpoint (should fail):"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/notes" 2>/dev/null)
  if [ "$STATUS" = "401" ]; then
    echo " ✅ (correctly unauthorized)"
  else
    echo " ❌ (unexpected status: $STATUS)"
  fi
  
  # Test 5: CORS headers
  echo "5. CORS Headers:"
  CORS=$(curl -s -I "$BASE_URL/" 2>/dev/null | grep -i "access-control" | wc -l)
  if [ "$CORS" -gt 0 ]; then
    echo " ✅ (CORS headers present)"
  else
    echo " ❌ (no CORS headers)"
  fi
done

echo ""
echo "✨ Manual testing completed!"