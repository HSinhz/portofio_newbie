// src/middleware/cookie-logger.middleware.ts
import { VendureConfig } from "@vendure/core";

export const cookieLoggerMiddleware = [
  {
    route: "*",
    handler: (req: any, res: any, next: any) => {
      // Log mỗi request
      if (req.path.includes("/shop-api")) {
        console.log("\n📨 Incoming Request:");
        console.log("  Path:", req.path);
        console.log("  Cookies:", req.cookies);

        // Intercept response to log Set-Cookie
        const originalSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name: string, value: any) {
          if (name.toLowerCase() === "set-cookie") {
            console.log("🍪 Setting Cookie:", value);
          }
          return originalSetHeader(name, value);
        };
      }
      next();
    },
  },
];
