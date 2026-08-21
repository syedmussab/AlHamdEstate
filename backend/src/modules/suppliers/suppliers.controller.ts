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
import { SuppliersService } from "./suppliers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

class SupplierDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() paymentInfo?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class UpdateSupplierDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() @IsNotEmpty() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() paymentInfo?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() isActive?: string;
}

@Controller("api/suppliers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @RequirePermissions("suppliers.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("suppliers.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/purchases")
  @RequirePermissions("suppliers.read")
  getPurchases(@Param("id") id: string, @Query() query: PaginationDto) {
    return this.service.getPurchases(id, query);
  }

  @Get(":id/balance")
  @RequirePermissions("suppliers.read")
  getBalance(@Param("id") id: string) {
    return this.service.getBalance(id);
  }

  @Post()
  @RequirePermissions("suppliers.create")
  create(@Body() dto: SupplierDto, @CurrentUser("id") actorId: string) {
    return this.service.create(dto, actorId);
  }

  @Patch(":id")
  @RequirePermissions("suppliers.update")
  update(@Param("id") id: string, @Body() dto: UpdateSupplierDto, @CurrentUser("id") actorId: string) {
    return this.service.update(id, dto, actorId);
  }

  @Delete(":id")
  @RequirePermissions("suppliers.delete")
  remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.service.remove(id, actorId);
  }
}
