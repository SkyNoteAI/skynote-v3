# Testing Guide for SkyNote AI Worker

This document outlines how to test the Worker API implementation to ensure it's working correctly.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm run typecheck

# Run linting
pnpm run lint

# Run unit tests
pnpm test --run

# Start development server
pnpm run dev
```

## 🧪 Testing Levels

### 1. **Unit Tests** (Automated)

Located in `src/__tests__/`, these test individual components:

```bash
# Run all tests
pnpm test --run

# Run specific test file
pnpm test --run src/__tests__/index.test.ts

# Run with coverage
pnpm test --run --coverage
```

**Test Coverage:**
- ✅ API endpoints (health, root, auth, notes)
- ✅ Authentication middleware
- ✅ Error handling
- ✅ Request logging
- ✅ CORS configuration
- ✅ Performance benchmarks

### 2. **Integration Tests** (Manual)

Use the provided test scripts to verify real API behavior:

```bash
# Test all endpoints
./test-endpoints.sh

# Manual testing with different environments
./manual-test.sh
```

### 3. **Performance Tests** (Automated)

Performance benchmarks are included in the unit tests:

```bash
pnpm test --run src/__tests__/performance.test.ts
```

**Performance Expectations:**
- Health endpoint: >3000 requests/second
- Auth endpoints: <2ms response time
- Concurrent requests: 20+ simultaneous connections

### 4. **Local Development Testing**

Start the worker locally and test with cURL:

```bash
# Terminal 1: Start worker
pnpm run dev

# Terminal 2: Test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
```

## 📋 Testing Checklist

### ✅ Core Functionality
- [x] Worker starts without errors
- [x] TypeScript compilation successful
- [x] All routes respond correctly
- [x] Error handling works
- [x] Logging captures requests

### ✅ Security
- [x] Authentication middleware blocks unauthorized requests
- [x] Public routes accessible without auth
- [x] CORS headers configured correctly
- [x] Rate limiting headers present

### ✅ Performance
- [x] Sub-millisecond response times
- [x] Concurrent request handling
- [x] Memory usage stable
- [x] No memory leaks in tests

### ✅ API Contract
- [x] Consistent JSON response format
- [x] Proper HTTP status codes
- [x] Request/response headers
- [x] Error message structure

## 🔍 Debugging Tips

### Common Issues

1. **Worker Won't Start**
   ```bash
   # Check for syntax errors
   pnpm run typecheck
   
   # Check for linting issues
   pnpm run lint
   ```

2. **Tests Failing**
   ```bash
   # Run tests with verbose output
   pnpm test --run --reporter=verbose
   
   # Run single test file
   pnpm test --run src/__tests__/index.test.ts
   ```

3. **Performance Issues**
   ```bash
   # Check performance tests
   pnpm test --run src/__tests__/performance.test.ts
   
   # Profile with Node.js
   node --prof your-script.js
   ```

### Logging

The worker includes structured logging:

```typescript
// Request logs
{"type":"request_start","requestId":"...","method":"GET","path":"/health"}
{"type":"request_complete","requestId":"...","status":200,"duration":1}

// Error logs
{"type":"error","requestId":"...","message":"...","stack":"..."}
```

## 🌐 Environment Testing

### Development
```bash
# Local testing
pnpm run dev
curl http://localhost:8787/health
```

### Staging/Production
```bash
# Test deployed worker
curl https://your-worker.your-subdomain.workers.dev/health

# Check all endpoints
./manual-test.sh
```

## 📊 Metrics & Monitoring

### Key Metrics to Monitor
- Response time (target: <10ms)
- Error rate (target: <1%)
- Request rate (capacity: 1000+ RPS)
- Memory usage (stable over time)

### Health Checks
- `GET /health` - Worker status
- `GET /` - Basic functionality
- `POST /api/auth/login` - Auth system
- `GET /api/notes` (without auth) - Security

## 🚀 Continuous Integration

For CI/CD pipelines, use:

```yaml
- name: Test Worker
  run: |
    pnpm install
    pnpm run typecheck
    pnpm run lint
    pnpm test --run
    pnpm run build
```

## 🔧 Advanced Testing

### Load Testing
```bash
# Install Apache Bench
brew install httpie

# Load test health endpoint
ab -n 1000 -c 10 http://localhost:8787/health
```

### Security Testing
```bash
# Test auth bypasses
curl -H "Authorization: Bearer invalid-token" http://localhost:8787/api/notes

# Test CORS
curl -H "Origin: https://malicious.com" http://localhost:8787/api/notes
```

### Memory Leak Testing
```bash
# Run long-running performance test
node --expose-gc --max-old-space-size=128 your-test-script.js
```

This comprehensive testing approach ensures the Worker API is production-ready and performs well under various conditions.