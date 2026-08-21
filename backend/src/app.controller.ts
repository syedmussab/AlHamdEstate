import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";
import { PrismaService } from "./prisma/prisma.service";

@Controller("api/health")
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected", timestamp: new Date().toISOString() };
    } catch {
      return { status: "degraded", database: "disconnected", timestamp: new Date().toISOString() };
    }
  }
}
