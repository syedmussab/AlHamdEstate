import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreatePaymentDto } from "./dto/payment.dto";
import { IsOptional, IsString } from "class-validator";

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() purchaseId?: string;
  @IsOptional() @IsString() saleId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api/payments")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @RequirePermissions("payments.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("payments.read")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("payments.create")
  create(@Body() dto: CreatePaymentDto, @CurrentUser("id") userId: string) {
    return this.service.create(dto, userId);
  }
}
