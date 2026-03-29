// plugins/payment-gateway/payment-gateway.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { PaymentGatewayService } from "./payment-gateway.service";
import { MomoHandler } from "./handlers/momo.handler";
import { VnpayHandler } from "./handlers/vnpay.handler";
import { StripeHandler } from "./handlers/stripe.handler";

/**
 * PaymentGatewayPlugin
 *
 * Quản lý tất cả kết nối ra bên ngoài (MoMo, VNPay, Stripe...).
 * PaymentPlugin (core) gọi sang đây thay vì gọi trực tiếp từng gateway.
 *
 * Để thêm gateway mới:
 *   1. Tạo handler trong handlers/<name>.handler.ts
 *   2. Inject vào PaymentGatewayService
 *   3. Register trong providers bên dưới
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    PaymentGatewayService,
    MomoHandler,
    VnpayHandler,
    StripeHandler,
  ],
  exports: [PaymentGatewayService],
  compatibility: "^3.0.0",
})
export class PaymentGatewayPlugin {}
