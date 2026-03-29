// src/plugins/payment/payment-init.service.ts
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import {
  Channel,
  PaymentMethod,
  TransactionalConnection,
} from "@vendure/core";
import { LanguageCode } from "@vendure/common/lib/generated-types";
import { PaymentMethodTranslation } from "@vendure/core/dist/entity/payment-method/payment-method-translation.entity";

@Injectable()
export class PaymentInitService implements OnApplicationBootstrap {
  constructor(private connection: TransactionalConnection) {}

  async onApplicationBootstrap(): Promise<void> {
    const manager = this.connection.rawConnection.manager;

    const existing = await manager.findOne(PaymentMethod, {
      where: { code: "cod" },
    });

    if (existing) {
      console.log("✅ [PaymentInit] PaymentMethod 'cod' đã tồn tại, bỏ qua");
      return;
    }

    console.log("🔧 [PaymentInit] Đang tạo PaymentMethod COD...");

    const channel = await manager.findOne(Channel, {
      where: { code: "__default_channel__" },
    });

    // handler.code phải khớp với codPaymentHandler.code trong vendure-config.ts
    const pm = manager.create(PaymentMethod, {
      code: "cod",
      enabled: true,
      handler: { code: "cod", args: [] },
      checker: null,
    });

    const saved = await manager.save(pm);

    const translation = manager.create(PaymentMethodTranslation, {
      languageCode: LanguageCode.vi,
      name: "Thanh toán khi nhận hàng (COD)",
      description: "Thanh toán tiền mặt khi shipper giao hàng",
      base: saved,
    });

    await manager.save(translation);

    if (channel) {
      await manager
        .createQueryBuilder()
        .relation(PaymentMethod, "channels")
        .of(saved.id)
        .add(channel.id);
    }

    console.log(`✅ [PaymentInit] PaymentMethod 'cod' đã được tạo (id: ${saved.id})`);
  }
}
