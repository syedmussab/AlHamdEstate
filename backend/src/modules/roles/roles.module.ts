import { Module } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { PermissionsController } from "../permissions/permissions.controller";
import { PermissionsService } from "../permissions/permissions.service";
import { AuditLogsController } from "../audit-logs/audit-logs.controller";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Module({
  controllers: [RolesController, PermissionsController, AuditLogsController],
  providers: [RolesService, PermissionsService, AuditLogsService],
})
export class RolesModule {}
