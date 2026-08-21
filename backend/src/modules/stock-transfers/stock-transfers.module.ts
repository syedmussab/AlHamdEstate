import { Module } from "@nestjs/common";
import { StockTransfersService } from "./stock-transfers.service";
import { StockTransfersController } from "./stock-transfers.controller";
import { StockService } from "../../common/services/stock.service";

@Module({
  controllers: [StockTransfersController],
  providers: [StockTransfersService, StockService],
})
export class StockTransfersModule {}
