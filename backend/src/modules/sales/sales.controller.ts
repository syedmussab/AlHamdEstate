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
import { SalesService } from "./sales.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreateSaleDto, UpdateSaleDto } from "./dto/sale.dto";
import { IsOptional, IsString } from "class-validator";

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api/sales")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get()
  @RequirePermissions("sales.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("sales.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("sales.create")
  create(@Body() dto: CreateSaleDto, @CurrentUser("id") userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(":id")
  @RequirePermissions("sales.update")
  update(@Param("id") id: string, @Body() dto: UpdateSaleDto, @CurrentUser("id") userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Post(":id/confirm")
  @RequirePermissions("sales.confirm")
  confirm(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.confirm(id, userId);
  }

  @Post(":id/cancel")
  @RequirePermissions("sales.cancel")
  cancel(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.cancel(id, userId);
  }
}
