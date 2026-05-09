// src/middleware/csrf-protection.middleware.ts
/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 *
 * Token Strategy:
 * - Tokens stored in session/cookies (httpOnly)
 * - Tokens sent in response header for client to use in subsequent requests
 * - For GraphQL: token sent via X-CSRF-Token header
 * - For REST: token sent via x-csrf-token form field or header
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Extended Request type to include CSRF token
declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

// CSRF Token Storage (in-memory for demo, use Redis in production)
const tokenStore = new Map<string, string>();

const CSRF_TOKEN_COOKIE = "X-CSRF-Token";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a new CSRF token
 */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Get or create CSRF token for a session
 */
function getSessionToken(sessionId: string): string {
  let token = tokenStore.get(sessionId);

  if (!token) {
    token = generateToken();
    tokenStore.set(sessionId, token);

    // Auto-cleanup after expiry
    setTimeout(() => {
      tokenStore.delete(sessionId);
    }, TOKEN_EXPIRY);
  }

  return token;
}

/**
 * Verify CSRF token from request
 */
function verifyToken(sessionId: string, token: string): boolean {
  const storedToken = tokenStore.get(sessionId);
  return storedToken === token;
}

/**
 * Get session ID from request (cookie or generate)
 */
function getSessionId(req: Request, res: Response): string {
  // Try to get from cookies
  let sessionId = (req.cookies as any)?._session_id;

  if (!sessionId) {
    // Generate new session ID
    sessionId = generateToken();
    // Set it in cookies (httpOnly, secure)
    res.cookie("_session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: TOKEN_EXPIRY,
    });
  }

  return sessionId;
}

/**
 * Methods that should require CSRF protection
 */
const UNSAFE_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

/**
 * Routes that should skip CSRF protection
 */
const SKIP_CSRF_ROUTES = [
  "/health",
  "/ping",
  "/metrics",
  "/admin-api/auth/login", // Allow login without CSRF initially
  "/admin-api/auth/register",
];

/**
 * CSRF Protection Middleware
 */
export function csrfProtectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Get or create session ID
    const sessionId = getSessionId(req, res);

    // Get or create CSRF token for this session
    const token = getSessionToken(sessionId);

    // Attach csrfToken method to request object
    req.csrfToken = () => token;

    // Set CSRF token in response header for client to use
    res.setHeader("X-CSRF-Token", token);

    // Check if route should skip CSRF validation
    const shouldSkip = SKIP_CSRF_ROUTES.some(
      (route) => req.path === route || req.path.startsWith(route + "/"),
    );

    if (shouldSkip) {
      return next();
    }

    // For safe methods (GET, HEAD, OPTIONS), just generate token and continue
    if (!UNSAFE_METHODS.includes(req.method)) {
      return next();
    }

    // For unsafe methods, validate CSRF token
    const clientToken =
      req.headers[CSRF_HEADER] || req.body?.csrfToken || req.query?.csrfToken;

    if (!clientToken || typeof clientToken !== "string") {
      return res.status(403).json({
        success: false,
        message: "CSRF token missing or invalid",
        code: "CSRF_TOKEN_MISSING",
      });
    }

    // Verify the token
    if (!verifyToken(sessionId, clientToken)) {
      console.warn("❌ [CSRF] Token mismatch for session:", sessionId);
      return res.status(403).json({
        success: false,
        message: "CSRF token validation failed",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    console.log("✅ [CSRF] Token validated for:", req.method, req.path);
    next();
  } catch (error) {
    console.error("❌ [CSRF] Middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during CSRF validation",
    });
  }
}

/**
 * Helper: Express middleware wrapper for easy integration
 */
export const csrfMiddleware = csrfProtectionMiddleware;

export default csrfMiddleware;
