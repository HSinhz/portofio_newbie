// src/plugins/cart-plugin/cart.service.ts
import { Injectable } from "@nestjs/common";
import {
  RequestContext,
  OrderService,
  EntityHydrator,
  Order,
  TransactionalConnection,
  ID,
  isGraphQlErrorResult,
} from "@vendure/core";

@Injectable()
export class CartService {
  constructor(
    private orderService: OrderService,
    private entityHydrator: EntityHydrator,
    private connection: TransactionalConnection,
  ) {}

  /**
   * Lấy hoặc tạo active order cho user hiện tại
   */
  async getOrCreateActiveOrder(ctx: RequestContext): Promise<Order> {
    if (!ctx.activeUserId) {
      throw new Error("User must be authenticated");
    }

    // Lấy active order của user
    let order = await this.orderService.getActiveOrderForUser(
      ctx,
      ctx.activeUserId,
    );

    // Nếu chưa có order, tạo mới
    if (!order) {
      order = await this.orderService.create(ctx, ctx.activeUserId);
    }

    return order;
  }

  /**
   * Thêm item vào order
   */
  async addItemToOrder(
    ctx: RequestContext,
    productVariantId: ID,
    quantity: number,
  ): Promise<Order> {
    // Validate quantity
    if (quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    // Lấy hoặc tạo order
    const order = await this.getOrCreateActiveOrder(ctx);

    // Thêm item vào order
    const result = await this.orderService.addItemToOrder(
      ctx,
      order.id,
      productVariantId,
      quantity,
    );

    // ✅ CHECK ERROR RESULT
    if (isGraphQlErrorResult(result)) {
      throw new Error(result.message);
    }

    // ✅ Bây giờ TypeScript biết result là Order
    const updatedOrder = result;

    // Hydrate các relations để trả về đầy đủ data cho frontend
    await this.entityHydrator.hydrate(ctx, updatedOrder, {
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.product",
        "lines.productVariant.product.featuredAsset",
        "lines.featuredAsset",
      ],
    });

    return updatedOrder;
  }
}
