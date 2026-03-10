// src/plugins/payment/paytment.service.ts
import { Injectable } from "@nestjs/common";
import {
  RequestContext,
  OrderService,
  EntityHydrator,
  Order,
  Customer,
  ShippingLine,
  ShippingMethod,
  PaymentMethod,
  ID,
  isGraphQlErrorResult,
  TransactionalConnection,
} from "@vendure/core";
import { jwtService } from "../../services/jwt.service";

// =============================================
// INTERFACES
// =============================================

export interface PlaceOrderInput {
  fullName: string;
  phoneNumber: string;
  streetLine1: string;
  city: string;
  paymentMethod: string; // "cod" | "momo" | "card" | "bank"
}

export interface PlaceOrderResult {
  success: boolean;
  orderId?: string;
  orderCode?: string;
  orderState?: string;
  message: string;
}

// Interface cho shipping address input (tự định nghĩa, không dùng type của Vendure)
interface ShippingAddressInput {
  fullName: string;
  streetLine1: string;
  city: string;
  phoneNumber: string;
  countryCode: string;
}

// =============================================
// SERVICE
// =============================================

@Injectable()
export class PaymentService {
  constructor(
    private orderService: OrderService,
    private entityHydrator: EntityHydrator,
    private connection: TransactionalConnection,
  ) {}

  // ─────────────────────────────────────────────
  // Private: Lấy userId từ JWT (giống CartService)
  // ─────────────────────────────────────────────
  private getUserIdFromRequest(ctx: RequestContext): ID | null {
    // Thử Authorization Bearer header trước
    const authHeader = ctx.req?.headers?.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyToken(token);
      if (payload?.userId) return payload.userId;
    }

    // Fallback: đọc từ cookie auth_token
    const cookieHeader = ctx.req?.headers?.cookie;
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
        const payload = jwtService.verifyToken(token);
        if (payload?.userId) return payload.userId;
      }
    }

    return null;
  }

  // ─────────────────────────────────────────────
  // Custom: Lấy Order active của user từ DB
  // Thay thế orderService.getActiveOrderForUser()
  // vì CartService tạo order trực tiếp vào DB,
  // không qua Vendure session nên hàm built-in
  // không tìm thấy.
  // ─────────────────────────────────────────────
  private async customGetActiveOrder(
    ctx: RequestContext,
    userId: ID,
  ): Promise<Order | null> {
    // Bước 1: Tìm Customer theo userId
    const customerRepo = this.connection.getRepository(ctx, Customer);
    const customer = await customerRepo.findOne({
      where: { user: { id: userId as any } },
    });
    if (!customer) return null;

    // Bước 2: Tìm Order active (state = AddingItems, active = true)
    const orderRepo = this.connection.getRepository(ctx, Order);
    const order = await orderRepo.findOne({
      where: {
        customerId: customer.id as any,
        active: true,
        state: "AddingItems" as any,
      },
    });

    return order ?? null;
  }

  // ─────────────────────────────────────────────
  // Custom: Set địa chỉ giao hàng trực tiếp vào DB
  // Không dùng OrderService.setShippingAddress()
  // ─────────────────────────────────────────────
  private async customSetShippingAddress(
    ctx: RequestContext,
    orderId: ID,
    address: ShippingAddressInput,
  ): Promise<void> {
    const orderRepo = this.connection.getRepository(ctx, Order);
    await orderRepo.update(orderId as number, {
      shippingAddress: address,
    });
  }

  // ─────────────────────────────────────────────
  // Custom: Set shipping method trực tiếp vào DB
  // Không dùng OrderService.setShippingMethod()
  // ─────────────────────────────────────────────
  private async customSetShippingMethod(
    ctx: RequestContext,
    order: Order,
    shippingMethodId: ID,
  ): Promise<void> {
    // Lấy ShippingMethod từ DB
    const shippingMethodRepo = this.connection.getRepository(
      ctx,
      ShippingMethod,
    );
    const method = await shippingMethodRepo.findOne({
      where: { id: shippingMethodId as number },
    });
    if (!method) {
      throw new Error(`Không tìm thấy shipping method: ${shippingMethodId}`);
    }

    // Kiểm tra xem order đã có ShippingLine chưa
    const shippingLineRepo = this.connection.getRepository(ctx, ShippingLine);
    const existing = await shippingLineRepo.findOne({
      where: { order: { id: order.id as number } },
    });

    if (existing) {
      // Cập nhật shipping line hiện có
      await shippingLineRepo.update(existing.id as number, {
        shippingMethodId: method.id as number,
        listPrice: 0,
        listPriceIncludesTax: false,
        adjustments: [],
        taxLines: [],
      });
    } else {
      // Tạo mới ShippingLine và gắn vào order
      const newLine = shippingLineRepo.create({
        shippingMethod: method,
        shippingMethodId: method.id,
        order,
        listPrice: 0,
        listPriceIncludesTax: false,
        adjustments: [],
        taxLines: [],
      });
      await shippingLineRepo.save(newLine);
    }
  }

  // ─────────────────────────────────────────────
  // Private: Lấy code của PaymentMethod đầu tiên
  // đang enabled từ DB
  //
  // addPaymentToOrder() cần PaymentMethod.code (bản
  // ghi trong DB), không phải tên handler trong config.
  // PaymentInitService sẽ tạo bản ghi này khi bootstrap.
  // ─────────────────────────────────────────────
  private async getPaymentMethodCode(
    ctx: RequestContext,
  ): Promise<string | null> {
    const pmRepo = this.connection.getRepository(ctx, PaymentMethod);
    const method = await pmRepo.findOne({ where: { enabled: true } });
    return method?.code ?? null;
  }

  // ─────────────────────────────────────────────
  // Public: Thực hiện toàn bộ checkout flow
  // ─────────────────────────────────────────────
  async placeOrder(
    ctx: RequestContext,
    input: PlaceOrderInput,
  ): Promise<PlaceOrderResult> {
    console.log("🛒 [PaymentService] placeOrder called", { input });

    // ── Bước 0: Xác thực user ──────────────────
    // Ưu tiên JWT custom (auth_token) trước ctx.activeUserId tránh admin session bleeding
    const userId = this.getUserIdFromRequest(ctx) || ctx.activeUserId;
    if (!userId) {
      console.warn("❌ [PaymentService] User not authenticated");
      return { success: false, message: "Bạn cần đăng nhập để đặt hàng" };
    }

    // ── Bước 1: Lấy đơn hàng đang active ────────
    const order = await this.customGetActiveOrder(ctx, userId);

    if (!order) {
      return {
        success: false,
        message: "Không có đơn hàng nào đang chờ xử lý",
      };
    }
    console.log(
      `✅ [PaymentService] Active order: ${order.code} (state: ${order.state})`,
    );

    // ── Bước 2: Set địa chỉ giao hàng (custom) ──
    console.log("📦 [PaymentService] Setting shipping address (custom)...");
    try {
      await this.customSetShippingAddress(ctx, order.id, {
        fullName: input.fullName,
        streetLine1: input.streetLine1,
        city: input.city,
        phoneNumber: input.phoneNumber,
        countryCode: "VN",
      });
      console.log("✅ [PaymentService] Shipping address set");
    } catch (e: any) {
      console.error(
        "❌ [PaymentService] customSetShippingAddress failed:",
        e.message,
      );
      return { success: false, message: `Lỗi địa chỉ giao hàng: ${e.message}` };
    }

    // ── Bước 3: Set phương thức vận chuyển (custom) ─
    console.log("🚚 [PaymentService] Checking eligible shipping methods...");
    const eligibleMethods = await this.orderService.getEligibleShippingMethods(
      ctx,
      order.id,
    );

    if (eligibleMethods.length > 0) {
      const selected = eligibleMethods[0];
      console.log(
        `✅ [PaymentService] ${eligibleMethods.length} method(s) found, selecting: ${selected.name}`,
      );
      try {
        await this.customSetShippingMethod(ctx, order, selected.id);
        console.log("✅ [PaymentService] Shipping method set");
      } catch (e: any) {
        console.error(
          "❌ [PaymentService] customSetShippingMethod failed:",
          e.message,
        );
        return {
          success: false,
          message: `Lỗi phương thức vận chuyển: ${e.message}`,
        };
      }
    } else {
      console.warn(
        "⚠️ [PaymentService] No eligible shipping methods — configure shipping in Admin UI",
      );
    }

    // ── Bước 4: Transition sang "ArrangingPayment" ──
    console.log(
      `🔄 [PaymentService] Transitioning order to ArrangingPayment...`,
    );
    const transitionResult = await this.orderService.transitionToState(
      ctx,
      order.id,
      "ArrangingPayment",
    );

    if (isGraphQlErrorResult(transitionResult)) {
      console.error(
        "❌ [PaymentService] transitionToState failed:",
        transitionResult.message,
      );
      return {
        success: false,
        message: `Không thể chuyển trạng thái đơn hàng: ${(transitionResult as any).message}`,
      };
    }
    console.log(`✅ [PaymentService] Order state: ${transitionResult.state}`);

    // ── Bước 5: Thêm payment vào đơn hàng ──────────
    // Lấy code của PaymentMethod từ DB (được tạo bởi PaymentInitService)
    const paymentMethodCode = await this.getPaymentMethodCode(ctx);
    if (!paymentMethodCode) {
      return {
        success: false,
        message:
          "Chưa có phương thức thanh toán nào được cấu hình. Server cần khởi động lại để tự tạo.",
      };
    }
    console.log(
      `💳 [PaymentService] Adding payment (code: ${paymentMethodCode}, method: ${input.paymentMethod})...`,
    );
    try {
      const paymentResult = await this.orderService.addPaymentToOrder(
        ctx,
        order.id,
        {
          method: paymentMethodCode,
          metadata: {
            selectedPaymentMethod: input.paymentMethod,
            phoneNumber: input.phoneNumber,
          },
        },
      );

      if (isGraphQlErrorResult(paymentResult)) {
        console.error(
          "❌ [PaymentService] addPaymentToOrder failed:",
          paymentResult.message,
        );
        return {
          success: false,
          message: `Lỗi thanh toán: ${paymentResult.message}`,
        };
      }

      const finalOrder = paymentResult as Order;
      console.log(
        `🎉 [PaymentService] Order placed! Code: ${finalOrder.code}, State: ${finalOrder.state}`,
      );

      return {
        success: true,
        orderId: String(finalOrder.id),
        orderCode: finalOrder.code,
        orderState: finalOrder.state,
        message: `Đặt hàng thành công! Mã đơn hàng: ${finalOrder.code}`,
      };
    } catch (e: any) {
      console.error("❌ [PaymentService] addPaymentToOrder failed:", e.message);
      return {
        success: false,
        message: `Lỗi ở server: ${e.message}`,
      };
    }
  }
}
