import { Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  module?: string; // ← Thêm dòng này
}

export interface RateLimitResult {
  allowed: boolean; // Có được phép request hay không
  remaining: number; // Số request còn lại trong window
  retryAfter: number; // Thời gian (giây) còn lại để reset limit
  limit: number; // Số request tối đa trong window
}

/**
 * RateLimitService → Quản lý rate limiting dùng Redis
 *
 * Flow:
 * 1. Client gửi request
 * 2. Service lấy số request hiện tại từ Redis
 * 3. Nếu > limit → Block + return retryAfter
 * 4. Nếu ≤ limit → Cho phép + increment counter
 */

@Injectable()
export class RateLimitService {
  constructor(private readonly redisService: RedisService) {}

  async checkLimit(
    identifier: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    const windowSeconds = Math.ceil(options.windowMs / 1000);

    try {
      // ← STEP 1: Get current count
      const currentCount = await this.redisService.get(key);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      console.log(
        `[DEBUG] ${key}: Current count=${count}, Max=${options.maxRequests}`,
      );

      // ← STEP 2: Check if already at/exceeded limit
      if (count >= options.maxRequests) {
        const ttl = await this.redisService.getTTL(key);
        console.log(
          `[DEBUG] ${key}: BLOCKED! count=${count} >= max=${options.maxRequests}`,
        );

        return {
          allowed: false, // 🚫 BLOCK
          remaining: 0,
          retryAfter: ttl > 0 ? ttl : windowSeconds,
          limit: options.maxRequests,
        };
      }

      // ← STEP 3: Not exceeded → process request
      // First request: set key with TTL
      if (count === 0) {
        await this.redisService.set(key, "1", windowSeconds);
        console.log(
          `[DEBUG] ${key}: First request, set=1, TTL=${windowSeconds}s`,
        );

        return {
          allowed: true,
          remaining: options.maxRequests - 1, // 5 - 1 = 4
          retryAfter: 0,
          limit: options.maxRequests,
        };
      }

      // ← STEP 4: Subsequent request → ONLY INCR ONCE
      const newCount = await this.redisService.incr(key);
      console.log(`[DEBUG] ${key}: Increment, newCount=${newCount}`);

      return {
        allowed: true,
        remaining: Math.max(0, options.maxRequests - newCount),
        retryAfter: 0,
        limit: options.maxRequests,
      };
    } catch (error) {
      console.error(`❌ [RateLimitService] Error for ${identifier}:`, error);
      return {
        allowed: true,
        remaining: options.maxRequests - 1,
        retryAfter: 0,
        limit: options.maxRequests,
      };
    }
  }

  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    await this.redisService.del(key);
  }

  async getStats(identifier: string): Promise<any> {
    const key = `ratelimit:${identifier}`;
    const count = await this.redisService.get(key);
    const ttl = await this.redisService.getTTL(key);
    return {
      identifier,
      currentCount: count ? parseInt(count, 10) : 0,
      ttl: ttl > 0 ? ttl : 0,
    };
  }
}
