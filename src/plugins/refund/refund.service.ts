// plugins/refund/refund.service.ts
import { Injectable } from "@nestjs/common";
import { RequestContext, TransactionalConnection, ID } from "@vendure/core";
import { RefundEntity, RefundStatus } from "./entities/refund.entity";

export interface RequestRefundInput {
  userId: ID;
  orderId: string;
  amount: number;
  reason: string;
  refundTo?: "original" | "wallet";
}

export interface RefundResult {
  success: boolean;
  refundId?: number;
  status?: RefundStatus;
  message: string;
}

@Injectable()
export class RefundService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * User gửi yêu cầu hoàn tiền → tạo record PENDING
   * Admin review sau (hoặc auto-approve theo rule)
   */
  async requestRefund(ctx: RequestContext, input: RequestRefundInput): Promise<RefundResult> {
    // TODO: implement
    // Flow:
    //   1. Kiểm tra order thuộc về user
    //   2. Kiểm tra order đã PAID (không refund PENDING order)
    //   3. Kiểm tra chưa có refund request cho order này
    //   4. Tạo RefundEntity với status = PENDING
    //   5. (Optional) auto-approve nếu amount nhỏ
    throw new Error("RefundService.requestRefund — chưa implement");
  }

  /**
   * Admin approve → gọi gateway refund → update status
   */
  async processRefund(ctx: RequestContext, refundId: number): Promise<RefundResult> {
    // TODO: implement
    // Flow:
    //   1. Load RefundEntity
    //   2. Cập nhật status = PROCESSING
    //   3. Gọi PaymentGatewayService.processRefund()
    //   4. Nếu success: update status = COMPLETED, lưu gatewayRefundId
    //   5. Ghi vào LedgerService.recordRefund()
    //   6. Nếu refundTo = "wallet": gọi WalletService.refundToWallet()
    throw new Error("RefundService.processRefund — chưa implement");
  }

  async getRefundsByUser(ctx: RequestContext, userId: ID): Promise<RefundEntity[]> {
    const repo = this.connection.getRepository(ctx, RefundEntity);
    return repo.find({
      where: { userId: userId as number },
      order: { createdAt: "DESC" },
    });
  }

  async getRefundById(ctx: RequestContext, refundId: number): Promise<RefundEntity | null> {
    const repo = this.connection.getRepository(ctx, RefundEntity);
    return repo.findOne({ where: { id: refundId } });
  }
}
