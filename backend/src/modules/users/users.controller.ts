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
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { IsBoolean, IsOptional } from "class-validator";
import { Type } from "class-transformer";

class UserQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: string;
}

@Controller("api/users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions("users.read")
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("users.read")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions("users.create")
  create(@Body() dto: CreateUserDto, @CurrentUser("id") actorId: string) {
    return this.usersService.create(dto, actorId);
  }

  @Patch(":id")
  @RequirePermissions("users.update")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser("id") actorId: string) {
    return this.usersService.update(id, dto, actorId);
  }

  @Patch(":id/status")
  @RequirePermissions("users.update")
  setStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
    @CurrentUser("id") actorId: string
  ) {
    return this.usersService.setStatus(id, isActive, actorId);
  }

  @Delete(":id")
  @RequirePermissions("users.delete")
  remove(@Param("id") id: string, @CurrentUser("id") actorId: string) {
    return this.usersService.remove(id, actorId);
  }
}
