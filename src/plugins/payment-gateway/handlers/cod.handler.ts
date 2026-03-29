// plugins/payment-gateway/handlers/cod.handler.ts
// COD — Cash on Delivery (Thanh toán khi nhận hàng)
// Không cần gọi ra ngoài, không cần redirect — approve ngay lập tức
import {
  PaymentMethodHandler,
  CreatePaymentResult,
  SettlePaymentResult,
  CancelPaymentResult,
  LanguageCode,
} from "@vendure/core";

/**
 * COD handler cho Vendure Order state machine.
 *
 * Flow COD:
 *   addPaymentToOrder() → createPayment() → trạng thái "Authorized"
 *   settlePayment()     → settlePayment()  → trạng thái "Settled" (khi shipper xác nhận giao)
 */
export const codPaymentHandler = new PaymentMethodHandler({
  code: "cod",
  description: [
    { languageCode: LanguageCode.vi, value: "Thanh toán khi nhận hàng (COD)" },
    { languageCode: LanguageCode.en, value: "Cash on Delivery (COD)" },
  ],
  args: {},

  /** Gọi khi user đặt hàng — COD approve ngay, không cần verify */
  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    return {
      amount,
      state: "Authorized",        // COD không cần settlement ngay
      transactionId: `COD-${order.code}-${Date.now()}`,
      metadata: {
        paymentMethod: "cod",
        phoneNumber: metadata?.phoneNumber ?? "",
        note: "Thanh toán khi nhận hàng",
      },
    };
  },

  /** Gọi khi shipper xác nhận đã giao hàng và thu tiền */
  settlePayment: async (ctx, order, payment): Promise<SettlePaymentResult> => {
    return { success: true };
  },

  /** Gọi khi hủy đơn trước khi giao */
  cancelPayment: async (ctx, order, payment): Promise<CancelPaymentResult> => {
    return { success: true };
  },
});
