import { RateLimitConfig } from "../middleware/rate-limit.middleware";

export const rateLimitConfig: RateLimitConfig = {
  // ✅ Payment operations (cần limit)
  CustomPlaceOrder: {
    windowMs: 10 * 60 * 1000,
    maxRequests: 3,
    module: "payment",
  },

  // ✅ Auth operations (cần limit)
  CustomLogin: { windowMs: 15 * 60 * 1000, maxRequests: 5, module: "login" },
  CustomRegister: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    module: "register",
  },

  // ✅ Product operations (KHÔNG limit - comment out)
  // getProducts: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  // getProductDetail: { windowMs: 15 * 60 * 1000, maxRequests: 100 },

  // ✅ Cart operations (KHÔNG limit - comment out)
  // addToCart: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
};
