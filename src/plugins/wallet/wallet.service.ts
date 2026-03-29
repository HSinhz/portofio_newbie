// plugins/wallet/wallet.service.ts
import { Injectable } from "@nestjs/common";
import { RequestContext, TransactionalConnection, ID } from "@vendure/core";
import { WalletEntity } from "./entities/wallet.entity";

export interface WalletTopUpInput {
  userId: ID;
  amount: number;
  description?: string;
}

export interface WalletDeductInput {
  userId: ID;
  amount: number;
  orderId: string;
}

export interface WalletResult {
  success: boolean;
  balance?: number;
  message: string;
}

@Injectable()
export class WalletService {
  constructor(private connection: TransactionalConnection) {}

  async getBalance(ctx: RequestContext, userId: ID): Promise<number> {
    const repo = this.connection.getRepository(ctx, WalletEntity);
    const wallet = await repo.findOne({ where: { userId: userId as number, active: true } });
    return wallet?.balance ?? 0;
  }

  async getOrCreateWallet(ctx: RequestContext, userId: ID): Promise<WalletEntity> {
    const repo = this.connection.getRepository(ctx, WalletEntity);
    let wallet = await repo.findOne({ where: { userId: userId as number } });

    if (!wallet) {
      wallet = repo.create({ userId: userId as number, balance: 0 });
      await repo.save(wallet);
    }

    return wallet;
  }

  async topUp(ctx: RequestContext, input: WalletTopUpInput): Promise<WalletResult> {
    // TODO: implement top-up
    // Flow:
    //   1. getOrCreateWallet
    //   2. wallet.balance += input.amount
    //   3. wallet.totalCredited += input.amount
    //   4. save wallet
    //   5. ghi vào LedgerService (CREDIT entry)
    throw new Error("WalletService.topUp — chưa implement");
  }

  async deduct(ctx: RequestContext, input: WalletDeductInput): Promise<WalletResult> {
    // TODO: implement deduction khi thanh toán bằng wallet
    // Flow:
    //   1. getOrCreateWallet
    //   2. Kiểm tra balance >= amount (insufficient funds check)
    //   3. wallet.balance -= input.amount
    //   4. wallet.totalDebited += input.amount
    //   5. save wallet
    //   6. ghi vào LedgerService (DEBIT entry)
    throw new Error("WalletService.deduct — chưa implement");
  }

  async refundToWallet(ctx: RequestContext, userId: ID, amount: number): Promise<WalletResult> {
    // TODO: hoàn tiền vào wallet (dùng khi refund = wallet credit)
    throw new Error("WalletService.refundToWallet — chưa implement");
  }
}
