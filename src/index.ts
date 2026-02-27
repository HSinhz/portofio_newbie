import { bootstrap, runMigrations } from "@vendure/core";
import { config } from "./vendure-config";

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (err: any) => {
  console.error("❌ UNHANDLED REJECTION:", err?.message);
  console.error(err?.stack);
});

runMigrations(config)
  .then(() => bootstrap(config))
  .catch((err) => {
    console.error("❌ FULL ERROR:", err);
    console.error("❌ ERROR MESSAGE:", err.message);
    console.error("❌ ERROR STACK:", err.stack);
    process.exit(1);
  });
