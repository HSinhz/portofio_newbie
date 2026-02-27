// src/plugins/cart-plugin/cart.resolver.ts
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { Ctx, RequestContext, Transaction } from "@vendure/core";
import { CartService } from "./cart.service";

@Resolver()
export class CartResolver {
  constructor(private cartService: CartService) {}

  @Transaction()
  @Mutation()
  async customAddItemToOrder(
    @Ctx() ctx: RequestContext,
    @Args() args: { productVariantId: string; quantity: number },
  ) {

    console.log("resolver call frist");

    return this.cartService.addItemToOrder(
      ctx,
      args.productVariantId,
      args.quantity,
    );
  }
}
