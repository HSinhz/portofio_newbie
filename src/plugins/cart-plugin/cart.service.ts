// src/plugins/cart-plugin/cart.service.ts
import { Injectable } from "@nestjs/common";
import {
  RequestContext,
  OrderService,
  EntityHydrator,
  Order,
  ID,
  isGraphQlErrorResult,
  TransactionalConnection,
} from "@vendure/core";
import { jwtService } from "../../services/jwt.service";

@Injectable()
export class CartService {
  constructor(
    private orderService: OrderService,
    private entityHydrator: EntityHydrator,
    private connection: TransactionalConnection,
  ) {}

  // ✅ Đọc từ cookie auth_token (giống AuthResolver)
  private getUserIdFromRequest(ctx: RequestContext): ID | null {
    // Thử Authorization header trước
    const authHeader = ctx.req?.headers?.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyToken(token);
      if (payload?.userId) return payload.userId;
    }

    // ✅ Fallback: đọc từ cookie auth_token
    const cookieHeader = ctx.req?.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          if (key && value) acc[key] = decodeURIComponent(value);
          return acc;
        },
        {} as Record<string, string>,
      );

      const token = cookies["auth_token"];
      if (token) {
        const payload = jwtService.verifyToken(token);
        // console.log("🔍 JWT payload from cookie:", payload);
        if (payload?.userId) return payload.userId;
      }
    }

    return null;
  }

  async getOrCreateActiveOrder(ctx: RequestContext): Promise<Order> {
    const userId = ctx.activeUserId || this.getUserIdFromRequest(ctx);

    // console.log("👤 activeUserId:", ctx.activeUserId);
    // console.log("👤 userId from JWT:", this.getUserIdFromRequest(ctx));

    if (!userId) {
      throw new Error("User must be authenticated");
    }

    let order = await this.orderService.getActiveOrderForUser(ctx, userId);

    if (!order) {
      order = await this.orderService.create(ctx, userId);
    }

    return order;
  }

  async addItemToOrder(
    ctx: RequestContext,
    productVariantId: ID,
    quantity: number,
  ): Promise<Order> {
    if (quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    console.log("service call second");
    const order = await this.getOrCreateActiveOrder(ctx);

    const result = await this.orderService.addItemToOrder(
      ctx,
      order.id,
      productVariantId,
      quantity,
    );

    if (isGraphQlErrorResult(result)) {
      throw new Error(result.message);
    }

    await this.entityHydrator.hydrate(ctx, result, {
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.product",
        "lines.productVariant.product.featuredAsset",
        "lines.featuredAsset",
      ],
    });

    return result;
  }
}
