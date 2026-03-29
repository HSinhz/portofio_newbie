// src/services/redis.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

/**
 * RedisService — wrapper gọn cho ioredis.
 * Dùng OnModuleInit / OnModuleDestroy để đảm bảo kết nối / đóng kết nối
 * được quản lý bởi vòng đời NestJS (Vendure dùng NestJS bên trong).
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      // Tự động reconnect khi mất kết nối
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on("connect", () =>
      console.log("✅ [Redis] Connected to Redis"),
    );
    this.client.on("error", (err) =>
      console.error("❌ [Redis] Error:", err.message),
    );
  }

  onModuleDestroy() {
    this.client.quit();
  }

  // ─── CRUD ───────────────────────────────────────────────────

  /** Lấy giá trị theo key. Trả về null nếu không tồn tại hoặc đã hết TTL. */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Lưu giá trị với TTL (giây). Dùng SETEX. */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  /** Xóa một hoặc nhiều key. */
  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.client.del(...keys);
  }

  /** Tìm tất cả key theo pattern (e.g. "products:*"). */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * SET nếu key chưa tồn tại (atomic).
   * Trả về true  → set thành công (request đầu tiên)
   * Trả về false → key đã tồn tại (duplicate request)
   */
  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }
}
