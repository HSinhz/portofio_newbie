// IMPLEMENTATION_SUMMARY.md

# 🔒 Rate Limiting Implementation Summary

## What Was Implemented

Production-ready rate limiting sử dụng **Redis** để prevent DDoS, brute-force, và API abuse.

---

## 📋 Files Created / Modified

### NEW FILES ✅

```
src/
├── services/
│   └── rate-limit.service.ts          ← Core rate limit logic
├── common/
│   ├── guards/
│   │   └── rate-limit.guard.ts        ← NestJS Guard (optional per-route)
│   └── decorators/
│       └── rate-limit.decorator.ts    ← @RateLimit decorator + presets
├── middleware/
│   └── rate-limit.middleware.ts       ← Express middleware
└── scripts/
    └── test-rate-limit.ts             ← Test script

Documentation:
├── QUICK_START_RATE_LIMIT.md
└── RATE_LIMIT_SETUP.md
```

### MODIFIED FILES ✅

```
src/
├── services/
│   └── redis.service.ts               ← Added getTTL() & incr() methods
└── middleware/
    └── index.ts                        ← Integrated rate-limit middleware
```

---

## 🏗️ Architecture

```
HTTP Request
    ↓
┌─────────────────────────────────────────┐
│   Rate Limit Middleware                 │
│  (src/middleware/rate-limit.middleware) │
└─────────────────────┬───────────────────┘
                      ↓
          ┌───────────────────────┐
          │  Get Identifier:      │
          │  user ID or IP addr   │
          └────────┬──────────────┘
                   ↓
        Redis Key: "ratelimit:ip:192.168.1.1"
                   ↓
        ┌────────────────────────┐
        │  Count = GET key       │
        └────────┬───────────────┘
                 ↓
        ┌─────────────────────────┐
    ┌───→ Count >= Limit?       │
    │   └────────┬────────────────┘
    │            ↓
    │   NO       ✅ Increment      YES
    │   │        │  INCR key         │
    │   │        │  Set TTL         │
    │   │        │  Let through     │
    │   │        ↓                   │
    │   └───────────┐                │
    │              │                 │
    └──────────────┼─────────────────┴─→ 🚫 429 Too Many Requests
                   │                      + Retry-After header
                   ↓
            Route Handler
                   ↓
              Response ✅
        + X-RateLimit headers
```

---

## 🔧 How to Use

### Option 1: Automatic (Already Active)

Rate limiting is **already integrated** and active on `shop-api`:

```
Default Limits:
├─ auth/login:     5 per 15 min
├─ auth/register:  3 per 1 hour
├─ payment:        10 per 10 min
└─ (catch-all):    300 per 15 min
```

Just start backend:

```bash
npm run dev
```

### Option 2: Per-Route Guard (Advanced)

Untuk more granular control per resolver:

```typescript
// src/api/auth.resolver.ts
import { UseGuards } from "@nestjs/common";
import { RateLimitGuard } from "../common/guards/rate-limit.guard";
import { RateLimitPresets } from "../common/decorators/rate-limit.decorator";

@Query()
@UseGuards(new RateLimitGuard(rateLimitService, RateLimitPresets.AUTH))
async login(@Args() args) {
  // This endpoint limited to 5 per 15 min
}
```

### Option 3: Customize Config

Edit **src/middleware/index.ts**:

```typescript
const rateLimitConfig = {
  "auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // ← Change here
  payment: { windowMs: 5 * 60 * 1000, maxRequests: 3 }, // ← Or here
};
```

Restart backend → changes applied!

---

## 📊 Response Format

### Success Response (HTTP 200)

```http
GET /shop-api/products

HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 2024-01-01T12:00:00Z

{ "data": [...] }
```

### Rate Limit Exceeded (HTTP 429)

```http
GET /shop-api/products (301st request)

HTTP/1.1 429 Too Many Requests
Retry-After: 840
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-01T12:00:00Z
Content-Type: application/json

{
  "statusCode": 429,
  "message": "Too many requests. Please retry after 840 seconds.",
  "retryAfter": 840
}
```

---

## 🧪 Testing

### Run Test Script

```bash
cd mason-shop-back

# Install ts-node if not already
npm install --save-dev ts-node

# Run test
npm run ts-node src/scripts/test-rate-limit.ts
```

Expected output:

```
🧪 Testing Rate Limiting System...

Test: test-user-ip:192.168.1.1
Limit: 5 requests per 15 minutes

Request 1: ✅ ALLOWED
  Remaining: 4
  Limit: 5

Request 2: ✅ ALLOWED
  Remaining: 3
  Limit: 5

...

Request 6: 🚫 BLOCKED
  Remaining: 0
  Limit: 5
  Retry After: 840s

📊 Final Stats: { identifier: "test-user-ip:...", currentCount: 5, ttl: 840 }

🔄 Resetting rate limit...
📊 After Reset: { identifier: "test-user-ip:...", currentCount: 0, ttl: -2 }

✅ Test completed!
```

### Manual cURL Test

```bash
# Rapid-fire requests (should get blocked after limit)
for i in {1..7}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/shop-api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"pass"}' \
    -i 2>/dev/null | grep -E "429|200|X-RateLimit"
  echo
  sleep 0.5
done
```

---

## 🔐 Security Characteristics

### ✅ What It Protects Against

| Threat                 | Protection                     |
| ---------------------- | ------------------------------ |
| Brute-force attacks    | 🛡️ Yes (login limit: 5/15min)  |
| Password guessing      | 🛡️ Yes (slow down attempts)    |
| Spam registrations     | 🛡️ Yes (register limit: 3/1hr) |
| API scraping           | 🛡️ Yes (300/15min limit)       |
| Application-level DDoS | 🛡️ Partial (can slow attacker) |

### ❌ What It Doesn't Protect Against

| Threat                    | Why                            |
| ------------------------- | ------------------------------ |
| Network-level DDoS        | App-level only, needs WAF/CDN  |
| Distributed attacks       | Multiple IPs ≈ multiple limits |
| Legitimate traffic spikes | May rate-limit real users      |

### 🔑 Key Notes

- **Identifier** = User ID (if logged in) or IP address
- **Storage** = Redis (centralized, survives restarts)
- **Time windows** = Auto-reset based on TTL
- **Fail-open** = If Redis down, all requests allowed (availability > security)

---

## 📈 Configuration Reference

### Rate Limit Presets

```typescript
RateLimitPresets.AUTH; // 5 per 15 min   → Login/register attempts
RateLimitPresets.PAYMENT; // 10 per 10 min  → Payment operations
RateLimitPresets.GENERAL; // 100 per 15 min → Normal API usage
RateLimitPresets.STRICT; // 1 per 1 min    → Sensitive operations
RateLimitPresets.RELAXED; // 1000 per 1 hr  → Batch operations
```

### Time Conversion

| Duration   | Milliseconds             |
| ---------- | ------------------------ |
| 1 second   | 1000                     |
| 5 seconds  | 5000                     |
| 1 minute   | 60 \* 1000 = 60000       |
| 5 minutes  | 5 _ 60 _ 1000 = 300000   |
| 15 minutes | 15 _ 60 _ 1000 = 900000  |
| 1 hour     | 60 _ 60 _ 1000 = 3600000 |

---

## 🛠️ Common Customizations

### Whitelist an IP

Edit `src/middleware/rate-limit.middleware.ts`:

```typescript
function getIdentifier(req: Request): string {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip;

  // ← ADD THIS
  if (ip === "192.168.1.100") {
    return "whitelisted"; // Will have separate high limit
  }

  return `ip:${ip}`;
}
```

Then set higher limit for "whitelisted":

```typescript
"whitelisted": { windowMs: 60 * 60 * 1000, maxRequests: 100000 },
```

### Different Limits per User Tier

```typescript
const rateLimitConfig = {
  "auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  payment: {
    windowMs: 10 * 60 * 1000,
    maxRequests: process.env.USER_TIER === "premium" ? 100 : 10,
  },
};
```

### Exclude Specific Paths

```typescript
function getIdentifier(req: Request): string {
  // Skip rate limiting for health checks
  if (req.path === "/health") {
    return "healthcheck"; // High limit or whitelist
  }

  return `ip:${ip}`;
}
```

---

## 📚 Files Reference

| File                       | Purpose             | Key Functions                           |
| -------------------------- | ------------------- | --------------------------------------- |
| `rate-limit.service.ts`    | Core logic          | `checkLimit()`, `reset()`, `getStats()` |
| `rate-limit.middleware.ts` | Express middleware  | `createRateLimitMiddleware()`           |
| `rate-limit.guard.ts`      | NestJS guard        | `RateLimitGuard.canActivate()`          |
| `rate-limit.decorator.ts`  | Decorator + presets | `@RateLimit()`, `RateLimitPresets`      |
| `redis.service.ts`         | Redis client        | `get()`, `set()`, `getTTL()`, `incr()`  |
| `middleware/index.ts`      | Integration         | Middleware chain setup                  |

---

## ✅ Checklist: Production Ready

- [x] Uses Redis (distributed, persistent)
- [x] Supports authenticated users + anonymous IPs
- [x] Configurable time windows & request limits
- [x] Clear response headers (X-RateLimit-\*)
- [x] Retry-After header for clients
- [x] Error logging & monitoring
- [x] Fail-open strategy (availability)
- [x] Easily customizable config
- [x] Test script included
- [x] Documentation complete

---

## 🎯 Next Steps

1. **Customize limits** if needed (src/middleware/index.ts)
2. **Test** with test script or manual cURL
3. **Monitor** Redis keys in production
4. **Adjust** based on real-world usage patterns
5. **Add 2FA** (next critical security feature)

---

## 📞 Questions?

See detailed guides:

- **Quick reference**: `QUICK_START_RATE_LIMIT.md`
- **Full setup guide**: `RATE_LIMIT_SETUP.md`
