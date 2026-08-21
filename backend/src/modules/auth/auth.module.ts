import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { StockService } from "../../common/services/stock.service";
import { AuditService } from "../../common/services/audit.service";

@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [AuthService, StockService, AuditService],
  exports: [JwtModule],
})
export class AuthModule {}
