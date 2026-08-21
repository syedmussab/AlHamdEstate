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
import { ProductsService } from "./products.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() sku: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() plotNo?: string;
  @IsOptional() @IsString() block?: string;
  @IsOptional() @Type(() => Number) @IsNumber() area?: number;
  @IsOptional() @IsString() facing?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellingPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minStockLevel?: number;
  @IsOptional() @IsString() isActive?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() unitId?: string;
}

class UpdateProductDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() plotNo?: string;
  @IsOptional() @IsString() block?: string;
  @IsOptional() @Type(() => Number) @IsNumber() area?: number;
  @IsOptional() @IsString() facing?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellingPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minStockLevel?: number;
  @IsOptional() @IsString() isActive?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() unitId?: string;
}

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() isActive?: string;
}

@Controller("api/products")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @RequirePermissions("products.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("products.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/stock")
  @RequirePermissions("products.read")
  getStock(@Param("id") id: string) {
    return this.service.getStock(id);
  }

  @Get(":id/movements")
  @RequirePermissions("stock.movements")
  getMovements(@Param("id") id: string, @Query() query: PaginationDto) {
    return this.service.getMovements(id, query);
  }

  @Post()
  @RequirePermissions("products.create")
  create(@Body() dto: CreateProductDto, @CurrentUser("id") actorId: string) {
    return this.service.create(dto, actorId);
  }

  @Patch(":id")
  @RequirePermissions("products.update")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto, @CurrentUser("id") actorId: string) {
    return this.service.update(id, dto, actorId);
  }

  @Delete(":id")
  @RequirePermissions("products.delete")
  remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.service.remove(id, actorId);
  }
}
