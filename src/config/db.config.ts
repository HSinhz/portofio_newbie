import { DataSourceOptions } from "typeorm";
import path from "path";
import "dotenv/config";

export const dbConnectionOptions: DataSourceOptions = {
  type: "postgres",
  synchronize: false,
  migrations: [path.join(__dirname, "../migrations/*.+(js|ts)")],
  logging: false,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA,
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};
