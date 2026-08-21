import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class TransferItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
}

export class CreateTransferDto {
  @IsString() @IsNotEmpty() fromWarehouseId: string;
  @IsString() @IsNotEmpty() toWarehouseId: string;
  @IsOptional() @IsDateString() transferDate?: string;
  @IsOptional() @IsString() note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}
