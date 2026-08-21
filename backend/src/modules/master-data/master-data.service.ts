import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

export interface MasterDataDto {
  name: string;
  description?: string;
  isActive?: boolean;
  code?: string;
}

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private model(name: "category" | "brand" | "unit") {
    return {
      category: this.prisma.category,
      brand: this.prisma.brand,
      unit: this.prisma.unit,
    }[name];
  }

  async findAll(
    model: "category" | "brand" | "unit",
    dto: PaginationDto & { isActive?: string }
  ) {
    const where: Prisma.CategoryWhereInput & Prisma.BrandWhereInput & Prisma.UnitWhereInput = {};
    if ((model === "category" || model === "brand") && dto.search) {
      (where as any).OR = [{ name: { contains: dto.search, mode: "insensitive" } }];
    }
    if (dto.search) where.name = { contains: dto.search, mode: "insensitive" };

    if (dto.isActive !== undefined && dto.isActive !== "") {
      where.isActive = dto.isActive === "true";
    }

    const db = this.model(model) as any;
    const [total, data] = await Promise.all([
      db.count({ where }),
      db.findMany({
        where,
        orderBy: { [dto.sortBy ?? "createdAt"]: dto.sortOrder === "asc" ? "asc" : "desc" },
        skip: dto.skip,
        take: dto.limit,
      }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(model: "category" | "brand" | "unit", id: string) {
    const db = this.model(model) as any;
    const record = await db.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`${model} not found`);
    return record;
  }

  async create(model: "category" | "brand" | "unit", dto: MasterDataDto, actorId: string) {
    const db = this.model(model) as any;
    const data: any = {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    };
    if (model === "unit" && dto.code) data.code = dto.code;
    const record = await db.create({ data });
    await this.audit.log({
      userId: actorId,
      action: `${model.toUpperCase()}_CREATE`,
      entity: model,
      entityId: record.id,
      newValue: data,
    });
    return record;
  }

  async update(
    model: "category" | "brand" | "unit",
    id: string,
    dto: Partial<MasterDataDto>,
    actorId: string
  ) {
    const db = this.model(model) as any;
    const existing = await db.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`${model} not found`);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (model === "unit" && dto.code) data.code = dto.code;

    const record = await db.update({ where: { id }, data });
    await this.audit.log({
      userId: actorId,
      action: `${model.toUpperCase()}_UPDATE`,
      entity: model,
      entityId: id,
      oldValue: existing,
      newValue: data,
    });
    return record;
  }

  async remove(model: "category" | "brand" | "unit", id: string, actorId: string) {
    const db = this.model(model) as any;
    const existing = await db.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`${model} not found`);

    if (model === "unit") {
      await db.delete({ where: { id } });
    } else {
      await db.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    }

    await this.audit.log({
      userId: actorId,
      action: `${model.toUpperCase()}_DELETE`,
      entity: model,
      entityId: id,
      oldValue: existing,
    });
    return { message: `${model} deleted` };
  }
}
