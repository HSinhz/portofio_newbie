// src/plugins/auth/auth.resolver.ts
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  Ctx,
  RequestContext,
  Allow,
  Permission,
  SessionService,
  TransactionalConnection,
  Customer,
  User,
} from "@vendure/core";
import { Response as ExpressResponse } from "express";
import { AuthService } from "./auth.service";
import { jwtService } from "../../services/jwt.service";

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private connection: TransactionalConnection,
  ) {}

  // ✅ Helper function: Parse cookies manually
  private parseCookies(
    cookieHeader: string | undefined,
  ): Record<string, string> {
    if (!cookieHeader) return {};

    return cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  @Mutation()
  @Allow(Permission.Public)
  async customLogin(
    @Ctx() ctx: RequestContext,
    @Args("email") email: string,
    @Args("password") password: string,
  ) {
    console.log("🔐 customLogin called:", { email });

    try {
      const user = await this.authService.authenticate(ctx, email, password);

      if (!user) {
        return {
          errorCode: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không đúng",
        };
      }

      await this.sessionService.createNewAuthenticatedSession(
        ctx,
        user,
        "native",
      );

      const token = jwtService.generateToken({
        userId: user.id.toString(),
        email: user.identifier,
        type: "customer",
      });

      if (ctx.req?.res) {
        const res = ctx.req.res as ExpressResponse;
        res.cookie("auth_token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });
        console.log("✅ JWT cookie set");
      }

      console.log("✅ Login successful");

      return {
        id: user.id,
        identifier: user.identifier,
        token,
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        errorCode: "UNKNOWN_ERROR",
        message: "Đã xảy ra lỗi khi đăng nhập",
      };
    }
  }

  @Query()
  @Allow(Permission.Public)
  async customMe(@Ctx() ctx: RequestContext) {
    console.log("👤 customMe called");

    // ✅ Parse cookies manually từ header
    const cookieHeader = ctx.req?.headers?.cookie;
    console.log("🍪 Raw cookie header:", cookieHeader);

    const cookies = this.parseCookies(cookieHeader);
    console.log("🔍 Parsed cookies:", Object.keys(cookies));

    const token = cookies["auth_token"];
    console.log("🍪 JWT token:", token ? "exists" : "missing");

    if (!token) {
      console.log("❌ No JWT token");
      return null;
    }

    // ✅ Verify JWT - sẽ trả về null nếu token expired
    const payload = jwtService.verifyToken(token);

    if (!payload) {
      console.log("❌ Invalid or expired JWT token");

      // ✅ XÓA cookie đã hết hạn
      if (ctx.req?.res) {
        const res = ctx.req.res as ExpressResponse;
        res.clearCookie("auth_token", {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
        });
        console.log("🗑️ Expired cookie cleared");
      }

      return null;
    }

    const userId = parseInt(payload.userId);
    console.log("✅ User ID from JWT:", userId);

    try {
      const user = await this.connection.getRepository(ctx, User).findOne({
        where: { id: userId },
      });

      if (!user) {
        console.log("❌ User not found");
        return null;
      }

      const customer = await this.connection
        .getRepository(ctx, Customer)
        .findOne({
          where: { user: { id: user.id } },
        });

      console.log("✅ User loaded:", user.identifier);

      return {
        id: user.id,
        identifier: user.identifier,
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        emailAddress: customer?.emailAddress || user.identifier,
      };
    } catch (error) {
      console.error("❌ customMe error:", error);
      return null;
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async customLogout(@Ctx() ctx: RequestContext) {
    if (ctx.req?.res) {
      const res = ctx.req.res as ExpressResponse;
      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      });
      console.log("✅ JWT cookie cleared");
    }

    return {
      success: true,
      message: "Đăng xuất thành công",
    };
  }

  @Mutation()
  @Allow(Permission.Public)
  async customRegister(@Ctx() ctx: RequestContext, @Args("input") input: any) {
    console.log("📝 customRegister called:", input.email);

    try {
      const result = await this.authService.register(ctx, input);

      if ("errorCode" in result) {
        return result;
      }

      return {
        id: result.id,
        identifier: result.identifier,
      };
    } catch (error) {
      console.error("❌ Register error:", error);
      return {
        errorCode: "UNKNOWN_ERROR",
        message: "Đã xảy ra lỗi khi đăng ký",
      };
    }
  }
}


// Test Push multiple file 