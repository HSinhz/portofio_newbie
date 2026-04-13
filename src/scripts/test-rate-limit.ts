// src/scripts/test-rate-limit.ts
import { RedisService } from "../services/redis.service";
import { RateLimitService } from "../services/rate-limit.service";

async function main() {
  // ← Remove export
  console.log("🧪 Testing Rate Limiting System...\n");
  const redisService = new RedisService();
  await redisService.onModuleInit();

  const rateLimitService = new RateLimitService(redisService);

  const identifier = "mason";
  const options = { windowMs: 15 * 60 * 1000, maxRequests: 3 };

  console.log(`Test: ${identifier}`);
  console.log(
    `Limit: ${options.maxRequests} per ${options.windowMs / 60000} min\n`,
  );

  for (let i = 1; i <= 7; i++) {
    const result = await rateLimitService.checkLimit(identifier, options);
    const status = result.allowed ? "✅ ALLOWED" : "🚫 BLOCKED";

    console.log(`Request ${i}: ${status}`);
    console.log(`  Remaining: ${result.remaining}`);
    console.log(`  Limit: ${result.limit}`);
    if (!result.allowed) {
      console.log(`  Retry After: ${result.retryAfter}s`);
    }
    console.log("");
  }

  const stats = await rateLimitService.getStats(identifier);
  console.log("📊 Final Stats:", stats);

  await rateLimitService.reset(identifier);
  const statsAfterReset = await rateLimitService.getStats(identifier);
  console.log("📊 After Reset:", statsAfterReset);

  await redisService.onModuleDestroy();
  console.log("\n✅ Test completed!");
}

// ← Remove all require.main check
// ← Just call immediately
main().catch(console.error);
