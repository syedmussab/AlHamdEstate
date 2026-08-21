import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

class ChartsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}

@Controller("api/dashboard")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("summary")
  @RequirePermissions("dashboard.read")
  summary() {
    return this.service.summary();
  }

  @Get("charts")
  @RequirePermissions("dashboard.read")
  charts(@Query() query: ChartsQueryDto) {
    return this.service.charts(query.days ?? 14);
  }

  @Get("recent-transactions")
  @RequirePermissions("dashboard.read")
  recentTransactions() {
    return this.service.recentTransactions();
  }
}
