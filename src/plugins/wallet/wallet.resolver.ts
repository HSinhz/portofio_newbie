// plugins/wallet/wallet.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { Ctx, RequestContext } from "@vendure/core";
import { WalletService } from "./wallet.service";

@Resolver()
export class WalletResolver {
  constructor(private walletService: WalletService) {}

  @Query()
  async myWalletBalance(@Ctx() ctx: RequestContext): Promise<number> {
    const userId = ctx.activeUserId;
    if (!userId) throw new Error("Chưa đăng nhập");
    return this.walletService.getBalance(ctx, userId);
  }

  @Mutation()
  async walletTopUp(
    @Ctx() ctx: RequestContext,
    @Args("amount") amount: number,
    @Args("description") description?: string,
  ) {
    const userId = ctx.activeUserId;
    if (!userId) return { success: false, message: "Chưa đăng nhập" };
    return this.walletService.topUp(ctx, { userId, amount, description });
  }

  @Mutation()
  async walletPay(
    @Ctx() ctx: RequestContext,
    @Args("orderId") orderId: string,
    @Args("amount") amount: number,
  ) {
    const userId = ctx.activeUserId;
    if (!userId) return { success: false, message: "Chưa đăng nhập" };
    return this.walletService.deduct(ctx, { userId, amount, orderId });
  }
}
