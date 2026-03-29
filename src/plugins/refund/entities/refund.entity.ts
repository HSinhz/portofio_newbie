// plugins/refund/entities/refund.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type RefundStatus = "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
export type RefundType = "FULL" | "PARTIAL";

@Entity("refund_request")
export class RefundEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: "order_id" })
  orderId: string;

  @Index()
  @Column({ name: "user_id" })
  userId: number;

  @Column({ type: "bigint" })
  amount: number;

  @Column({ type: "enum", enum: ["FULL", "PARTIAL"], default: "FULL" })
  type: RefundType;

  @Column({ type: "enum", enum: ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"], default: "PENDING" })
  status: RefundStatus;

  /** Lý do hoàn tiền từ user */
  @Column()
  reason: string;

  /** Ghi chú nội bộ (admin) */
  @Column({ nullable: true, name: "admin_note" })
  adminNote?: string;

  /** ID giao dịch hoàn tiền từ gateway */
  @Column({ nullable: true, name: "gateway_refund_id" })
  gatewayRefundId?: string;

  /** Phương thức hoàn tiền: trả về gateway gốc hoặc vào wallet */
  @Column({ name: "refund_to", default: "original" })
  refundTo: "original" | "wallet";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
