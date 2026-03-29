// plugins/ledger/entities/ledger-entry.entity.ts
// Double-entry accounting: mỗi giao dịch có 2 entries (DEBIT + CREDIT)
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

export type EntryType = "DEBIT" | "CREDIT";
export type EntryStatus = "PENDING" | "COMPLETED" | "REVERSED";

@Entity("ledger_entry")
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** ID giao dịch — 2 entries (DEBIT + CREDIT) cùng transactionId */
  @Index()
  @Column({ name: "transaction_id" })
  transactionId: string;

  @Index()
  @Column({ name: "user_id" })
  userId: number;

  @Index()
  @Column({ name: "order_id", nullable: true })
  orderId?: string;

  @Column({ type: "enum", enum: ["DEBIT", "CREDIT"] })
  type: EntryType;

  /** Số tiền (VND, không x100) */
  @Column({ type: "bigint" })
  amount: number;

  /** Số dư sau giao dịch (snapshot) */
  @Column({ type: "bigint", name: "balance_after" })
  balanceAfter: number;

  /**
   * Tài khoản nguồn / đích:
   * "CUSTOMER_WALLET" | "GATEWAY_MOMO" | "GATEWAY_VNPAY" | "REVENUE" | "REFUND_POOL"
   */
  @Column()
  account: string;

  /** Mô tả giao dịch — hiển thị cho user */
  @Column({ nullable: true })
  description?: string;

  /** Phương thức thanh toán: "cod" | "momo" | "vnpay" | "stripe" | "wallet" */
  @Column({ name: "payment_method", nullable: true })
  paymentMethod?: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "COMPLETED", "REVERSED"],
    default: "COMPLETED",
  })
  status: EntryStatus;

  /** Metadata tuỳ ý (gateway response, idempotency key...) */
  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
