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
import { ExpensesService } from "./expenses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

class ExpenseCategoryDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

class ExpenseDto {
  @IsString() @IsNotEmpty() expenseCategoryId: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() expenseDate?: string;
  @IsOptional() @IsString() description?: string;
}

class QueryDto extends PaginationDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api/expenses")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get("categories")
  @RequirePermissions("expenses.read")
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Post("categories")
  @RequirePermissions("expenses.create")
  createCategory(@Body() dto: ExpenseCategoryDto, @CurrentUser("id") actorId: string) {
    return this.service.createCategory(dto, actorId);
  }

  @Patch("categories/:id")
  @RequirePermissions("expenses.update")
  updateCategory(@Param("id") id: string, @Body() dto: ExpenseCategoryDto, @CurrentUser("id") actorId: string) {
    return this.service.updateCategory(id, dto, actorId);
  }

  @Delete("categories/:id")
  @RequirePermissions("expenses.delete")
  removeCategory(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.service.removeCategory(id, actorId);
  }

  @Get("summary")
  @RequirePermissions("expenses.read")
  summary(@Query() query: QueryDto) {
    return this.service.summary(query);
  }

  @Get()
  @RequirePermissions("expenses.read")
  findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Post()
  @RequirePermissions("expenses.create")
  create(@Body() dto: ExpenseDto, @CurrentUser("id") userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(":id")
  @RequirePermissions("expenses.update")
  update(@Param("id") id: string, @Body() dto: ExpenseDto, @CurrentUser("id") userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Delete(":id")
  @RequirePermissions("expenses.delete")
  remove(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.remove(id, userId);
  }
}
