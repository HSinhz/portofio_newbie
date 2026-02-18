// src/api/logger.controller.ts
import { Controller, Post, Body } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

interface LogRequest {
  timestamp: string;
  location: string;
  message: string;
  stack?: string;
  additionalData?: any;
}

@Controller("logger")
export class LoggerController {
  private readonly LOG_DIR =
    "C:\\Users\\ADMIN\\Desktop\\Sinz\\Portofio\\Product\\logs";

  constructor() {
    // Tạo folder logs nếu chưa có
    if (!fs.existsSync(this.LOG_DIR)) {
      fs.mkdirSync(this.LOG_DIR, { recursive: true });
      console.log(`✅ Created log directory: ${this.LOG_DIR}`);
    }
  }

  @Post("error")
  async logError(@Body() logData: LogRequest) {
    try {
      // Tạo tên file theo ngày
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(-2);
      const fileName = `ErrorLog_${day}${month}${year}.txt`;
      const filePath = path.join(this.LOG_DIR, fileName);

      // Format log content
      let logContent = `
========================================
[${logData.timestamp}] ERROR at ${logData.location}
========================================
Message: ${logData.message}
`;

      if (logData.stack) {
        logContent += `\nStack Trace:\n${logData.stack}\n`;
      }

      if (logData.additionalData) {
        logContent += `\nAdditional Data:\n${JSON.stringify(logData.additionalData, null, 2)}\n`;
      }

      logContent += `========================================\n\n`;

      // Append to file
      fs.appendFileSync(filePath, logContent, "utf8");

      console.log(`✅ Error logged to: ${filePath}`);

      return { success: true, filePath, fileName };
    } catch (error) {
      console.error("❌ Failed to write log:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post("clear-old")
  async clearOldLogs(@Body() { daysToKeep = 7 }: { daysToKeep?: number }) {
    try {
      const files = fs.readdirSync(this.LOG_DIR);
      const now = new Date();
      let deletedCount = 0;

      files.forEach((file) => {
        if (file.startsWith("ErrorLog_") && file.endsWith(".txt")) {
          const match = file.match(/ErrorLog_(\d{2})(\d{2})(\d{2})\.txt/);
          if (match) {
            const [, day, month, year] = match;
            const logDate = new Date(
              2000 + parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
            );

            const diffDays =
              (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);

            if (diffDays > daysToKeep) {
              fs.unlinkSync(path.join(this.LOG_DIR, file));
              deletedCount++;
              console.log(`🗑️ Deleted old log: ${file}`);
            }
          }
        }
      });

      console.log(`✅ Cleared ${deletedCount} old log files`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error("❌ Failed to clear old logs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
