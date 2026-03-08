// src/plugins/products-cache/products-cache.plugin.ts
import {
  PluginCommonModule,
  ProductService,
  VendurePlugin,
} from "@vendure/core";
import { gql } from "graphql-tag";
import { readFileSync } from "fs";
import path from "path";
import { ProductsCacheResolver } from "./products-cache.resolver";
import { ProductsCacheService } from "./products-cache.service";
import { RedisService } from "../../services/redis.service";

const schemaFile = readFileSync(
  path.join(__dirname, "products-cache.graphql"),
  "utf-8",
);

@VendurePlugin({
  imports: [PluginCommonModule], // Cung cấp ProductService + các Vendure core services
  providers: [
    RedisService, // Redis client wrapper
    ProductsCacheService, // Logic cache
  ],
  shopApiExtensions: {
    schema: gql(schemaFile),
    resolvers: [ProductsCacheResolver],
  },
})
export class ProductsCachePlugin {}
