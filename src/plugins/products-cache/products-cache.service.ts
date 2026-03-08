// src/plugins/products-cache/products-cache.service.ts
import { Injectable } from "@nestjs/common";
import { ProductService, RequestContext } from "@vendure/core";
import { RedisService } from "../../services/redis.service";

/** Thời gian sống của cache (giây). Thay đổi nếu cần. */
const CACHE_TTL = 300; // 5 phút

@Injectable()
export class ProductsCacheService {
  constructor(
    private productService: ProductService,
    private redisService: RedisService,
  ) {}

  /**
   * Lấy danh sách sản phẩm.
   *   1. Kiểm tra Redis → trả về ngay nếu có (Cache HIT).
   *   2. Cache miss → query PostgreSQL qua Vendure ProductService.
   *   3. Lưu kết quả vào Redis với TTL.
   */
  async getProducts(ctx: RequestContext, skip = 0, take = 20) {
    const cacheKey = `products:skip:${skip}:take:${take}`;

    // ── Bước 1: Kiểm tra cache ──────────────────────────────
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`🚀 [Cache HIT]  ${cacheKey}`);
      return JSON.parse(cached);
    }

    // ── Bước 2: Query DB ────────────────────────────────────
    console.log(`💾 [Cache MISS] ${cacheKey} — truy vấn PostgreSQL`);

    const result = await this.productService.findAll(
      ctx,
      {
        skip,
        take,
        filter: { enabled: { eq: true } }, // chỉ lấy sản phẩm đang bật
      },
      // Load các relation cần thiết
      ["featuredAsset", "variants", "variants.productVariantPrices"],
    );

    // ── Bước 3: Map sang DTO nhỏ gọn để cache ──────────────
    const data = {
      totalItems: result.totalItems,
      items: result.items.map((p) => ({
        id: String(p.id),
        name: p.name,
        description: p.description,
        featuredAsset:
          p.featuredAsset ? { source: p.featuredAsset.source } : null,
        variants: (p.variants ?? []).map((v) => ({
          id: String(v.id),
          // Lấy price từ bảng ProductVariantPrice (hỗ trợ multi-channel)
          price:
            v.productVariantPrices?.find(
              (pvp) => String(pvp.channelId) === String(ctx.channelId),
            )?.price ??
            v.productVariantPrices?.[0]?.price ??
            0,
        })),
      })),
    };

    // ── Bước 4: Lưu vào Redis ───────────────────────────────
    await this.redisService.set(cacheKey, JSON.stringify(data), CACHE_TTL);
    console.log(`✅ [Cached]     ${cacheKey} (TTL: ${CACHE_TTL}s)`);

    return data;
  }

  /**
   * Xóa toàn bộ cache sản phẩm.
   * Gọi sau khi admin cập nhật/thêm/xóa sản phẩm.
   */
  async invalidateCache(): Promise<void> {
    const keys = await this.redisService.keys("products:*");
    if (keys.length > 0) {
      await this.redisService.del(...keys);
    }
    console.log(`🗑 [Cache] Đã xóa ${keys.length} cache key sản phẩm`);
  }
}
