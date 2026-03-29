// plugins/payment-gateway/handlers/vnpay.handler.ts
// Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
import { Injectable } from "@nestjs/common";
import {
  BasePaymentHandler,
  GatewayPaymentInput,
  GatewayPaymentResult,
  GatewayRefundInput,
  GatewayRefundResult,
} from "./base.handler";

@Injectable()
export class VnpayHandler extends BasePaymentHandler {
  readonly name = "vnpay";

  private readonly tmnCode = process.env.VNPAY_TMN_CODE ?? "";
  private readonly hashSecret = process.env.VNPAY_HASH_SECRET ?? "";
  private readonly endpoint = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

  async createPayment(input: GatewayPaymentInput): Promise<GatewayPaymentResult> {
    // TODO: implement VNPay payment URL generation
    // Flow:
    //   1. Build params: vnp_Amount (x100), vnp_TxnRef, vnp_OrderInfo...
    //   2. Sort params alphabetically
    //   3. Tạo chữ ký HMAC-SHA512
    //   4. Trả về paymentUrl để redirect
    throw new Error("VnpayHandler.createPayment — chưa implement");
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    // TODO: verify vnp_SecureHash từ VNPay return URL / IPN
    throw new Error("VnpayHandler.verifyWebhook — chưa implement");
  }

  async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    // TODO: gọi VNPay Refund API (vnp_Command = "refund")
    throw new Error("VnpayHandler.refund — chưa implement");
  }
}
