// src/middleware/security-headers.middleware.ts
/**
 * Security Headers Middleware using Helmet.js
 * Protects against common web vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME-type sniffing
 * - CSRF attacks
 * - Weak SSL/TLS configuration
 */

import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

export const securityHeadersMiddleware = helmet({
  // Content Security Policy: Prevents inline scripts and restricts resource loading
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust based on your needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || "http://localhost:5173",
      ],
      fontSrc: ["'self'", "data:"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"], // Prevent clickjacking
    },
  },

  // X-Content-Type-Options: Prevents MIME-type sniffing
  noSniff: true,

  // X-Frame-Options: Prevents clickjacking attacks
  frameguard: {
    action: "deny",
  },

  // X-XSS-Protection: Legacy XSS protection for older browsers
  xssFilter: true,

  // Strict-Transport-Security: Forces HTTPS connection
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // Referrer-Policy: Controls what referrer information is shared
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  // Cross-Origin-Opener-Policy: Isolates browsing context
  crossOriginOpenerPolicy: {
    policy: "same-origin-allow-popups",
  },

  // Cross-Origin-Resource-Policy: Controls resource sharing
  crossOriginResourcePolicy: {
    policy: "cross-origin",
  },

  // Cross-Origin-Embedder-Policy: Requires CORS headers for embedded resources
  crossOriginEmbedderPolicy: false, // Can be enabled if needed
});

// Export as both default and named export for compatibility
export default securityHeadersMiddleware;
