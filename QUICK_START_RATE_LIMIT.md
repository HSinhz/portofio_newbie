// QUICK_START_RATE_LIMIT.md

# 🚀 Quick Start: Rate Limiting (5 phút setup)

## What is Rate Limiting?

**Ngăn chặn hacker brute-force, DDoS, spam.**

Con số request được track trong Redis:

```
IP 192.168.1.1:
├─ Request 1: ✅ OK
├─ Request 2: ✅ OK
├─ Request 3: ✅ OK
├─ Request 4: ✅ OK
├─ Request 5: ✅ OK
└─ Request 6: 🚫 BLOCKED (Exceeded 5 per 15 min)
```

---

## ✅ Already Implemented

Rate limiting code đã được tạo sẵn:

```
📁 src/
├── services/
│   ├── redis.service.ts        (Redis client)
│   └── rate-limit.service.ts   (Rate limit logic) ✅ NEW
├── common/
│   ├── guards/
│   │   └── rate-limit.guard.ts (NestJS Guard) ✅ NEW
│   └── decorators/
│       └── rate-limit.decorator.ts (Decorator) ✅ NEW
├── middleware/
│   ├── rate-limit.middleware.ts (Express Middleware) ✅ NEW
│   └── index.ts                (Already integrated) ✅ UPDATED
└── scripts/
    └── test-rate-limit.ts      (Test script) ✅ NEW
```

---

## 🎯 Setup (3 steps)

### Step 1: Make sure Redis is running

```bash
# Check docker-compose
cat docker-compose.local.yml | grep redis

# Start Redis (if not running)
docker-compose -f docker-compose.local.yml up redis -d
```

### Step 2: Start backend

```bash
cd mason-shop-back
npm run dev
```

Redis will auto-initialize, and rate limiting is **already enabled**!

### Step 3: Test it

```bash
# Try to login rapidly
for i in {1..7}; do
  curl -X POST http://localhost:3000/shop-api/ \
    -H "Content-Type: application/json" \
    -d '{"...":"..."}' \
    -i | grep -E "429|X-RateLimit"

  sleep 1
done
```

Expected:

- Requests 1-5: ✅ Success
- Requests 6-7: 🚫 `429 Too Many Requests`

---

## 📊 Current Configuration

Rate limits applied to **shop-api** routes:

| Endpoint        | Limit | Window | Why                    |
| --------------- | ----- | ------ | ---------------------- |
| auth/login      | 5     | 15 min | Brute-force prevention |
| auth/register   | 3     | 1 hour | Spam accounts          |
| auth/logout     | 20    | 15 min | Account takeover       |
| payment/process | 10    | 10 min | Duplicate charges      |
| cart            | 50    | 15 min | Abuse                  |
| (default)       | 300   | 15 min | General API limit      |

### How to Customize?

Edit **src/middleware/index.ts**:

```typescript
const rateLimitConfig = {
  "auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // ← Change this
  // ... more configs
};
```

Restart backend → changes apply immediately!

---

## 🔍 How It Works

### Flow

```
Client Request
    ↓
Middleware (rate-limit.middleware.ts)
    ↓
Get Identifier (user ID or IP)
    ↓
Check Redis: ratelimit:ip:192.168.1.1
    ├─ Count < Limit → ✅ Allow + Increment
    └─ Count ≥ Limit → 🚫 Block + Return 429
    ↓
Response + Headers:
  X-RateLimit-Limit: 5
  X-RateLimit-Remaining: 2
  Retry-After: 840
```

### Identifier Strategy

1. **If user logged in** → Use user ID
   - Key: `user:12345`
2. **If not logged in** → Use IP address
   - Key: `ip:192.168.1.1`
   - Supports proxies (X-Forwarded-For header)

---

## 🧪 Testing

### Manual Test

```bash
# 1. Run test script
npm run ts-node src/scripts/test-rate-limit.ts

# Output:
# Request 1: ✅ ALLOWED
#   Remaining: 4
#   Limit: 5
# ...
# Request 6: 🚫 BLOCKED
#   Retry After: 840s
```

### View Redis Keys

```bash
# SSH into Redis container
docker exec -it mason-shop-back-redis redis-cli

# List all rate limit keys
KEYS ratelimit:*

# Check specific key
GET ratelimit:ip:192.168.1.1
TTL ratelimit:ip:192.168.1.1
```

---

## 🛠️ Troubleshooting

### Rate limiting not working?

```bash
# 1. Check Redis is running
curl http://localhost:6379

# 2. Check logs
docker logs mason-shop-back

# Expected: "✅ Rate Limiting middleware activated"
```

### Traffic not rate-limited?

```bash
# 1. Check configured routes
grep -n "rateLimitConfig" src/middleware/index.ts

# 2. Route might not match pattern
# Example: auth/login matches "auth.*" pattern
```

### Redis connection error?

Rate limiting will **fail open** (allow all requests) if Redis is down.
This prioritizes **availability** but reduces **security**.

```
❌ RateLimit middleware error: Connection refused
// Requests will pass through unthrottled
```

---

## 📁 File Reference

| File                                        | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| `services/rate-limit.service.ts`            | Core logic (check, reset, stats)         |
| `services/redis.service.ts`                 | Redis client (updated with getTTL, incr) |
| `middleware/rate-limit.middleware.ts`       | Express middleware                       |
| `common/guards/rate-limit.guard.ts`         | NestJS guard (optional per-route)        |
| `common/decorators/rate-limit.decorator.ts` | @RateLimit decorator                     |
| `middleware/index.ts`                       | Integration point                        |
| `RATE_LIMIT_SETUP.md`                       | Detailed setup guide                     |
| `scripts/test-rate-limit.ts`                | Test script                              |

---

## 🔐 Security Notes

✅ **What rate limiting does:**

- Prevent brute-force attacks (password guessing)
- Prevent spam registrations
- Prevent API abuse (scraping, flooding)

❌ **What it doesn't do:**

- Replace authentication (still need login)
- Prevent every DDoS (application-level only)
- Encrypt data

**Full security needs:**

1. ✅ Rate Limiting (this)
2. ✅ Authentication (JWT)
3. ✅ Input Validation (next step)
4. ✅ HTTPS/TLS
5. ✅ Security headers (helmet.js)
6. ✅ DDoS protection (WAF, CDN)

---

## ❓ FAQ

**Q: Can I whitelist certain IPs?**
A: Yes, modify middleware/rate-limit.middleware.ts:

```typescript
if (ip === "192.168.1.1") return next(); // Skip rate limiting
```

**Q: How long is data kept in Redis?**
A: Based on windowMs (15 min default). Auto-expires after window.

**Q: Can rate limits sync across multiple servers?**
A: Yes! Redis is centralized, so all servers share same limits.

**Q: What about authenticated users?**
A: Each user has separate limit based on user ID, not IP.

---

## 🎓 Next Steps

1. **Customize limits** for your endpoints (src/middleware/index.ts)
2. **Monitor Redis** for stats in production
3. **Add alerting** when rate limits are exceeded frequently
4. **Test** with load testing tools (wrk, Apache JMeter)

---

👉 **Need more details?** See `RATE_LIMIT_SETUP.md`
