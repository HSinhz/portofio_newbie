import { cartLoggerMiddleware } from "./cart-logger.middleware";

export const middlewares = [
  {
    route: "shop-api",
    handler: cartLoggerMiddleware,
  },
];
