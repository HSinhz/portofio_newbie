// src/plugins/cart-plugin/cart.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { CartResolver } from "./cart.resolver";
import { CartService } from "./cart.service";
import { shopApiExtensions } from "./api/api-extensions";

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CartService],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [CartResolver],
  },
  compatibility: "^3.0.0",
})
export class CartPlugin {}
