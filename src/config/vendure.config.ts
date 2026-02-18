// src/config/vendure.config.ts
import { VendureConfig, dummyPaymentHandler } from "@vendure/core";
import { apiOptions } from "./api.config";
import { authOptions } from "./auth.config";
import { dbConnectionOptions } from "./db.config";
import { orderOptions } from "./order.config";

// ✅ Import các plugins cần thiết
import { GraphiqlPlugin } from "@vendure/graphiql-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import {
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
} from "@vendure/core";
import {
  EmailPlugin,
  defaultEmailHandlers,
  FileBasedTemplateLoader,
} from "@vendure/email-plugin";
import path from "path";

// ✅ Import custom plugin
import { CustomAuthPlugin } from "../plugins/auth/custom-auth.plugin";

const IS_DEV = process.env.APP_ENV === "dev";
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
  apiOptions,
  authOptions,
  dbConnectionOptions,
  orderOptions,

  // ✅ THÊM paymentOptions
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },

  customFields: {},

  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: path.join(__dirname, "../../static/assets"),
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, "../../static/email/test-emails"),
      route: "mailbox",
      handlers: defaultEmailHandlers,
      templateLoader: new FileBasedTemplateLoader(
        path.join(__dirname, "../../static/email/templates"),
      ),
    }),
    AdminUiPlugin.init({
      route: "admin",
      port: serverPort + 2,
    }),
    CustomAuthPlugin, // ✅ Add custom auth plugin
  ],
};
