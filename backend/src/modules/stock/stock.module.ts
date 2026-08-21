import { Module } from "@nestjs/common";
import { StockModuleService } from "./stock.service";
import { StockController } from "./stock.controller";
import { StockService } from "../../common/services/stock.service";

@Module({
  controllers: [StockController],
  providers: [StockModuleService, StockService],
  exports: [StockService],
})
export class StockModule {}
