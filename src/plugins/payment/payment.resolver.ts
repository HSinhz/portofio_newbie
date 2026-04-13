// src/plugins/payment/payment.resolver.ts
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { Ctx, RequestContext, Transaction } from "@vendure/core";
import {
  PaymentService,
  PlaceOrderInput,
  PlaceOrderResult,
} from "./paytment.service";

@Resolver()
export class PaymentResolver {
  constructor(private paymentService: PaymentService) {}

  /**
   * customPlaceOrder — Thực hiện toàn bộ checkout flow
   *
   * Vendure Order State Machine:
   *   AddingItems → (setShippingAddress + setShippingMethod)
   *              → ArrangingPayment → (addPaymentToOrder)
   *              → PaymentSettled / PaymentAuthorized
   */
  @Transaction()
  @Mutation()
  async customPlaceOrder(
    @Ctx() ctx: RequestContext,
    @Args("input") input: PlaceOrderInput,
  ): Promise<PlaceOrderResult> {
    console.log("🔧 [PaymentResolver] customPlaceOrder called");
    return this.paymentService.placeOrder(ctx, input);
  }
}
