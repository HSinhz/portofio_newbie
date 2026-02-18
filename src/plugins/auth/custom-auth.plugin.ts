// src/plugins/auth/custom-auth.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { CustomAuthResolver } from "../../api/resolvers/auth.resolver";
import { customAuthSchema } from "../../api/schema/auth.schema";

@VendurePlugin({
  imports: [PluginCommonModule],
  shopApiExtensions: {
    schema: customAuthSchema, // ✅ Thêm lại schema
    resolvers: [CustomAuthResolver], // ✅ Thêm lại resolver
  },
  configuration: (config) => {
    console.log("✅ Custom Auth Plugin loaded with resolvers");
    return config;
  },
})
export class CustomAuthPlugin {}
