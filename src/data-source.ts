// src/data-source.ts
// File này dùng riêng cho TypeORM CLI (migration:generate / migration:run)
// KHÔNG dùng trong runtime của Vendure
import { DataSource } from "typeorm";
import { dbConnectionOptions } from "./config/db.config";
import path from "path";
import "dotenv/config";

import { LedgerEntryEntity } from "./plugins/ledger/entities/ledger-entry.entity";
// Thêm dần các entity khác khi cần:
// import { WalletEntity } from "./plugins/wallet/entities/wallet.entity";
// import { RefundEntity } from "./plugins/refund/entities/refund.entity";

export const AppDataSource = new DataSource({
  ...dbConnectionOptions,
  entities: [LedgerEntryEntity],
  migrations: [path.join(__dirname, "./migrations/*.+(js|ts)")],
});
