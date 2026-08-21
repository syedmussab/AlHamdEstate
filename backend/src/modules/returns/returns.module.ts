import { Module } from "@nestjs/common";
import { ReturnsService } from "./returns.service";
import { ReturnsController } from "./returns.controller";
import { StockService } from "../../common/services/stock.service";

@Module({
  controllers: [ReturnsController],
  providers: [ReturnsService, StockService],
})
export class ReturnsModule {}
