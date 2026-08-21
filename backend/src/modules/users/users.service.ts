import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(dto: PaginationDto & { search?: string; isActive?: string }) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: "insensitive" } },
        { email: { contains: dto.search, mode: "insensitive" } },
        { phone: { contains: dto.search, mode: "insensitive" } },
      ];
    }
    if (dto.isActive !== undefined && dto.isActive !== "") {
      where.isActive = dto.isActive === "true";
    }

    const sortOrder = dto.sortOrder === "asc" ? "asc" : "desc";
    const orderBy: Prisma.UserOrderByWithRelationInput = { [dto.sortBy ?? "createdAt"]: sortOrder };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: dto.skip,
        take: dto.limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { select: { role: { select: { id: true, name: true } } } },
        },
      }),
    ]);

    return paginate(users, total, dto);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Email already registered");

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        roles:
          dto.roleIds && dto.roleIds.length > 0
            ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
            : undefined,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: "USER_CREATE",
      entity: "User",
      entityId: user.id,
      newValue: { email: user.email, roleIds: dto.roleIds },
    });

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }

    await this.prisma.user.update({ where: { id }, data });

    await this.audit.log({
      userId: actorId,
      action: "USER_UPDATE",
      entity: "User",
      entityId: id,
      oldValue: { name: user.name, isActive: user.isActive },
      newValue: dto,
    });

    return this.findOne(id);
  }

  async remove(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, refreshTokenHash: null },
    });

    await this.audit.log({
      userId: actorId,
      action: "USER_DELETE",
      entity: "User",
      entityId: id,
      oldValue: { email: user.email },
    });

    return { message: "User deleted" };
  }

  async setStatus(id: string, isActive: boolean, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.user.update({ where: { id }, data: { isActive } });
    await this.audit.log({
      userId: actorId,
      action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
      entity: "User",
      entityId: id,
    });
    return { message: isActive ? "User activated" : "User deactivated" };
  }
}
