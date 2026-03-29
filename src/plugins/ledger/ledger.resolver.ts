// plugins/ledger/ledger.resolver.ts
import { Resolver, Query, Args } from "@nestjs/graphql";
import { Ctx, RequestContext } from "@vendure/core";
import { LedgerService } from "./ledger.service";

@Resolver()
export class LedgerResolver {
  constructor(private ledgerService: LedgerService) {}

  @Query()
  async myTransactionHistory(
    @Ctx() ctx: RequestContext,
    @Args("limit") limit = 20,
    @Args("offset") offset = 0,
  ) {
    const userId = ctx.activeUserId;
    if (!userId) throw new Error("Chưa đăng nhập");
    return this.ledgerService.getHistory(ctx, userId, limit, offset);
  }
}
