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

export class PurchaseItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) costPrice: number;
}

export class CreatePurchaseDto {
  @IsString() @IsNotEmpty() supplierId: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class UpdatePurchaseDto {
  @IsOptional() @IsString() @IsNotEmpty() supplierId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];
}

export interface ComputedItem {
  productId: string;
  quantity: number;
  costPrice: number;
  total: number;
}
