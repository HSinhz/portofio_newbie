// src/plugins/products-cache/products-cache.resolver.ts
import { Args, Query, Resolver } from "@nestjs/graphql";
import { Allow, Ctx, Permission, RequestContext } from "@vendure/core";
import { ProductsCacheService } from "./products-cache.service";

@Resolver()
export class ProductsCacheResolver {
  constructor(private productsCacheService: ProductsCacheService) {}

  @Query()
  @Allow(Permission.Public)
  async cachedProducts(
    @Ctx() ctx: RequestContext,
    @Args("skip") skip?: number,
    @Args("take") take?: number,
  ) {
    return this.productsCacheService.getProducts(ctx, skip ?? 0, take ?? 20);
  }
}
