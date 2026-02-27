import {
  RequestContext,
  Order,
  OrderLine,
  ID,
  OrderInterceptor,
} from "@vendure/core";

export const addItemToOrderInterceptor: OrderInterceptor = {
  willAddItemToOrder: async (ctx, order, input) => {
    // console.log("🎯 ===== INTERCEPTOR: BEFORE ADD ITEM =====");
    // console.log("📋 Order ID:", order?.id || "New Order");
    // console.log("📋 Order Code:", order?.code || "Not assigned");
    // console.log("📦 Variant ID:", input.productVariant.id); // ✅ Sửa từ productVariantId → productVariant.id
    // console.log("📦 Variant Name:", input.productVariant.name);
    // console.log("🔢 Quantity:", input.quantity);
    // console.log("👤 User ID:", ctx.activeUserId || "Guest");
    // console.log("==========================================");
  },
};
