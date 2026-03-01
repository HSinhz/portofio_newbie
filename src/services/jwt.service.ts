// src/services/jwt.service.ts
import jwt from "jsonwebtoken";

export interface CustomJWTPayload {
  userId: string;
  email: string;
  type: "customer" | "admin";
}

export class JWTService {
  private secret: string;
  private expiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || "your-secret-key-change-this";
    this.expiresIn = "30m";
    // this.expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    // ✅ Log để kiểm tra
    // console.log("🔐 JWT Config:");
    // console.log("  - Secret:", this.secret ? "✅ Set" : "❌ Missing");
    // console.log("  - ExpiresIn:", this.expiresIn);
  }

  /**
   * ✅ Generate JWT Token
   */
  generateToken(payload: CustomJWTPayload): string {
    // ✅ Fix: Cast to proper type
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as any, // Cast to any để bypass TypeScript
      algorithm: "HS256",
    });
  }

  /**
   * ✅ Verify JWT Token
   */
  verifyToken(token: string): CustomJWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
      });
      return decoded as CustomJWTPayload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // console.error("❌ JWT verification failed:", errorMessage);
      return null;
    }
  }

  /**
   * ✅ Decode JWT without verification (for debugging)
   */
  decodeToken(token: string): CustomJWTPayload | null {
    try {
      const decoded = jwt.decode(token);
      return decoded as CustomJWTPayload;
    } catch (error) {
      return null;
    }
  }
}

export const jwtService = new JWTService();
