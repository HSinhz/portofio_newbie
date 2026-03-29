// src/plugins/payment/payment-success.event.ts
import { VendureEvent } from "@vendure/core";
import { ID } from "@vendure/core";

/**
 * Emit sau khi payment thành công.
 * Bất kỳ service nào cần biết (Ledger, Notification...) đều subscribe event này
 * → PaymentService không cần biết các service đó tồn tại (loose coupling)
 */
export class PaymentSuccessEvent extends VendureEvent {
  constructor(
    public readonly userId: ID,
    public readonly orderId: string,
    public readonly orderCode: string,
    public readonly amount: number,
    public readonly paymentMethod: string, // "cod" | "momo" | "vnpay" | ...
  ) {
    super();
  }
}
