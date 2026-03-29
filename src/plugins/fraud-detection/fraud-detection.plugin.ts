// plugins/fraud-detection/fraud-detection.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { FraudDetectionService } from "./fraud-detection.service";

/**
 * FraudDetectionPlugin
 *
 * Phát hiện giao dịch bất thường trước khi xử lý payment.
 * PaymentPlugin (core) inject FraudDetectionService và gọi
 * checkTransaction() đầu tiên trong placeOrder flow.
 *
 * Rules hiện tại (TODO implement):
 *   - Số tiền bất thường (quá lớn / quá nhỏ)
 *   - Duplicate order trong thời gian ngắn
 *   - Velocity check (quá nhiều lần thanh toán / giờ)
 *   - IP / device fingerprint bất thường (nâng cao)
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [FraudDetectionService],
  exports: [FraudDetectionService],
  compatibility: "^3.0.0",
})
export class FraudDetectionPlugin {}
