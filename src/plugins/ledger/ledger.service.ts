// plugins/ledger/ledger.service.ts
// Ghi lịch sử giao dịch theo double-entry accounting
import { Injectable, OnModuleInit } from "@nestjs/common";
import { RequestContext, TransactionalConnection, ID, EventBus, RequestContextService } from "@vendure/core";
import { LedgerEntryEntity, EntryStatus } from "./entities/ledger-entry.entity";
import { randomUUID } from "crypto";
import { PaymentSuccessEvent } from "../payment/payment-success.event";

export interface RecordPaymentInput {
  userId: ID;
  orderId: string;
  amount: number;
  paymentMethod: string;
  gatewayTransactionId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordRefundInput {
  userId: ID;
  orderId: string;
  amount: number;
  originalTransactionId: string;
  description?: string;
}

export interface TransactionHistory {
  id: number;
  transactionId: string;
  type: string;
  amount: number;
  account: string;
  description?: string;
  paymentMethod?: string;
  status: EntryStatus;
  createdAt: Date;
}

@Injectable()
export class LedgerService implements OnModuleInit {
  constructor(
    private connection: TransactionalConnection,
    private eventBus: EventBus,
    private requestContextService: RequestContextService,
  ) {}

  onModuleInit() {
    // Subscribe PaymentSuccessEvent — LedgerService tự ghi sổ, không cần ai gọi trực tiếp
    this.eventBus.ofType(PaymentSuccessEvent).subscribe(async (event) => {
      const ctx = await this.requestContextService.create({ apiType: "shop" });
      await this.recordPayment(ctx, {
        userId: event.userId,
        orderId: event.orderId,
        amount: event.amount,
        paymentMethod: event.paymentMethod,
        description: `Thanh toán đơn hàng ${event.orderCode}`,
      });
      console.log(`✅ [LedgerService] Ghi sổ thành công — order: ${event.orderCode}`);
    });
  }

  /**
   * Ghi nhận thanh toán thành công.
   * Tạo 2 entries theo double-entry:
   *   DEBIT  — CUSTOMER_WALLET   (tiền ra khỏi ví/tài khoản khách)
   *   CREDIT — REVENUE           (tiền vào doanh thu)
   */
  async recordPayment(ctx: RequestContext, input: RecordPaymentInput): Promise<string> {
    const transactionId = input.gatewayTransactionId ?? randomUUID();
    const repo = this.connection.getRepository(ctx, LedgerEntryEntity);

    await repo.save([
      {
        transactionId,
        userId: input.userId as number,
        orderId: input.orderId,
        type: "DEBIT" as const,
        amount: input.amount,
        balanceAfter: 0,
        account: "CUSTOMER_WALLET",
        description: input.description ?? `Thanh toán đơn hàng ${input.orderId}`,
        paymentMethod: input.paymentMethod,
        status: "COMPLETED" as const,
        metadata: input.metadata,
      },
      {
        transactionId,
        userId: input.userId as number,
        orderId: input.orderId,
        type: "CREDIT" as const,
        amount: input.amount,
        balanceAfter: 0,
        account: "REVENUE",
        description: input.description ?? `Doanh thu đơn hàng ${input.orderId}`,
        paymentMethod: input.paymentMethod,
        status: "COMPLETED" as const,
        metadata: input.metadata,
      },
    ]);

    return transactionId;
  }

  /**
   * Ghi nhận hoàn tiền.
   * Tạo 2 entries:
   *   DEBIT  — REFUND_POOL       (tiền ra từ quỹ hoàn trả)
   *   CREDIT — CUSTOMER_WALLET   (tiền về ví khách)
   */
  async recordRefund(ctx: RequestContext, input: RecordRefundInput): Promise<string> {
    // TODO: implement double-entry refund
    throw new Error("LedgerService.recordRefund — chưa implement");
  }

  /** Lấy lịch sử giao dịch của user */
  async getHistory(
    ctx: RequestContext,
    userId: ID,
    limit = 20,
    offset = 0,
  ): Promise<TransactionHistory[]> {
    // TODO: query ledger_entry by userId, sort by createdAt DESC
    throw new Error("LedgerService.getHistory — chưa implement");
  }

  /** Reverse toàn bộ entries của một transactionId (khi payment fail sau khi đã ghi) */
  async reverseTransaction(ctx: RequestContext, transactionId: string): Promise<void> {
    // TODO: update status = "REVERSED" cho cả 2 entries
    throw new Error("LedgerService.reverseTransaction — chưa implement");
  }
}
