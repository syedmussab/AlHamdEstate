import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { StockTransfersService } from "./stock-transfers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreateTransferDto } from "./dto/transfer.dto";
import { IsOptional, IsString } from "class-validator";

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api/stock-transfers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockTransfersController {
  constructor(private readonly service: StockTransfersService) {}

  @Get()
  @RequirePermissions("stock.transfer")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("stock.transfer")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("stock.transfer")
  create(@Body() dto: CreateTransferDto, @CurrentUser("id") userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(":id/confirm")
  @RequirePermissions("stock.transfer")
  confirm(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.confirm(id, userId);
  }

  @Patch(":id/cancel")
  @RequirePermissions("stock.transfer")
  cancel(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.cancel(id, userId);
  }
}
