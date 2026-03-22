// src/plugins/cart-plugin/cart.service.ts
import { Injectable } from "@nestjs/common";
import {
  RequestContext,
  Order,
  OrderLine,
  ProductVariant,
  ProductVariantPrice,
  Customer,
  Channel,
  ID,
  TransactionalConnection,
} from "@vendure/core";
import { OrderType } from "@vendure/common/lib/generated-types";
import { randomUUID } from "crypto";
import { jwtService } from "../../services/jwt.service";

// =============================================
// SERVICE
// =============================================

@Injectable()
export class CartService {
  constructor(private connection: TransactionalConnection) {}

  // ─────────────────────────────────────────────
  // Private: Lấy userId từ JWT trong header hoặc cookie
  // ─────────────────────────────────────────────
  private getUserIdFromRequest(ctx: RequestContext): ID | null {
    // Ưu tiên Authorization Bearer header
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
  // Private: Tìm Customer theo userId
  //
  // Vendure tách biệt User (tài khoản đăng nhập)
  // và Customer (thông tin khách hàng). Mỗi User
  // registered sẽ có 1 Customer tương ứng.
  // ─────────────────────────────────────────────
  private async getCustomerByUserId(
    ctx: RequestContext,
    userId: ID,
  ): Promise<Customer> {
    const customerRepo = this.connection.getRepository(ctx, Customer);

    // userId từ JWT là string ("42"), DB lưu numeric bigint → phải parseInt
    const numericId = parseInt(String(userId), 10);
    if (isNaN(numericId)) {
      throw new Error(`userId không hợp lệ: ${userId}`);
    }

    // console.log(`🔍 [CartService] userId raw="${userId}" → numeric=${numericId}`);

    console.log(`🔍 find userId=${numericId}...`);
    const customer = await customerRepo.findOne({
      where: { user: { id: numericId as any } },
    });

    console.log("customer = ", customer);
    if (!customer) {
      // console.log(`❌ [CartService] No customer for userId=${numericId}`);
      throw new Error("Không tìm thấy thông tin khách hàng cho tài khoản này");
    }

    // console.log(
    //   // `✅ [CartService] Found customer id=${customer.id} (${customer.emailAddress})`,
    // );
    return customer;
  }

  // ─────────────────────────────────────────────
  // Private: Lấy Order active hoặc tạo mới
  //
  // Giỏ hàng trong Vendure = 1 Order với:
  //   - state = "AddingItems"
  //   - active = true
  //
  // Mỗi user chỉ có 1 giỏ hàng active tại 1 thời điểm.
  // ─────────────────────────────────────────────
  private async getOrCreateActiveOrder(ctx: RequestContext): Promise<Order> {
    // Ưu tiên JWT custom (auth_token cookie) trước ctx.activeUserId
    // Lý do: khi chạy local, cookie session admin (localhost:3000) bị browser gửi kèm
    // vào request của frontend (localhost:5173 → proxy → localhost:3000),
    // khiến ctx.activeUserId = superadmin ID thay vì customer ID.
    const userId = this.getUserIdFromRequest(ctx) || ctx.activeUserId;
    if (!userId) {
      throw new Error("Bạn cần đăng nhập để sử dụng giỏ hàng");
    }

    const customer = await this.getCustomerByUserId(ctx, userId);
    const orderRepo = this.connection.getRepository(ctx, Order);

    // ── Bước A: Tìm giỏ hàng đang mở ──────────
    // active = true nghĩa là chưa checkout xong
    // state = "AddingItems" nghĩa là đang ở giai đoạn thêm hàng
    const existingOrder = await orderRepo.findOne({
      where: {
        customerId: customer.id as any,
        active: true,
        state: "AddingItems" as any,
      },
    });

    if (existingOrder) {
      console.log(
        `🛒 [CartService] Found existing order: ${existingOrder.code}`,
      );
      return existingOrder;
    }

    // ── Bước B: Tạo giỏ hàng mới ───────────────
    // Cần gắn vào Channel hiện tại (Vendure hỗ trợ multi-channel)
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: ctx.channelId as any },
    });
    if (!channel) {
      throw new Error("Không tìm thấy Channel");
    }

    // shippingAddress / billingAddress là cột NOT NULL trong DB
    // → phải truyền object rỗng khi tạo mới (sẽ được điền khi checkout)
    const emptyAddress = {
      fullName: "",
      company: "",
      streetLine1: "",
      streetLine2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
      countryCode: "",
      phoneNumber: "",
    };

    const newOrder = orderRepo.create({
      // code: mã đơn hàng unique, dùng randomUUID cho đơn giản
      code: randomUUID(),

      // type: Regular = đơn hàng bình thường (không phải multi-vendor)
      type: OrderType.Regular,

      // state + active: trạng thái "giỏ hàng đang dùng"
      state: "AddingItems" as any,
      active: true,

      // Gắn với customer
      customer,
      customerId: customer.id,

      // Địa chỉ rỗng (bắt buộc NOT NULL, sẽ được điền ở bước checkout)
      shippingAddress: emptyAddress,
      billingAddress: emptyAddress,

      // Khởi tạo các mảng rỗng
      lines: [],
      surcharges: [],
      couponCodes: [],
      shippingLines: [],

      // Tổng tiền ban đầu = 0
      subTotal: 0,
      subTotalWithTax: 0,
      shipping: 0,
      shippingWithTax: 0,

      // Đơn vị tiền tệ theo channel
      currencyCode: ctx.currencyCode,

      // Gắn với channel (Vendure dùng ManyToMany)
      channels: [channel],
    });

    const savedOrder = await orderRepo.save(newOrder);
    console.log(`✅ [CartService] Created new order: ${savedOrder.code}`);
    return savedOrder;
  }

  // ─────────────────────────────────────────────
  // Public: Lấy giỏ hàng active (không tạo mới)
  // ─────────────────────────────────────────────
  async getActiveOrderForUser(ctx: RequestContext): Promise<Order | null> {
    const userId = this.getUserIdFromRequest(ctx) || ctx.activeUserId;
    if (!userId) return null;

    let customer: Customer;
    try {
      customer = await this.getCustomerByUserId(ctx, userId);
    } catch {
      return null;
    }

    const orderRepo = this.connection.getRepository(ctx, Order);
    const order = await orderRepo.findOne({
      where: {
        customerId: customer.id as any,
        active: true,
        state: "AddingItems" as any,
      },
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.featuredAsset",
        "lines.productVariant.product",
        "lines.productVariant.product.featuredAsset",
        "lines.featuredAsset",
      ],
    });

    return order ?? null;
  }

  // ─────────────────────────────────────────────
  // Public: Thêm sản phẩm vào giỏ hàng
  //
  // Flow:
  //   1. Lấy / tạo giỏ hàng (Order) cho user
  //   2. Tìm ProductVariant và lấy giá theo channel
  //   3. Nếu sản phẩm đã có trong giỏ → tăng quantity
  //   4. Nếu chưa có → tạo OrderLine mới
  //   5. Tính lại tổng tiền của Order (subTotal)
  //   6. Trả về Order đã load đầy đủ relations
  // ─────────────────────────────────────────────
  async addItemToOrder(
    ctx: RequestContext,
    productVariantId: ID,
    quantity: number,
  ): Promise<Order> {
    if (quantity < 1) {
      throw new Error("Số lượng phải ít nhất là 1");
    }

    // ── Bước 1: Lấy / tạo giỏ hàng ────────────
    const order = await this.getOrCreateActiveOrder(ctx);

    // ── Bước 2: Tìm ProductVariant + giá ───────
    // ProductVariantPrice: giá riêng theo từng channel
    // productVariantPrices là mảng giá, mỗi channel có 1 giá
    const variantRepo = this.connection.getRepository(ctx, ProductVariant);
    const variant = await variantRepo.findOne({
      where: { id: productVariantId as any },
      relations: ["taxCategory", "productVariantPrices"],
    });

    if (!variant) {
      throw new Error(`Không tìm thấy sản phẩm với id: ${productVariantId}`);
    }
    if (!variant.enabled) {
      throw new Error("Sản phẩm này hiện không còn bán");
    }

    // Lọc giá đúng với channel đang dùng
    const priceForChannel = variant.productVariantPrices.find(
      (p: ProductVariantPrice) => String(p.channelId) === String(ctx.channelId),
    );
    // Nếu không có giá theo channel → dùng 0 (tránh crash, nên cấu hình trong Admin UI)
    const unitPrice = priceForChannel?.price ?? 0;

    console.log(
      `📦 [CartService] Variant: ${variant.sku}, Price: ${unitPrice}, Channel: ${ctx.channelId}`,
    );

    // ── Bước 3 & 4: Kiểm tra / tạo OrderLine ───
    // OrderLine = 1 dòng trong giỏ hàng
    // Mỗi OrderLine đại diện cho 1 ProductVariant + quantity
    const orderLineRepo = this.connection.getRepository(ctx, OrderLine);

    const existingLine = await orderLineRepo.findOne({
      where: {
        order: { id: order.id as any },
        productVariantId: productVariantId as any,
      },
    });

    if (existingLine) {
      // Sản phẩm đã có trong giỏ → cộng thêm số lượng
      const newQuantity = existingLine.quantity + quantity;
      await orderLineRepo.update(existingLine.id as any, {
        quantity: newQuantity,
      });
      console.log(
        `🔄 [CartService] Updated line quantity: ${existingLine.quantity} → ${newQuantity}`,
      );
    } else {
      // Sản phẩm chưa có → tạo OrderLine mới
      const newLine = orderLineRepo.create({
        // Gắn với order và variant
        order,
        productVariant: variant,
        productVariantId: variant.id,

        // Tax category lấy từ variant (dùng khi tính thuế)
        taxCategory: variant.taxCategory,
        taxCategoryId: variant.taxCategoryId,

        // Số lượng
        quantity,
        orderPlacedQuantity: 0, // sẽ được set khi order được placed

        // Giá: initialListPrice = giá lúc thêm vào giỏ (không đổi sau này)
        //       listPrice = giá hiện tại (có thể thay đổi nếu admin sửa giá)
        initialListPrice: unitPrice,
        listPrice: unitPrice,
        listPriceIncludesTax: false, // false = giá chưa bao gồm thuế

        // Chưa có discount hay thuế nào
        adjustments: [],
        taxLines: [],
      });

      await orderLineRepo.save(newLine);
      console.log(
        `➕ [CartService] Created new order line for variant: ${variant.sku}`,
      );
    }

    // ── Bước 5: Tính lại subTotal của Order ────
    // subTotal = tổng (listPrice × quantity) của tất cả lines
    const allLines = await orderLineRepo.find({
      where: { order: { id: order.id as any } },
    });
    const subTotal = allLines.reduce(
      (sum, line) => sum + line.listPrice * line.quantity,
      0,
    );

    const orderRepo = this.connection.getRepository(ctx, Order);
    await orderRepo.update(order.id as any, {
      subTotal,
      subTotalWithTax: subTotal, // dev: chưa tính thuế nên bằng nhau
    });

    // ── Bước 6: Load lại Order với đầy đủ quan hệ ──
    // Để trả về đủ data cho client (tên, ảnh, giá,...)
    const finalOrder = await orderRepo.findOne({
      where: { id: order.id as any },
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.product",
        "lines.productVariant.product.featuredAsset",
        "lines.featuredAsset",
      ],
    });

    if (!finalOrder) {
      throw new Error("Không thể load lại order sau khi cập nhật");
    }

    console.log(
      `✅ [CartService] Order ${finalOrder.code}: ${finalOrder.lines.length} line(s), subTotal: ${finalOrder.subTotal}`,
    );

    return finalOrder;
  }

  // ─────────────────────────────────────────────
  // Public: Cập nhật số lượng của OrderLine theo orderId
  //
  // Flow:
  //   1. Xác nhận orderId thuộc về user hiện tại
  //   2. Tìm OrderLine theo productVariantId trong order
  //   3. Cập nhật quantity
  //   4. Recalculate subTotal
  //   5. Load Order với relations
  // ─────────────────────────────────────────────
  async adjustOrderLineQuantity(
    ctx: RequestContext,
    orderId: ID,
    orderLineId: ID,
    quantity: number,
  ): Promise<Order> {
    console.log(
      "vào rồi, orderId:",
      orderId,
      "orderLineId:",
      orderLineId,
      "quantity:",
      quantity,
    );

    if (quantity < 1) {
      throw new Error("Số lượng phải ít nhất là 1");
    }

    // ── Bước 1: Xác nhận orderId thuộc về user ──
    const userId = this.getUserIdFromRequest(ctx) || ctx.activeUserId;
    if (!userId) {
      throw new Error("Bạn cần đăng nhập");
    }

    const customer = await this.getCustomerByUserId(ctx, userId);
    const orderRepo = this.connection.getRepository(ctx, Order);

    const order = await orderRepo.findOne({
      where: {
        id: orderId as any,
        customerId: customer.id as any,
        active: true,
        state: "AddingItems" as any,
      },
      relations: ["lines"],
    });

    if (!order) {
      throw new Error(
        "Không tìm thấy giỏ hàng hoặc bạn không có quyền truy cập",
      );
    }

    // ── Bước 2: Tìm OrderLine theo orderLineId ──
    const orderLineRepo = this.connection.getRepository(ctx, OrderLine);
    const orderLine = await orderLineRepo.findOne({
      where: {
        id: orderLineId as any,
        order: { id: order.id as any },
      },
    });

    if (!orderLine) {
      throw new Error("Sản phẩm này không có trong giỏ hàng của bạn");
    }

    // ── Bước 3: Cập nhật quantity ──
    await orderLineRepo.update(orderLine.id as any, { quantity });
    console.log(
      `🔄 [CartService] Updated line ${orderLineId} quantity to: ${quantity}`,
    );

    // ── Bước 4: Recalculate subTotal ──
    const allLines = await orderLineRepo.find({
      where: { order: { id: order.id as any } },
    });
    const subTotal = allLines.reduce((sum, line) => {
      const lineQuantity = line.id === orderLine.id ? quantity : line.quantity;
      return sum + line.listPrice * lineQuantity;
    }, 0);

    await orderRepo.update(order.id as any, {
      subTotal,
      subTotalWithTax: subTotal,
    });

    // ── Bước 5: Load Order với relations ──
    const finalOrder = await orderRepo.findOne({
      where: { id: order.id as any },
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.product",
        "lines.productVariant.product.featuredAsset",
        "lines.featuredAsset",
      ],
    });

    if (!finalOrder) {
      throw new Error("Không thể load lại order sau khi cập nhật");
    }

    console.log(
      `✅ [CartService] Order ${finalOrder.code} updated: subTotal: ${finalOrder.subTotal}`,
    );

    return finalOrder;
  }

  async customDeleteOrderLine(
    ctx: RequestContext,
    orderId: ID,
    orderLineId: ID,
  ): Promise<Order> {
    // ── Bước 1: Xác nhận orderId thuộc về user ──
    const userId = this.getUserIdFromRequest(ctx) || ctx.activeUserId;
    if (!userId) {
      throw new Error("Bạn cần đăng nhập");
    }

    const customer = await this.getCustomerByUserId(ctx, userId);
    const orderRepo = this.connection.getRepository(ctx, Order);

    const order = await orderRepo.findOne({
      where: {
        id: orderId as any,
        customerId: customer.id as any,
        active: true,
        state: "AddingItems" as any,
      },
      relations: ["lines"],
    });

    if (!order) {
      throw new Error(
        "Không tìm thấy giỏ hàng hoặc bạn không có quyền truy cập",
      );
    }

    // ── Bước 2: Tìm OrderLine theo orderLineId ──
    const orderLineRepo = this.connection.getRepository(ctx, OrderLine);
    const orderLine = await orderLineRepo.findOne({
      where: {
        id: orderLineId as any,
        order: { id: order.id as any },
      },
    });

    if (!orderLine) {
      throw new Error("Sản phẩm này không có trong giỏ hàng của bạn");
    }

    // ── Bước 3: Xóa OrderLine ──
    console.log("🔍 [CartService] Deleting order line: ", orderLine.id);
    await orderLineRepo.delete(orderLine.id as any);

    // ── Bước 4: Recalculate subTotal (bỏ qua line vừa xóa) ──
    const remainingLines = await orderLineRepo.find({
      where: { order: { id: order.id as any } },
    });
    const subTotal = remainingLines.reduce(
      (sum, line) => sum + line.listPrice * line.quantity,
      0,
    );
    await orderRepo.update(order.id as any, {
      subTotal,
      subTotalWithTax: subTotal,
    });

    // ── Bước 5: Load Order với relations ──
    const finalOrder = await orderRepo.findOne({
      where: { id: order.id as any },
      relations: [
        "lines",
        "lines.productVariant",
        "lines.productVariant.product",
        "lines.productVariant.product.featuredAsset",
        "lines.featuredAsset",
      ],
    });

    if (!finalOrder) {
      throw new Error("Không thể load lại order sau khi cập nhật");
    }

    console.log(
      `✅ [CartService] Order ${finalOrder.code} updated: subTotal: ${finalOrder.subTotal}`,
    );

    return finalOrder;
  }
}
