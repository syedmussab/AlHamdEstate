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
import { MasterDataService, MasterDataDto } from "./master-data.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

class QueryDto extends PaginationDto {
  @IsOptional()
  isActive?: string;
}

export class MasterDataDtoImpl implements MasterDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMasterDataDto implements Partial<MasterDataDto> {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

function makeController(module: string, base: "categories" | "brands" | "units"): any {
  const modelKey = (module === "categories" ? "category" : module === "brands" ? "brand" : "unit") as
    | "category"
    | "brand"
    | "unit";
  @Controller(`api/${base}`)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  class MasterDataController {
    constructor(public readonly service: MasterDataService) {}

    @Get()
    @RequirePermissions(`${module}.read`)
    findAll(@Query() query: QueryDto) {
      return this.service.findAll(modelKey, query);
    }

    @Get(":id")
    @RequirePermissions(`${module}.read`)
    findOne(@Param("id") id: string) {
      return this.service.findOne(modelKey, id);
    }

    @Post()
    @RequirePermissions(`${module}.create`)
    create(@Body() dto: MasterDataDtoImpl, @CurrentUser("id") actorId: string) {
      return this.service.create(modelKey, dto, actorId);
    }

    @Patch(":id")
    @RequirePermissions(`${module}.update`)
    update(@Param("id") id: string, @Body() dto: UpdateMasterDataDto, @CurrentUser("id") actorId: string) {
      return this.service.update(modelKey, id, dto, actorId);
    }

    @Delete(":id")
    @RequirePermissions(`${module}.delete`)
    remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
      return this.service.remove(modelKey, id, actorId);
    }
  }
  return MasterDataController;
}

export const CategoriesController = makeController("categories", "categories");
export const BrandsController = makeController("brands", "brands");
export const UnitsController = makeController("units", "units");
