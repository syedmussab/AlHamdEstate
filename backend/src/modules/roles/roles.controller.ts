import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { RolesService } from "./roles.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayUnique } from "class-validator";

class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class AssignPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds: string[];
}

@Controller("api/roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions("roles.read")
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermissions("roles.create")
  create(@Body() dto: CreateRoleDto, @CurrentUser("id") actorId: string) {
    return this.rolesService.create(dto, actorId);
  }

  @Patch(":id")
  @RequirePermissions("roles.update")
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto, @CurrentUser("id") actorId: string) {
    return this.rolesService.update(id, dto, actorId);
  }

  @Delete(":id")
  @RequirePermissions("roles.delete")
  remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.rolesService.remove(id, actorId);
  }

  @Put(":id/permissions")
  @RequirePermissions("roles.assign_permissions")
  setPermissions(
    @Param("id") id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser("id") actorId: string
  ) {
    return this.rolesService.setPermissions(id, dto.permissionIds, actorId);
  }
}
