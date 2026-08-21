import { Global, Module } from "@nestjs/common";
import { AuditService } from "./services/audit.service";
import { StockService } from "./services/stock.service";

@Global()
@Module({
  providers: [AuditService, StockService],
  exports: [AuditService, StockService],
})
export class CommonModule {}
