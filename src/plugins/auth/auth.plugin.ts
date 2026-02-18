// src/plugins/auth/auth.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { gql } from "graphql-tag";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { readFileSync } from "fs";
import path from "path";

// ✅ Đọc file .graphql và parse thành DocumentNode
const schemaFile = readFileSync(path.join(__dirname, "auth.graphql"), "utf-8");

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [AuthService],
  shopApiExtensions: {
    // ✅ Parse string thành DocumentNode bằng gql
    schema: gql(schemaFile),
    resolvers: [AuthResolver],
  },
})
export class AuthPlugin {}
