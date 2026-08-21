import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        users: { select: { userId: true } },
        permissions: { select: { permissionId: true } },
      },
    });
  }

  async create(dto: { name: string; description?: string }, actorId: string) {
    const role = await this.prisma.role.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: "ROLE_CREATE",
      entity: "Role",
      entityId: role.id,
      newValue: dto,
    });
    return role;
  }

  async update(id: string, dto: { name?: string; description?: string }, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("Role not found");

    const updated = await this.prisma.role.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: "ROLE_UPDATE",
      entity: "Role",
      entityId: id,
      oldValue: { name: role.name },
      newValue: dto,
    });
    return updated;
  }

  async remove(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException("Role not found");
    if (role.isSystem) throw new BadRequestException("Cannot delete a system role");
    if (role._count.users > 0) throw new BadRequestException("Cannot delete a role assigned to users");

    await this.prisma.role.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: "ROLE_DELETE",
      entity: "Role",
      entityId: id,
      oldValue: { name: role.name },
    });
    return { message: "Role deleted" };
  }

  async setPermissions(id: string, permissionIds: string[], actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("Role not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    });

    await this.audit.log({
      userId: actorId,
      action: "ROLE_PERMISSIONS",
      entity: "Role",
      entityId: id,
      newValue: { permissionIds },
    });

    return this.findAll().then((roles) => roles.find((r) => r.id === id));
  }
}
