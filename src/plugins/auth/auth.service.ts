// src/plugins/auth/auth.service.ts
import { Injectable } from "@nestjs/common";
import {
  RequestContext,
  TransactionalConnection,
  User,
  NativeAuthenticationMethod,
  Customer,
  Role,
} from "@vendure/core";
import { IsNull } from "typeorm";
import * as bcrypt from "bcrypt";

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class AuthService {
  constructor(private connection: TransactionalConnection) {}
  async authenticate(
    ctx: RequestContext,
    email: string,
    password: string,
  ): Promise<User | null> {
    // console.log("🔍 Authenticating user:", email);

    if (!email || !password) {
      // console.log("❌ Email or password is empty");
      return null;
    }

    try {
      // ✅ 1. Tìm user
      const user = await this.connection.getRepository(ctx, User).findOne({
        where: {
          identifier: email,
          deletedAt: IsNull(),
        },
        relations: ["roles", "roles.channels"],
      });

      if (!user) {
        // console.log("❌ User not found with email:", email);
        return null;
      }

      // console.log("✅ User found:", user.id);

      // ✅ 2. Query NativeAuthenticationMethod với SELECT passwordHash
      const nativeAuthMethod = await this.connection
        .getRepository(ctx, NativeAuthenticationMethod)
        .createQueryBuilder("auth")
        .addSelect("auth.passwordHash") // ← QUAN TRỌNG: Explicitly select passwordHash
        .where("auth.userId = :userId", { userId: user.id })
        .getOne();

      // console.log("🔑 Auth method found:", nativeAuthMethod ? "Yes" : "No");

      if (!nativeAuthMethod) {
        console.log("❌ No native auth method found for user");
        return null;
      }

      console.log("🔐 Has password hash:", !!nativeAuthMethod.passwordHash);

      if (nativeAuthMethod.passwordHash) {
        // console.log(
        //   "🔐 Password hash preview:",
        //   nativeAuthMethod.passwordHash.substring(0, 10) + "...",
        // );
      }

      if (!nativeAuthMethod.passwordHash) {
        console.log("❌ Password hash is missing");
        return null;
      }

      // ✅ 3. Verify password
      // console.log("🔐 Verifying password...");
      const isValid = await bcrypt.compare(
        password,
        nativeAuthMethod.passwordHash,
      );

      // console.log("🔐 Password valid:", isValid);

      if (!isValid) {
        console.log("❌ Invalid password");
        return null;
      }

      // console.log("✅ Login successful");
      return user;
    } catch (error) {
      console.error("❌ Authentication error:", error);
      return null;
    }
  }
  async register(
    ctx: RequestContext,
    input: RegisterInput,
  ): Promise<User | { errorCode: string; message: string }> {
    // console.log("📝 Registering new user:", input.email);

    // ✅ Validate inputs
    if (!input.email || !input.password) {
      return {
        errorCode: "INVALID_INPUT",
        message: "Email và mật khẩu không được để trống",
      };
    }

    if (input.password.length < 6) {
      return {
        errorCode: "PASSWORD_TOO_SHORT",
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      };
    }

    try {
      // ✅ 1. Check if user already exists
      const existingUser = await this.connection
        .getRepository(ctx, User)
        .findOne({
          where: {
            identifier: input.email,
            deletedAt: IsNull(),
          },
        });

      if (existingUser) {
        console.log("❌ User already exists:", input.email);
        return {
          errorCode: "EMAIL_ALREADY_EXISTS",
          message: "Email này đã được đăng ký",
        };
      }

      // ✅ 2. Hash password
      // console.log("🔐 Hashing password...");
      const passwordHash = await bcrypt.hash(input.password, 10);
      // console.log("✅ Password hashed:", passwordHash.substring(0, 10) + "...");

      // ✅ 3. Create User
      const user = new User({
        identifier: input.email,
        verified: false,
        deletedAt: null,
      });

      const savedUser = await this.connection
        .getRepository(ctx, User)
        .save(user);
      // console.log("✅ User created with ID:", savedUser.id);

      // ✅ 4. Create NativeAuthenticationMethod
      const authMethod = new NativeAuthenticationMethod({
        identifier: input.email,
        passwordHash,
      });
      authMethod.user = savedUser;

      const savedAuthMethod = await this.connection
        .getRepository(ctx, NativeAuthenticationMethod)
        .save(authMethod);

      // console.log("✅ Auth method created:", savedAuthMethod.id);

      // ✅ 5. Create Customer
      const customer = new Customer({
        emailAddress: input.email,
        firstName: input.firstName || "",
        lastName: input.lastName || "",
      });
      customer.user = savedUser;

      await this.connection.getRepository(ctx, Customer).save(customer);
      // console.log("✅ Customer created");

      // ✅ 6. Assign customer role
      const customerRole = await this.connection
        .getRepository(ctx, Role)
        .findOne({
          where: { code: "customer" },
        });

      if (customerRole) {
        savedUser.roles = [customerRole];
        await this.connection.getRepository(ctx, User).save(savedUser);
        // console.log("✅ Customer role assigned");
      } else {
        console.warn("⚠️ Customer role not found");
      }

      // console.log("✅ User registered successfully:", savedUser.identifier);

      // ✅ 7. Load full user with relations
      const fullUser = await this.connection.getRepository(ctx, User).findOne({
        where: { id: savedUser.id },
        relations: {
          roles: {
            channels: true,
          },
          authenticationMethods: true,
        },
      });

      return fullUser!;
    } catch (error) {
      console.error("❌ Registration error:", error);
      return {
        errorCode: "UNKNOWN_ERROR",
        message: "Đã xảy ra lỗi khi đăng ký",
      };
    }
  }
}

// Test Push multiple file
