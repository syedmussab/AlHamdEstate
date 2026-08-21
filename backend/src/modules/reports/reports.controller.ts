import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { IsIn, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

class ReportQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() categoryId?: string;

  @IsOptional()
  @Type(() => String)
  @IsIn(["json", "csv", "pdf"])
  export?: string;
}

@Controller("api/reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("sales")
  @RequirePermissions("reports.read")
  async sales(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.sales(q);
    return this.respond(res, report, q.export, "sales");
  }

  @Get("purchases")
  @RequirePermissions("reports.read")
  async purchases(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.purchases(q);
    return this.respond(res, report, q.export, "purchases");
  }

  @Get("stock")
  @RequirePermissions("reports.read")
  async stock(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.stock(q);
    return this.respond(res, report, q.export, "stock");
  }

  @Get("stock-movements")
  @RequirePermissions("reports.read")
  async stockMovements(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.stockMovements(q);
    return this.respond(res, report, q.export, "stock-movements");
  }

  @Get("low-stock")
  @RequirePermissions("reports.read")
  async lowStock(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.lowStock(q);
    return this.respond(res, report, q.export, "low-stock");
  }

  @Get("profit-loss")
  @RequirePermissions("reports.read")
  profitLoss(@Query() q: ReportQueryDto) {
    return this.service.profitLoss(q);
  }

  @Get("expenses")
  @RequirePermissions("reports.read")
  async expenses(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.expenses(q);
    return this.respond(res, report, q.export, "expenses");
  }

  @Get("customer-balances")
  @RequirePermissions("reports.read")
  async customerBalances(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.customerBalances();
    return this.respond(res, report, q.export, "customer-balances");
  }

  @Get("supplier-balances")
  @RequirePermissions("reports.read")
  async supplierBalances(@Query() q: ReportQueryDto, @Res() res: Response) {
    const report = await this.service.supplierBalances();
    return this.respond(res, report, q.export, "supplier-balances");
  }

  private async respond(res: Response, report: any, format: string | undefined, name: string) {
    if (format === "csv") {
      const csv = this.service.toCsv(report);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${name}-report.csv"`);
      return res.send(`\uFEFF${csv}`);
    }
    if (format === "pdf") {
      const pdf = await this.service.toPdf(report);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${name}-report.pdf"`);
      return res.send(pdf);
    }
    return res.json(report);
  }
}
