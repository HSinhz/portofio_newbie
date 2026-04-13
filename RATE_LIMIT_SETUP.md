// RATE_LIMIT_SETUP.md

# 🔒 Rate Limiting Setup Guide (Production-Ready)

## Architecture

```
Client → Request → Middleware → Redux Rate Limit Check
                                     ↓
                         ┌──────────────────┐
                         │   Check Redis    │
                         │  ratelimit:ip:X  │
                         └──────────────────┘
                                    ↓
                    ┌───────────────────────────┐
                    │                           │
              Allowed              Exceeded (Block)
                │                       │
        ✅ Increment      🚫 Return 429 Too Many Requests
        Pass request           + Retry-After header
```

## Setup Steps

### 1️⃣ Ensure Redis is Running

```bash
# Check Docker compose
docker-compose -f docker-compose.local.yml up redis
```

### 2️⃣ Add Rate Limiting to Middleware Index

```typescript
// src/middleware/index.ts
import { rateLimitMiddleware } from "./rate-limit.middleware";
import { RedisService } from "../services/redis.service";
import { RateLimitService } from "../services/rate-limit.service";

// Initialize services
const redisService = new RedisService();
await redisService.onModuleInit();
const rateLimitService = new RateLimitService(redisService);

export const middlewares = [
  {
    route: "shop-api",
    handler: rateLimitMiddleware(rateLimitService, {
      "api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15 min
      "api/auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
      "api/payment": { windowMs: 10 * 60 * 1000, maxRequests: 10 }, // 10 per 10 min
      ".*": { windowMs: 15 * 60 * 1000, maxRequests: 300 }, // 300 per 15 min
    }),
  },
  {
    route: "admin-api",
    handler: rateLimitMiddleware(rateLimitService, {
      ".*": { windowMs: 60 * 60 * 1000, maxRequests: 10000 }, // Admin: generous limit
    }),
  },
];
```

### 3️⃣ Alternative: Use Guard (per-route control)

```typescript
// src/api/auth.resolver.ts
import { UseGuards } from "@nestjs/common";
import { RateLimitGuard } from "../common/guards/rate-limit.guard";
import { RateLimitPresets } from "../common/decorators/rate-limit.decorator";

@UseGuards(new RateLimitGuard(rateLimitService, RateLimitPresets.AUTH))
@Mutation()
async login(@Args() args) {
  // Max 5 login attempts per 15 minutes
}

@UseGuards(new RateLimitGuard(rateLimitService, RateLimitPresets.PAYMENT))
@Mutation()
async processPayment(@Args() args) {
  // Max 10 payment attempts per 10 minutes
}
```

## Response Headers

Every response includes rate limit info:

```
X-RateLimit-Limit: 5           (Giới hạn tối đa)
X-RateLimit-Remaining: 2       (Còn bao nhiêu request)
X-RateLimit-Reset: 2024-01-01T12:00:00Z (Khi nào reset)
```

When exceeded:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 900        (giây)
Content-Type: application/json

{
  "statusCode": 429,
  "message": "Too many requests. Please retry after 900 seconds.",
  "retryAfter": 900
}
```

## Test Rate Limiting

### Test Login Rate Limit (5 per 15 min)

```bash
#!/bin/bash
# test-rate-limit.sh

for i in {1..7}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/shop-api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -i | grep -E "X-RateLimit|HTTP|429"

  echo "---"
  sleep 1
done
```

Expected output:

```
Request 1-5: ✅ HTTP 200/401/403
Request 6-7: 🚫 HTTP 429 Too Many Requests
```

### Monitor Redis Keys

```bash
# SSH vào Redis container
docker exec -it <redis-container> redis-cli

# Monitor rate limit keys
KEYS ratelimit:*
GET ratelimit:ip:192.168.1.1
TTL ratelimit:ip:192.168.1.1
```

## Configuration Reference

### Window Sizes (windowMs)

| Duration   | Value          |
| ---------- | -------------- |
| 1 second   | 1000           |
| 1 minute   | 60 \* 1000     |
| 15 minutes | 15 _ 60 _ 1000 |
| 1 hour     | 60 _ 60 _ 1000 |

### Recommended Limits

| Endpoint       | Limit   | Window | Reason                         |
| -------------- | ------- | ------ | ------------------------------ |
| LOGIN          | 5       | 15 min | Prevent brute-force            |
| REGISTER       | 3       | 1 hour | Prevent spam accounts          |
| PASSWORD_RESET | 3       | 1 hour | Prevent abuse                  |
| PAYMENT        | 10      | 10 min | Prevent duplicate charges      |
| API_GENERAL    | 100-300 | 15 min | Standard API usage             |
| CHECKOUT       | 20      | 10 min | Allow retries but prevent spam |

## Identifier Strategy

Rate limiting uses this priority:

1. **User ID** (if authenticated) → `user:12345`
2. **IP Address** (if not authenticated) → `ip:192.168.1.1`

Supports:

- Direct IP: `192.168.1.1`
- Behind proxy (X-Forwarded-For): `ip:192.168.1.1` (first IP extracted)

## Handling "Fail Open"

If Redis is down:

- Rate limiting is **skipped** (fail open)
- Requests are **allowed** to pass through
- Logs: _"RateLimit middleware error: Redis connection failed"_

This prioritizes **availability** over security. For critical apps, you might want "fail closed" (block all requests).

## Monitoring & Alerts

### Check Rate Limit Stats

```typescript
// Get current rate limit status
const stats = await rateLimitService.getStats("ip:192.168.1.1");
console.log(stats);
// Output: { identifier: "ip:192.168.1.1", currentCount: 4, ttl: 850 }
```

### Manual Reset

```typescript
// Reset rate limit for user (e.g., after verification)
await rateLimitService.reset("user:12345");
```

## Production Checklist

- [x] Redis configured and running (docker-compose)
- [x] Rate limit middleware/guard implemented
- [x] Config tailored for your endpoints
- [x] Test script prepared
- [x] Monitoring/alerting set up
- [x] Fail-open/closed strategy decided
- [x] Response headers enabled for client-side handling
- [x] Documentation for frontend developers (Retry-After header)

## Frontend Integration

Clients should:

1. **Read** `Retry-After` header when receiving 429
2. **Wait** before retrying
3. **Show** user-friendly message

```typescript
// Example: Frontend handling
try {
  await loginAPI(email, password);
} catch (error) {
  if (error.status === 429) {
    const retryAfter = parseInt(error.headers["retry-after"]);
    showError(`Too many attempts. Please wait ${retryAfter}s`);

    // Auto-retry after wait
    setTimeout(() => {
      loginAPI(email, password);
    }, retryAfter * 1000);
  }
}
```

## Security Notes

⚠️ **Rate Limiting VS Authentication:**

- Rate limiting = Prevent abuse (DDoS, brute-force)
- Authentication = Verify identity

Both needed! Rate limiting alone doesn't secure password endpoints.

⚠️ **DDoS Protection:**
For full DDoS protection (volumetric attacks), use:

- AWS WAF / CloudFront
- Cloudflare
- Nginx rate limiting (L7)

Redis rate limiting = Application-level only (L7 protection)
