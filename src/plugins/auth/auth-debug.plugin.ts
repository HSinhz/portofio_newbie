// src/plugins/auth-debug.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { OnApplicationBootstrap } from "@nestjs/common";

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class AuthDebugPlugin implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    console.log("🔐 Auth Debug Plugin initialized");
    console.log("📋 Auth Config:");
    console.log("  - Token Method: cookie");
    console.log("  - Cookie Name: vendure-auth-token");
    console.log(
      "  - Cookie Secret:",
      process.env.COOKIE_SECRET ? "✅ Set" : "❌ Missing",
    );
    console.log("  - Session Duration: 7d");
    console.log("  - Require Verification:", false);
  }
}
