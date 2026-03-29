// plugins/payment-gateway/handlers/stripe.handler.ts
// Docs: https://stripe.com/docs/api
import { Injectable } from "@nestjs/common";
import {
  BasePaymentHandler,
  GatewayPaymentInput,
  GatewayPaymentResult,
  GatewayRefundInput,
  GatewayRefundResult,
} from "./base.handler";

@Injectable()
export class StripeHandler extends BasePaymentHandler {
  readonly name = "stripe";

  private readonly secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  async createPayment(input: GatewayPaymentInput): Promise<GatewayPaymentResult> {
    // TODO: implement Stripe PaymentIntent
    // Flow:
    //   1. stripe.paymentIntents.create({ amount, currency, metadata })
    //   2. Trả về client_secret cho frontend (Stripe Elements)
    //   OR: stripe.checkout.sessions.create() → redirect URL
    throw new Error("StripeHandler.createPayment — chưa implement");
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    // TODO: stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    throw new Error("StripeHandler.verifyWebhook — chưa implement");
  }

  async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    // TODO: stripe.refunds.create({ payment_intent, amount })
    throw new Error("StripeHandler.refund — chưa implement");
  }
}
