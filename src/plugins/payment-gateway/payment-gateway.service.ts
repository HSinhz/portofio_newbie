// plugins/payment-gateway/payment-gateway.service.ts
// Orchestrator — chọn đúng handler theo paymentMethod rồi delegate
import { Injectable } from "@nestjs/common";
import {
  BasePaymentHandler,
  GatewayPaymentInput,
  GatewayPaymentResult,
  GatewayRefundInput,
  GatewayRefundResult,
} from "./handlers/base.handler";
import { MomoHandler } from "./handlers/momo.handler";
import { VnpayHandler } from "./handlers/vnpay.handler";
import { StripeHandler } from "./handlers/stripe.handler";

export type GatewayId = "momo" | "vnpay" | "stripe" | "cod" | "banking";

@Injectable()
export class PaymentGatewayService {
  private readonly handlers: Map<string, BasePaymentHandler>;

  constructor(
    private momo: MomoHandler,
    private vnpay: VnpayHandler,
    private stripe: StripeHandler,
  ) {
    // Registry — thêm gateway mới chỉ cần inject + register ở đây
    this.handlers = new Map([
      ["momo", this.momo as BasePaymentHandler],
      ["vnpay", this.vnpay as BasePaymentHandler],
      ["stripe", this.stripe as BasePaymentHandler],
    ]);
  }

  async processPayment(
    gatewayId: GatewayId,
    input: GatewayPaymentInput,
  ): Promise<GatewayPaymentResult> {
    // COD / banking không cần gateway — xử lý offline
    if (gatewayId === "cod" || gatewayId === "banking") {
      return {
        success: true,
        message: `${gatewayId.toUpperCase()} — xác nhận thủ công`,
      };
    }

    const handler = this.handlers.get(gatewayId);
    if (!handler) {
      return {
        success: false,
        message: `Gateway không được hỗ trợ: ${gatewayId}`,
      };
    }

    return handler.createPayment(input);
  }

  async processRefund(
    gatewayId: GatewayId,
    input: GatewayRefundInput,
  ): Promise<GatewayRefundResult> {
    const handler = this.handlers.get(gatewayId);
    if (!handler) {
      return {
        success: false,
        message: `Gateway không hỗ trợ refund: ${gatewayId}`,
      };
    }

    return handler.refund(input);
  }

  verifyWebhook(
    gatewayId: GatewayId,
    payload: unknown,
    signature: string,
  ): boolean {
    const handler = this.handlers.get(gatewayId);
    if (!handler) return false;
    return handler.verifyWebhook(payload, signature);
  }
}
