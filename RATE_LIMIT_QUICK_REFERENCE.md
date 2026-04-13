// RATE_LIMIT_QUICK_REFERENCE.md

# 🚀 Rate Limiting - Quick Reference Card

## What It Does

Prevents DDoS, brute-force, spam by limiting requests per IP/user.

```
User's 5th request:  ✅ Allowed
User's 6th request:  🚫 Blocked (429)
Wait 15 min...
User's 7th request:  ✅ Allowed
```

---

## Current Limits

| Route           | Max | Window | Use Case                  |
| --------------- | --- | ------ | ------------------------- |
| `auth/login`    | 5   | 15 min | Prevent password guessing |
| `auth/register` | 3   | 1 hour | Prevent spam accounts     |
| `payment`       | 10  | 10 min | Prevent duplicate charges |
| `(default)`     | 300 | 15 min | General API usage         |

---

## How Client Gets Blocked

```
Client Request #1-5:  ✅ Success (200)
  X-RateLimit-Remaining: 4
  X-RateLimit-Remaining: 3
  X-RateLimit-Remaining: 2
  X-RateLimit-Remaining: 1
  X-RateLimit-Remaining: 0

Client Request #6:  🚫 429 Too Many Requests
  Retry-After: 840
  ↓
  Client waits 840 seconds
  ↓
Client Request #7:  ✅ Success (200)
```

---

## Where It's Implemented

```
Backend Setup:
├─ src/services/redis.service.ts         ← Redis connection
├─ src/services/rate-limit.service.ts    ← Rate limit logic
├─ src/middleware/rate-limit.middleware.ts ← Express middleware
├─ src/middleware/index.ts                ← Integrated here ✅ ACTIVE
└─ src/scripts/test-rate-limit.ts        ← Test script
```

**Status:** ✅ **Already active** on backend startup!

---

## Start Backend

```bash
cd mason-shop-back
npm run dev
```

Rate limiting automatically enabled!

---

## Quick Test

```bash
# Run test script
npm run ts-node src/scripts/test-rate-limit.ts
```

Output shows requests 1-5 ✅, request 6+ 🚫

---

## Customize Limits

Edit `src/middleware/index.ts`:

```typescript
const rateLimitConfig = {
  "auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // ← Change
};
```

Restart backend → changes apply!

---

## Response Headers

Every response includes:

```
X-RateLimit-Limit: 5        (Max requests)
X-RateLimit-Remaining: 2    (Left this window)
X-RateLimit-Reset: 2024-01-01T... (When resets)
```

If blocked:

```
HTTP 429
Retry-After: 840 (seconds)
```

---

## Monitor

```bash
# View Redis rate limit keys
docker exec -it <redis-container> redis-cli
KEYS ratelimit:*
GET ratelimit:ip:192.168.1.1
```

---

## FAQ

**Q: Why is a user getting blocked?**
A: They exceeded limit. Wait time = Retry-After header.

**Q: How do I increase the limit?**
A: Edit `src/middleware/index.ts`, change `maxRequests` value.

**Q: Can users bypass it?**
A: Not easily. Uses Redis (server-side), not client-side.

**Q: What if Redis crashes?**
A: Requests allowed through (fail-open). Available > secure.

**Q: Does it work with multiple servers?**
A: Yes! Redis is centralized, all servers share limits.

---

## Security

✅ **Prevents:**

- Password guessing (brute-force)
- Spam registrations
- API scraping
- Payment fraud (duplicate charges)

❌ **Doesn't prevent:**

- Network-level DDoS (need CDN/WAF)
- Distributed attacks (multiple IPs)

---

## Files

| File                       | What                   |
| -------------------------- | ---------------------- |
| `rate-limit.service.ts`    | Core check/reset logic |
| `rate-limit.middleware.ts` | Express middleware     |
| `rate-limit.guard.ts`      | Per-route NestJS guard |
| `redis.service.ts`         | Redis client           |
| `middleware/index.ts`      | Integration point      |
| `test-rate-limit.ts`       | Test script            |

---

## Detailed Docs

- `QUICK_START_RATE_LIMIT.md` - 5-minute setup
- `RATE_LIMIT_SETUP.md` - Full guide with examples
- `IMPLEMENTATION_SUMMARY.md` - Technical details

---

## Next Security Steps

After rate-limiting:

1. ✅ **Rate Limiting** (done)
2. 🔧 **Input Validation** (zod/yup)
3. 🔐 **Security Headers** (helmet.js)
4. 🔑 **2FA/MFA** (TOTP)
5. 📝 **API Documentation** (OpenAPI)

---

**💡 Pro Tip:** Copy this file to frontend developers so they understand rate limiting behavior!
