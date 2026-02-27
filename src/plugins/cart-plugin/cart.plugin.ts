// src/plugins/cart-plugin/cart.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { CartResolver } from "./cart.resolver";
import { CartService } from "./cart.service";
import { gql } from "graphql-tag";
import { readFileSync } from "fs";
import path from "path";

const schemaFile = readFileSync(
  path.join(__dirname, "api/cart.graphql"),
  "utf-8",
);

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CartService],
  shopApiExtensions: {
    schema: gql(schemaFile),
    resolvers: [CartResolver],
  },
  compatibility: "^3.0.0",
})
export class CartPlugin {}
