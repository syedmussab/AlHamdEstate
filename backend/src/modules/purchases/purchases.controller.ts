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
import { PurchasesService } from "./purchases.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreatePurchaseDto, UpdatePurchaseDto } from "./dto/purchase.dto";
import { IsOptional, IsString } from "class-validator";

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api/purchases")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  @RequirePermissions("purchases.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("purchases.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("purchases.create")
  create(@Body() dto: CreatePurchaseDto, @CurrentUser("id") userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(":id")
  @RequirePermissions("purchases.update")
  update(@Param("id") id: string, @Body() dto: UpdatePurchaseDto, @CurrentUser("id") userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Post(":id/confirm")
  @RequirePermissions("purchases.confirm")
  confirm(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.confirm(id, userId);
  }

  @Post(":id/cancel")
  @RequirePermissions("purchases.cancel")
  cancel(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.cancel(id, userId);
  }
}
