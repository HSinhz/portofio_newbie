// src/plugins/cart/cart.resolver.ts
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { Ctx, RequestContext, Transaction, ID } from "@vendure/core";
import { OrderService } from "@vendure/core";

@Resolver()
export class CartResolver {
  constructor(private orderService: OrderService) {}

  @Transaction()
  @Mutation()
  async addItemToOrder(
    @Ctx() ctx: RequestContext,
    @Args() args: { productVariantId: string; quantity: number },
  ) {
    console.log("🔥 Backend received:", args);
    console.log("👤 User:", ctx.activeUserId);

    // ✅ Lấy hoặc tạo active order
    let orderId: ID;

    if (ctx.session?.activeOrderId) {
      orderId = ctx.session.activeOrderId;
    } else {
      // Tạo order mới nếu chưa có
      const newOrder = await this.orderService.create(ctx, ctx.activeUserId);
      orderId = newOrder.id;
    }

    // Thêm item vào order
    const order = await this.orderService.addItemToOrder(
      ctx,
      orderId,
      args.productVariantId,
      args.quantity,
    );

    console.log("✅ Order updated:", order);
    return order;
  }
}
