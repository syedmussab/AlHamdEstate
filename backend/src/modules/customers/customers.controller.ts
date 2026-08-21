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
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

class CustomerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class UpdateCustomerDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @IsNotEmpty() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() isActive?: string;
}

@Controller("api/customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermissions("customers.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("customers.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/sales")
  @RequirePermissions("customers.read")
  getSales(@Param("id") id: string, @Query() query: PaginationDto) {
    return this.service.getSales(id, query);
  }

  @Get(":id/balance")
  @RequirePermissions("customers.read")
  getBalance(@Param("id") id: string) {
    return this.service.getBalance(id);
  }

  @Post()
  @RequirePermissions("customers.create")
  create(@Body() dto: CustomerDto, @CurrentUser("id") actorId: string) {
    return this.service.create(dto, actorId);
  }

  @Patch(":id")
  @RequirePermissions("customers.update")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @CurrentUser("id") actorId: string) {
    return this.service.update(id, dto, actorId);
  }

  @Delete(":id")
  @RequirePermissions("customers.delete")
  remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.service.remove(id, actorId);
  }
}
