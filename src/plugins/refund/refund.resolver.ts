// plugins/refund/refund.resolver.ts
import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { Ctx, RequestContext } from "@vendure/core";
import { RefundService } from "./refund.service";

@Resolver()
export class RefundResolver {
  constructor(private refundService: RefundService) {}

  @Query()
  async myRefunds(@Ctx() ctx: RequestContext) {
    const userId = ctx.activeUserId;
    if (!userId) throw new Error("Chưa đăng nhập");
    return this.refundService.getRefundsByUser(ctx, userId);
  }

  @Mutation()
  async requestRefund(
    @Ctx() ctx: RequestContext,
    @Args("input") input: { orderId: string; amount: number; reason: string; refundTo?: "original" | "wallet" },
  ) {
    const userId = ctx.activeUserId;
    if (!userId) return { success: false, message: "Chưa đăng nhập" };
    return this.refundService.requestRefund(ctx, { userId, ...input });
  }
}
