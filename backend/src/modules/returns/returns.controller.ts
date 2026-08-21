import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReturnsService } from "./returns.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreatePurchaseReturnDto, CreateSaleReturnDto } from "./dto/return.dto";
import { IsOptional, IsString } from "class-validator";

class PurchaseReturnQueryDto extends PaginationDto {
  @IsOptional() @IsString() purchaseId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

class SaleReturnQueryDto extends PaginationDto {
  @IsOptional() @IsString() saleId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Post("purchase-returns")
  @RequirePermissions("returns.create")
  createPurchaseReturn(@Body() dto: CreatePurchaseReturnDto, @CurrentUser("id") userId: string) {
    return this.service.createPurchaseReturn(dto, userId);
  }

  @Get("purchase-returns")
  @RequirePermissions("returns.read")
  findAllPurchaseReturns(@Query() query: PurchaseReturnQueryDto) {
    return this.service.findAllPurchaseReturns(query);
  }

  @Get("purchase-returns/:id")
  @RequirePermissions("returns.read")
  findPurchaseReturn(@Param("id") id: string) {
    return this.service.findPurchaseReturn(id);
  }

  @Post("sale-returns")
  @RequirePermissions("returns.create")
  createSaleReturn(@Body() dto: CreateSaleReturnDto, @CurrentUser("id") userId: string) {
    return this.service.createSaleReturn(dto, userId);
  }

  @Get("sale-returns")
  @RequirePermissions("returns.read")
  findAllSaleReturns(@Query() query: SaleReturnQueryDto) {
    return this.service.findAllSaleReturns(query);
  }

  @Get("sale-returns/:id")
  @RequirePermissions("returns.read")
  findSaleReturn(@Param("id") id: string) {
    return this.service.findSaleReturn(id);
  }
}
