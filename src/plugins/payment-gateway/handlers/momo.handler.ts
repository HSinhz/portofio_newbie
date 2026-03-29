// plugins/payment-gateway/handlers/momo.handler.ts
// Docs: https://developers.momo.vn/v3/docs/payment/api/payment-method/
import { Injectable } from "@nestjs/common";
import {
  BasePaymentHandler,
  GatewayPaymentInput,
  GatewayPaymentResult,
  GatewayRefundInput,
  GatewayRefundResult,
} from "./base.handler";

@Injectable()
export class MomoHandler extends BasePaymentHandler {
  readonly name = "momo";

  // TODO: inject từ env
  private readonly partnerCode = process.env.MOMO_PARTNER_CODE ?? "";
  private readonly accessKey = process.env.MOMO_ACCESS_KEY ?? "";
  private readonly secretKey = process.env.MOMO_SECRET_KEY ?? "";
  private readonly endpoint = "https://test-payment.momo.vn/v2/gateway/api/create";

  async createPayment(input: GatewayPaymentInput): Promise<GatewayPaymentResult> {
    // TODO: implement MoMo payment request
    // Flow:
    //   1. Build requestBody với requestId, orderId, amount...
    //   2. Tạo chữ ký HMAC-SHA256
    //   3. POST đến MoMo endpoint
    //   4. Trả về payUrl để redirect user
    throw new Error("MomoHandler.createPayment — chưa implement");
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    // TODO: verify HMAC-SHA256 từ MoMo IPN webhook
    throw new Error("MomoHandler.verifyWebhook — chưa implement");
  }

  async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    // TODO: gọi MoMo refund API
    throw new Error("MomoHandler.refund — chưa implement");
  }
}
