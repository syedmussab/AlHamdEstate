import { Module } from "@nestjs/common";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";
import { StockService } from "../../common/services/stock.service";

@Module({
  controllers: [SalesController],
  providers: [SalesService, StockService],
  exports: [SalesService],
})
export class SalesModule {}
