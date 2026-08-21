import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreatePaymentDto {
  @IsIn(["RECEIVED", "PAID"])
  type: "RECEIVED" | "PAID";

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsIn(["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"])
  method?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional() @IsString() purchaseId?: string;
  @IsOptional() @IsString() saleId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() note?: string;
}
