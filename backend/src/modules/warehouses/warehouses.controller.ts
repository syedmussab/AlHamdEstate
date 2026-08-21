import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { WarehousesService } from "./warehouses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

class WarehouseDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() code: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class UpdateWarehouseDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @IsNotEmpty() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() isActive?: string;
}

@Controller("api/warehouses")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @RequirePermissions("warehouses.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("warehouses.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/stock")
  @RequirePermissions("stock.read")
  getStock(@Param("id") id: string, @Query() query: PaginationDto) {
    return this.service.getStock(id, query);
  }

  @Post()
  @RequirePermissions("warehouses.create")
  create(@Body() dto: WarehouseDto, @CurrentUser("id") actorId: string) {
    return this.service.create(dto, actorId);
  }

  @Patch(":id")
  @RequirePermissions("warehouses.update")
  update(@Param("id") id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser("id") actorId: string) {
    return this.service.update(id, dto, actorId);
  }

  @Delete(":id")
  @RequirePermissions("warehouses.delete")
  remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.service.remove(id, actorId);
  }
}
