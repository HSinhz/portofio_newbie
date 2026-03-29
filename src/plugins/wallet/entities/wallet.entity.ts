// plugins/wallet/entities/wallet.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("wallet")
export class WalletEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: "user_id" })
  userId: number;

  /** Số dư hiện tại (đơn vị: VND, lưu nguyên — không x100) */
  @Column({ type: "bigint", default: 0 })
  balance: number;

  /** Tổng nạp vào (dùng để audit) */
  @Column({ type: "bigint", name: "total_credited", default: 0 })
  totalCredited: number;

  /** Tổng đã dùng (dùng để audit) */
  @Column({ type: "bigint", name: "total_debited", default: 0 })
  totalDebited: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
