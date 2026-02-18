import { ApiOptions } from "@vendure/core";
import { middlewares } from "../middleware";

const IS_DEV = process.env.APP_ENV === "dev";
const serverPort = +process.env.PORT || 3000;

export const apiOptions: ApiOptions = {
  port: serverPort,
  adminApiPath: "admin-api",
  shopApiPath: "shop-api",
  middleware: middlewares, // ← QUAN TRỌNG

  ...(IS_DEV && {
    adminApiDebug: true,
    shopApiDebug: true,
  }),
};
