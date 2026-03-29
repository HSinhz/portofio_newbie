// plugins/refund/refund.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { RefundService } from "./refund.service";
import { RefundResolver } from "./refund.resolver";
import { RefundEntity } from "./entities/refund.entity";
import { gql } from "graphql-tag";
import { readFileSync } from "fs";
import path from "path";

const schemaFile = readFileSync(path.join(__dirname, "refund.graphql"), "utf-8");

/**
 * RefundPlugin
 *
 * Xử lý yêu cầu hoàn tiền (full / partial).
 * Flow: User request → PENDING → Admin approve → PROCESSING
 *       → PaymentGatewayService.refund() → COMPLETED
 *       → LedgerService.recordRefund()
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [RefundEntity],
  providers: [RefundService],
  exports: [RefundService],
  shopApiExtensions: {
    schema: gql(schemaFile),
    resolvers: [RefundResolver],
  },
  compatibility: "^3.0.0",
})
export class RefundPlugin {}
