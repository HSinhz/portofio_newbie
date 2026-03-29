// src/plugins/payment/payment.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { PaymentResolver } from "./payment.resolver";
import { PaymentService } from "./paytment.service";
import { PaymentInitService } from "./payment-init.service";
import { RedisService } from "../../services/redis.service";
import { gql } from "graphql-tag";
import { readFileSync } from "fs";
import path from "path";

// Đọc GraphQL schema từ file .graphql
const schemaFile = readFileSync(
  path.join(__dirname, "payment.graphql"),
  "utf-8",
);

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [PaymentService, PaymentInitService, RedisService],
  shopApiExtensions: {
    schema: gql(schemaFile),
    resolvers: [PaymentResolver],
  },
  compatibility: "^3.0.0",
})
export class PaymentPlugin {}
