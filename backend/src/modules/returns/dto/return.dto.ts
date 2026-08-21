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

export class ReturnItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
}

export class CreatePurchaseReturnDto {
  @IsString() @IsNotEmpty() purchaseId: string;
  @IsOptional() @IsDateString() returnDate?: string;
  @IsOptional() @IsString() reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}

export class CreateSaleReturnDto {
  @IsString() @IsNotEmpty() saleId: string;
  @IsOptional() @IsDateString() returnDate?: string;
  @IsOptional() @IsString() reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
