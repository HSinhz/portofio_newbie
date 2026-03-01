// src/plugins/payment/payment-init.service.ts
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import {
  Channel,
  PaymentMethod,
  TransactionalConnection,
} from "@vendure/core";
import { LanguageCode } from "@vendure/common/lib/generated-types";
import { PaymentMethodTranslation } from "@vendure/core/dist/entity/payment-method/payment-method-translation.entity";

// =============================================
// SERVICE: Tự động tạo PaymentMethod khi khởi động
//
// Vendure tách biệt:
//   - PaymentMethodHandler: code xử lý (khai báo trong config)
//   - PaymentMethod:        bản ghi trong DB, dùng handler trên
//
// addPaymentToOrder() cần PaymentMethod.code từ DB.
// Service này đảm bảo bản ghi đó tồn tại khi server start.
// =============================================

@Injectable()
export class PaymentInitService implements OnApplicationBootstrap {
  constructor(private connection: TransactionalConnection) {}

  async onApplicationBootstrap(): Promise<void> {
    const manager = this.connection.rawConnection.manager;

    // ── Kiểm tra xem đã có PaymentMethod với code "dummy" chưa ──
    const existing = await manager.findOne(PaymentMethod, {
      where: { code: "dummy" },
    });

    if (existing) {
      console.log("✅ [PaymentInit] PaymentMethod 'dummy' đã tồn tại, bỏ qua");
      return;
    }

    console.log("🔧 [PaymentInit] Chưa có PaymentMethod, đang tạo mới...");

    // ── Lấy default channel để gắn vào PaymentMethod ──
    // "__default_channel__" là code mặc định của channel chính trong Vendure
    const channel = await manager.findOne(Channel, {
      where: { code: "__default_channel__" },
    });

    // ── Tạo PaymentMethod ──────────────────────────
    // handler.code phải khớp với dummyPaymentHandler.code trong vendure-config.ts
    // handler.args = [] vì dummy handler không cần tham số cấu hình
    const pm = manager.create(PaymentMethod, {
      code: "dummy",
      enabled: true,
      handler: { code: "dummy-payment-handler", args: [] },
      checker: null,
    });

    const saved = await manager.save(pm);

    // ── Tạo translation (tên hiển thị) ────────────
    // PaymentMethod dùng i18n nên cần ít nhất 1 bản dịch
    const translation = manager.create(PaymentMethodTranslation, {
      languageCode: LanguageCode.en,
      name: "Dummy Payment",
      description: "Development only — auto-created by PaymentInitService",
      base: saved,
    });

    await manager.save(translation);

    // ── Gắn PaymentMethod với Channel ─────────────
    if (channel) {
      await manager
        .createQueryBuilder()
        .relation(PaymentMethod, "channels")
        .of(saved.id)
        .add(channel.id);
    }

    console.log(
      `✅ [PaymentInit] PaymentMethod 'dummy' đã được tạo (id: ${saved.id})`,
    );
  }
}
