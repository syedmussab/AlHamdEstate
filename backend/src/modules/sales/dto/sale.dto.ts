import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SaleItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) sellingPrice: number;
}

export class CreateSaleDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsDateString() saleDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}

export class UpdateSaleDto {
  @IsOptional() @IsString() @IsNotEmpty() customerId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsDateString() saleDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items?: SaleItemDto[];
}
