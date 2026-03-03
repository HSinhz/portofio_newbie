// src/api/resolvers/auth.resolver.ts
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  Ctx,
  RequestContext,
  CustomerService,
  TransactionalConnection,
  PasswordCipher,
  User,
  Customer,
  NativeAuthenticationMethod,
} from "@vendure/core";
import { jwtService } from "../../services/jwt.service";
import { Request, Response } from "express";

// ✅ Helper để get req/res
function getRequestResponse(ctx: RequestContext): {
  req: Request | undefined;
  res: Response | undefined;
} {
  const ctxAny = ctx as any;
  return {
    req: ctxAny.req || ctxAny.rawRequest,
    res: ctxAny.res || ctxAny.rawResponse,
  };
}

@Resolver()
export class CustomAuthResolver {
  constructor(
    private customerService: CustomerService,
    private connection: TransactionalConnection,
    private passwordCipher: PasswordCipher,
  ) {}

  /**
   * ✅ Custom Login Mutation
   */
  @Mutation()
  async customLogin(
    @Ctx() ctx: RequestContext,
    @Args() args: { email: string; password: string },
  ) {
    console.log("🔐 Custom login attempt:", args.email);
    console.log("🔐 gọi ở đây nè", args.email);

    try {
      // 1. ✅ Find user with authentication method
      const user = await this.connection
        .getRepository(ctx, User)
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.authenticationMethods", "authMethod")
        .where("user.identifier = :email", { email: args.email })
        .andWhere("user.deletedAt IS NULL")
        .getOne();

      if (!user) {
        console.log("❌ User not found");
        return {
          __typename: "LoginError",
          errorCode: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không đúng",
        };
      }

      console.log("✅ User found:", user.id);

      // 2. ✅ Get native auth method (contains password hash)
      const nativeAuthMethod = user.authenticationMethods.find(
        (m) => m instanceof NativeAuthenticationMethod,
      ) as NativeAuthenticationMethod | undefined;

      if (!nativeAuthMethod) {
        console.log("❌ No native auth method found");
        return {
          __typename: "LoginError",
          errorCode: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không đúng",
        };
      }

      // 3. ✅ Verify password using passwordHash from auth method
      const isValidPassword = await this.passwordCipher.check(
        args.password,
        nativeAuthMethod.passwordHash,
      );

      if (!isValidPassword) {
        console.log("❌ Invalid password");
        return {
          __typename: "LoginError",
          errorCode: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không đúng",
        };
      }

      console.log("✅ Password verified");

      // 4. ✅ Get customer
      const customer = await this.connection
        .getRepository(ctx, Customer)
        .createQueryBuilder("customer")
        .where("customer.userId = :userId", { userId: user.id })
        .getOne();

      if (!customer) {
        console.log("❌ Customer not found");
        return {
          __typename: "LoginError",
          errorCode: "INVALID_CREDENTIALS",
          message: "Customer not found",
        };
      }

      console.log("✅ Customer found:", customer.id);

      // 5. ✅ GENERATE JWT TOKEN
      const token = jwtService.generateToken({
        userId: customer.id.toString(),
        email: user.identifier,
        type: "customer",
      });

      console.log("🎟️ JWT Token generated:", token.substring(0, 20) + "...");

      // 6. ✅ SET COOKIE
      const { res } = getRequestResponse(ctx);

      if (res) {
        res.cookie("vendure-auth-token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        console.log("🍪 Cookie set successfully");
      } else {
        console.warn("⚠️ Response object not available");
      }

      return {
        __typename: "CurrentUser",
        id: customer.id.toString(),
        identifier: user.identifier,
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        __typename: "LoginError",
        errorCode: "INTERNAL_ERROR",
        message: "Đã xảy ra lỗi, vui lòng thử lại",
      };
    }
  }

  /**
   * ✅ Get Current User
   */
  @Query()
  async customMe(@Ctx() ctx: RequestContext) {
    const { req } = getRequestResponse(ctx);

    if (!req || !req.cookies) {
      console.log("❌ Request not available");
      return null;
    }

    const token = req.cookies["vendure-auth-token"];

    if (!token) {
      console.log("❌ No token found");
      return null;
    }

    const payload = jwtService.verifyToken(token);

    if (!payload) {
      console.log("❌ Invalid token");
      return null;
    }

    console.log("✅ Token verified:", payload);

    const customer = await this.connection
      .getRepository(ctx, Customer)
      .createQueryBuilder("customer")
      .where("customer.id = :id", { id: payload.userId })
      .getOne();

    if (!customer) {
      return null;
    }

    return {
      id: customer.id.toString(),
      firstName: customer.firstName,
      lastName: customer.lastName,
      emailAddress: customer.emailAddress,
    };
  }

  /**
   * ✅ Logout
   */
  @Mutation()
  async customLogout(@Ctx() ctx: RequestContext) {
    const { res } = getRequestResponse(ctx);

    if (res) {
      res.clearCookie("vendure-auth-token", {
        path: "/",
      });

      console.log("🔓 User logged out");
    }

    return {
      success: true,
    };
  }
}
