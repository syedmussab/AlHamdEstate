import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: PaginationDto & { action?: string; entity?: string; userId?: string; from?: string; to?: string }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (dto.action) where.action = { contains: dto.action, mode: "insensitive" };
    if (dto.entity) where.entity = { contains: dto.entity, mode: "insensitive" };
    if (dto.userId) where.userId = dto.userId;

    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) where.createdAt.gte = new Date(dto.from);
      if (dto.to) where.createdAt.lte = new Date(dto.to);
    }

    const orderBy: Prisma.AuditLogOrderByWithRelationInput = {
      [dto.sortBy ?? "createdAt"]: dto.sortOrder === "asc" ? "asc" : "desc",
    };

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip: dto.skip,
        take: dto.limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    return paginate(logs, total, dto);
  }
}
