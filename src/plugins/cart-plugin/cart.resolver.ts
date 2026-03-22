// src/plugins/cart-plugin/cart.resolver.ts
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Ctx, RequestContext, Transaction } from "@vendure/core";
import { CartService } from "./cart.service";

@Resolver()
export class CartResolver {
  constructor(private cartService: CartService) {}

  @Query()
  async customActiveOrder(@Ctx() ctx: RequestContext) {
    return this.cartService.getActiveOrderForUser(ctx);
  }

  @Transaction()
  @Mutation()
  async customAddItemToOrder(
    @Ctx() ctx: RequestContext,
    @Args() args: { productVariantId: string; quantity: number },
  ) {
    return this.cartService.addItemToOrder(
      ctx,
      args.productVariantId,
      args.quantity,
    );
  }

  @Transaction()
  @Mutation()
  async customAdjustOrderLine(
    @Ctx() ctx: RequestContext,
    @Args()
    args: { orderID: string; orderLineId: string; quantity: number },
  ) {
    console.log("ctx", ctx);
    console.log("CartResolver.adjustOrderLine called with args:", args);
    return this.cartService.adjustOrderLineQuantity(
      ctx,
      args.orderID,
      args.orderLineId,
      args.quantity,
    );
  }

  @Transaction()
  @Mutation()
  async customDeleteOrderLine(
    @Ctx() ctx: RequestContext,
    @Args()
    args: { orderID: string; orderLineId: string },
  ) {
    console.log("ctx", ctx);
    console.log("CartResolver.adjustOrderLine called with args:", args);
    return this.cartService.customDeleteOrderLine(
      ctx,
      args.orderID,
      args.orderLineId,
    );
  }
}
