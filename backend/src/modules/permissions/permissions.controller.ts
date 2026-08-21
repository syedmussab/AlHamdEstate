import { Controller, Get, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";

@Controller("api/permissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("roles.read")
  findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { name: "asc" }],
    });
  }
}
