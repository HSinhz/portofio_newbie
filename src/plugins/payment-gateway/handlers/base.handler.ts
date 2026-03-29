// plugins/payment-gateway/handlers/base.handler.ts
// Mỗi gateway (MoMo, VNPay, Stripe...) implement interface này

export interface GatewayPaymentInput {
  orderId: string;
  orderCode: string;
  amount: number;        // đơn vị: VND (không chia 100)
  currency: string;      // "VND" | "USD"
  description: string;
  returnUrl: string;     // URL redirect sau khi thanh toán
  ipnUrl: string;        // URL nhận webhook từ gateway
  metadata?: Record<string, string>;
}

export interface GatewayPaymentResult {
  success: boolean;
  paymentUrl?: string;   // redirect user đến đây (MoMo, VNPay)
  transactionId?: string;
  message: string;
}

export interface GatewayRefundInput {
  transactionId: string;
  amount: number;
  reason: string;
}

export interface GatewayRefundResult {
  success: boolean;
  refundId?: string;
  message: string;
}

// ─── Abstract base — mọi handler phải implement ───────────────────────────────
export abstract class BasePaymentHandler {
  abstract readonly name: string;

  abstract createPayment(input: GatewayPaymentInput): Promise<GatewayPaymentResult>;

  abstract verifyWebhook(payload: unknown, signature: string): boolean;

  abstract refund(input: GatewayRefundInput): Promise<GatewayRefundResult>;
}
