// src/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from "express";
import {
  RateLimitService,
  RateLimitOptions,
} from "../services/rate-limit.service";
import { jwtService } from "../services/jwt.service";

/**
 * Rate Limit Middleware - kiểm tra rate limit trước khi route handler chạy
 *
 * Flow:
 * 1. Client gửi request
 * 2. Middleware check Redis rate limit counter
 * 3. Nếu OK → increment và pass request
 * 4. Nếu exceed → return 429 Too Many Requests
 */

export interface RateLimitConfig {
  [routePattern: string]: RateLimitOptions;
}

export function createRateLimitMiddleware(
  rateLimitService: RateLimitService,
  config: RateLimitConfig,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("createRateLimitMiddleware called");
      let limitOptions: RateLimitOptions | null = null;
      let operationName = "unknown";

      if (req.method === "POST") {
        const body = (req as any).body;
        if (body?.query) {
          const operationMatch = body.query.match(/(?:mutation|query)\s+(\w+)/);
          operationName =
            operationMatch?.[1] || body.operationName || "unknown";
          console.log(`[DEBUG] GraphQL Operation: ${operationName}`);

          // ✅ Kiểm tra operation có trong config không
          limitOptions = config[operationName] || null;

          if (limitOptions) {
            console.log(
              `✅ Matched operation: "${operationName}" → maxRequests: ${limitOptions.maxRequests}`,
            );
          } else {
            // ❌ Operation không có trong config → skip rate limit
            console.log(
              `[DEBUG] Operation "${operationName}" không cần rate limit, skip...`,
            );
            return next();
          }
        }
      }

      // Nếu không phải POST hoặc không có query → skip
      if (!limitOptions) {
        console.log(`[DEBUG] Không phải GraphQL query, skip rate limit...`);
        return next();
      }

      // ✅ Lấy identifier với module name
      const identifier = getIdentifier(
        req,
        limitOptions.module || operationName,
      );
      console.log(`[DEBUG] Identifier: ${identifier}`);

      const result = await rateLimitService.checkLimit(
        identifier,
        limitOptions,
      );

      res.setHeader("X-RateLimit-Limit", result.limit);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(Date.now() + result.retryAfter * 1000).toISOString(),
      );

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfter);
        return res.status(429).json({
          statusCode: 429,
          message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        });
      }

      next();
    } catch (error) {
      console.error("❌ RateLimit middleware error:", error);
      next();
    }
  };
}

/**
 * Tìm config phù hợp cho path
 */
function findMatchingConfig(
  path: string,
  config: RateLimitConfig,
): RateLimitOptions | null {
  // 🔑 SẮP XẾP: pattern dài (cụ thể) trước, ngắn (chung) sau
  const entries = Object.entries(config).sort(
    (a, b) => b[0].length - a[0].length, // Dài → Ngắn
  );

  for (const [pattern, options] of entries) {
    const regex = new RegExp(pattern);
    if (regex.test(path)) {
      console.log(
        `✅ Matched pattern: "${pattern}" → maxRequests: ${options.maxRequests}`,
      );
      return options;
    }
  }
  return null;
}

/**
 * Lấy identifier: user ID hoặc IP address
 */
// function getIdentifier(req: Request): string {
//   // Nếu user authenticated → dùng user ID
//   if ((req as any).user?.id) {
//     return `user:${(req as any).user.id}`;
//   }

//   // Ngược lại → dùng IP address
//   const ip =
//     (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
//     req.ip ||
//     req.socket?.remoteAddress ||
//     "unknown";

//   return `mason147:${ip}`;
// }

function getIdentifier(req: Request, module: string): string {
  // ✅ 1. Lấy từ JWT header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader) {
    const token =
      Array.isArray(authHeader) ? authHeader[0] : authHeader.toString();
    if (token.startsWith("Bearer ")) {
      const verified = jwtService.verifyToken(token.slice(7));
      if (verified && verified.userId) {
        console.log(`[DEBUG] User from JWT: ${verified.userId}`);
        return `user:${verified.userId}:${module}`; // ← Thêm module
      }
    }
  }

  // ✅ 2. Lấy từ cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key && value) acc[key] = decodeURIComponent(value);
        return acc;
      },
      {} as Record<string, string>,
    );

    const token = cookies["auth_token"];
    if (token) {
      const verified = jwtService.verifyToken(token);
      if (verified && verified.userId) {
        console.log(`[DEBUG] User from cookie: ${verified.userId}`);
        return `user:${verified.userId}:${module}`; // ← Thêm module
      }
    }
  }

  // ✅ 3. Fallback: IP
  const ip = req.ip || "unknown";
  console.log(`[DEBUG] IP: ${ip}`);
  return `ip:${ip}:${module}`; // ← Thêm module
}
export function rateLimitMiddleware(
  rateLimitService: RateLimitService,
  config: RateLimitConfig,
) {
  console.log("rateLimitMiddleware called");
  return createRateLimitMiddleware(rateLimitService, config);
}
