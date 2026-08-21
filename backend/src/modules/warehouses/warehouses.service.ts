import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(dto: PaginationDto & { isActive?: string }) {
    const where: Prisma.WarehouseWhereInput = { deletedAt: null };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: "insensitive" } },
        { code: { contains: dto.search, mode: "insensitive" } },
      ];
    }
    if (dto.isActive !== undefined && dto.isActive !== "") {
      where.isActive = dto.isActive === "true";
    }

    const [total, data] = await Promise.all([
      this.prisma.warehouse.count({ where }),
      this.prisma.warehouse.findMany({
        where,
        orderBy: { [dto.sortBy ?? "createdAt"]: dto.sortOrder === "asc" ? "asc" : "desc" },
        skip: dto.skip,
        take: dto.limit,
      }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException("Warehouse not found");
    return warehouse;
  }

  async create(dto: any, actorId: string) {
    const warehouse = await this.prisma.warehouse.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: "WAREHOUSE_CREATE",
      entity: "Warehouse",
      entityId: warehouse.id,
      newValue: dto,
    });
    return warehouse;
  }

  async update(id: string, dto: any, actorId: string) {
    const existing = await this.findOne(id);
    const warehouse = await this.prisma.warehouse.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: "WAREHOUSE_UPDATE",
      entity: "Warehouse",
      entityId: id,
      oldValue: existing,
      newValue: dto,
    });
    return warehouse;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findOne(id);
    await this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: "WAREHOUSE_DELETE",
      entity: "Warehouse",
      entityId: id,
      oldValue: existing,
    });
    return { message: "Warehouse deleted" };
  }

  async getStock(id: string, dto: PaginationDto & { search?: string }) {
    const where: Prisma.StockWhereInput = { warehouseId: id };
    if (dto.search) {
      where.product = { name: { contains: dto.search, mode: "insensitive" } };
    }

    const [total, data] = await Promise.all([
      this.prisma.stock.count({ where }),
      this.prisma.stock.findMany({
        where,
        orderBy: { quantity: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              sellingPrice: true,
              minStockLevel: true,
              unit: { select: { name: true, code: true } },
            },
          },
        },
      }),
    ]);

    return paginate(data, total, dto);
  }
}
