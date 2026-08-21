import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { StockModuleService } from "./stock.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

class AdjustDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() warehouseId: string;
  @Type(() => Number) @IsInt() quantity: number;
  @IsOptional() @IsString() reason?: string;
}

class StockQueryDto extends PaginationDto {
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() productId?: string;
}

class MovementQueryDto extends PaginationDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly service: StockModuleService) {}

  @Get("stock")
  @RequirePermissions("stock.read")
  findAll(@Query() query: StockQueryDto) {
    return this.service.findAll(query);
  }

  @Get("stock/low-stock")
  @RequirePermissions("stock.read")
  lowStock(@Query() query: PaginationDto) {
    return this.service.lowStock(query);
  }

  @Post("stock/adjustments")
  @RequirePermissions("stock.adjust")
  adjust(@Body() dto: AdjustDto, @CurrentUser("id") userId: string) {
    return this.service.adjust(dto, userId);
  }

  @Get("stock-movements")
  @RequirePermissions("stock.movements")
  getMovements(@Query() query: MovementQueryDto) {
    return this.service.getMovements(query);
  }
}
