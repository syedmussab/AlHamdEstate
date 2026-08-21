import { Module } from "@nestjs/common";
import { PurchasesService } from "./purchases.service";
import { PurchasesController } from "./purchases.controller";
import { StockService } from "../../common/services/stock.service";

@Module({
  controllers: [PurchasesController],
  providers: [PurchasesService, StockService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
