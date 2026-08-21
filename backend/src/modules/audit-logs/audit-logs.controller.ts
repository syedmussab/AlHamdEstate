import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsOptional, IsString } from "class-validator";

class AuditQueryDto extends PaginationDto {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller("api/audit-logs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions("auditlogs.read")
  findAll(@Query() query: AuditQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
