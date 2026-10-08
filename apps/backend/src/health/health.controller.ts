import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Público a propósito (sin SupabaseAuthGuard): lo usa el health check de
// Coolify y la verificación con curl. No expone ningún dato; sigue bajo el
// rate-limit global del ThrottlerGuard.
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: "error", database: "down" });
    }
    return { status: "ok", database: "up" };
  }
}
