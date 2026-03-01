import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  VendureConfig,
  PluginCommonModule,
  VendurePlugin,
} from "@vendure/core";
import {
  defaultEmailHandlers,
  EmailPlugin,
  FileBasedTemplateLoader,
} from "@vendure/email-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { GraphiqlPlugin } from "@vendure/graphiql-plugin";
import { AuthDebugPlugin } from "./plugins/auth/auth-debug.plugin";
import { CustomAuthPlugin } from "./plugins/auth/custom-auth.plugin";
import { AuthPlugin } from "./plugins/auth/auth.plugin";
import { CartPlugin } from "./plugins/cart-plugin/cart.plugin";
import { PaymentPlugin } from "./plugins/payment/payment.plugin";
import "dotenv/config";
import path from "path";
// import * as cookieParser from "cookie-parser";
import cookieParser from "cookie-parser";
// ✅ IMPORT CÁC CONFIG MỚI
import { middlewares } from "./middleware";
import { orderInterceptors } from "./interceptors";
import { LoggerController } from "./api/logger.controller"; // ✅ Import Logger Controller

import { cookieLoggerMiddleware } from "./middleware/cookie-logger.middleware";

const IS_DEV = process.env.APP_ENV === "dev";
const serverPort = +process.env.PORT || 3000;

// ✅ TẠO LOGGER PLUGIN
@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [LoggerController], // ✅ Register controller
  configuration: (config) => {
    // Optional: Có thể thêm config nếu cần
    return config;
  },
})
class LoggerPlugin {}

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    // middleware: middlewares, // ✅ THÊM DÒNG NÀY
    middleware: [
      // ✅ THÊM cookieParser ĐẦU TIÊN
      // {
      //   route: "*",
      //   handler: cookieParser(),
      //   beforeListen: true,
      // },
      ...middlewares, // middleware cũ
      ...cookieLoggerMiddleware, // middleware mới
    ],
    // call cors
    cors: {
      origin: process.env.FRONTEND_URL, // URL của Vite frontend
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },

    ...(IS_DEV ?
      {
        adminApiDebug: true,
        shopApiDebug: true,
      }
    : {}),
  },
  // authOptions: {
  //   tokenMethod: ["cookie"], // ✅ SỬA: Chỉ dùng cookie (không dùng bearer)

  //   // ✅ COOKIE OPTIONS
  //   cookieOptions: {
  //     secret: process.env.COOKIE_SECRET, // ✅ Phải có secret
  //     name: "vendure-auth-token", // ✅ Tên cookie
  //     httpOnly: true, // ✅ Bảo mật
  //     sameSite: "lax", // ✅ CORS-friendly
  //     secure: false, // ✅ false cho localhost (true cho HTTPS production)
  //   },

  //   // ✅ SESSION CONFIG
  //   sessionDuration: "7d", // ✅ Token expires sau 7 ngày
  //   sessionCacheStrategy: undefined, // ✅ Default strategy

  //   // ✅ TẮT EMAIL VERIFICATION (development)
  //   requireVerification: false,

  //   superadminCredentials: {
  //     identifier: process.env.SUPERADMIN_USERNAME,
  //     password: process.env.SUPERADMIN_PASSWORD,
  //   },
  // },
  authOptions: {
    tokenMethod: ["bearer", "cookie"],
    requireVerification: false,
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
  },
  dbConnectionOptions: {
    type: "postgres",
    synchronize: false,
    migrations: [path.join(__dirname, "./migrations/*.+(js|ts)")],
    logging: false,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },

  // ✅ THÊM orderOptions
  orderOptions: {
    orderItemsLimit: 999,
    orderInterceptors, // ✅ THÊM DÒNG NÀY
  },

  customFields: {},
  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: path.join(__dirname, "../static/assets"),
      assetUrlPrefix: IS_DEV ? undefined : "https://www.my-shop.com/assets/",
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, "../static/email/test-emails"),
      route: "mailbox",
      handlers: defaultEmailHandlers,
      templateLoader: new FileBasedTemplateLoader(
        path.join(__dirname, "../static/email/templates"),
      ),
      globalTemplateVars: {
        fromAddress: '"example" <noreply@example.com>',
        verifyEmailAddressUrl: "http://localhost:8080/verify",
        passwordResetUrl: "http://localhost:8080/password-reset",
        changeEmailAddressUrl:
          "http://localhost:8080/verify-email-address-change",
      },
    }),
    // AdminUiPlugin.init({
    //   route: "admin",
    //   port: serverPort + 2,
    //   adminUiConfig: {
    //     apiPort: serverPort,
    //   },
    // }),
    // AuthDebugPlugin,
    AuthPlugin,
    LoggerPlugin,
    CartPlugin,
    PaymentPlugin,
    // CustomAuthPlugin,
  ],
};
