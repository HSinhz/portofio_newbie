// plugins/fraud-detection/fraud-detection.service.ts
import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/core";

export interface FraudCheckInput {
  userId: ID;
  orderId: ID;
  amount: number;
  ipAddress?: string;
  userAgent?: string;
  paymentMethod: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

export interface FraudCheckResult {
  riskLevel: RiskLevel;
  blocked: boolean;
  reasons: string[];   // danh sách lý do nếu suspicious
  score: number;       // 0–100 (100 = chắc chắn fraud)
}

@Injectable()
export class FraudDetectionService {
  /**
   * Điểm vào chính — gọi trước khi xử lý payment.
   * Nếu blocked = true → từ chối giao dịch.
   */
  async checkTransaction(input: FraudCheckInput): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let score = 0;

    // TODO: implement từng rule — mỗi rule cộng điểm vào score
    const [amountRisk, duplicateRisk, velocityRisk] = await Promise.all([
      this.checkAbnormalAmount(input.amount),
      this.checkDuplicateOrder(input.userId, input.orderId),
      this.checkVelocity(input.userId),
    ]);

    if (amountRisk.flagged) { score += 30; reasons.push(amountRisk.reason!); }
    if (duplicateRisk.flagged) { score += 50; reasons.push(duplicateRisk.reason!); }
    if (velocityRisk.flagged) { score += 40; reasons.push(velocityRisk.reason!); }

    const riskLevel: RiskLevel =
      score >= 80 ? "BLOCKED"
      : score >= 60 ? "HIGH"
      : score >= 30 ? "MEDIUM"
      : "LOW";

    return {
      riskLevel,
      blocked: riskLevel === "BLOCKED",
      reasons,
      score,
    };
  }

  // ─── Rules ────────────────────────────────────────────────────────────────

  private async checkAbnormalAmount(
    amount: number,
  ): Promise<{ flagged: boolean; reason?: string }> {
    // TODO: so sánh với average order value của user
    // TODO: flag nếu amount > threshold (ví dụ: 100M VND một lần)
    return { flagged: false };
  }

  private async checkDuplicateOrder(
    userId: ID,
    orderId: ID,
  ): Promise<{ flagged: boolean; reason?: string }> {
    // TODO: kiểm tra có order giống hệt trong 5 phút gần đây không
    // (idempotency protection)
    return { flagged: false };
  }

  private async checkVelocity(
    userId: ID,
  ): Promise<{ flagged: boolean; reason?: string }> {
    // TODO: kiểm tra số lần thanh toán trong 1 giờ
    // Flag nếu > N lần (ví dụ: > 5 lần/giờ)
    return { flagged: false };
  }
}
