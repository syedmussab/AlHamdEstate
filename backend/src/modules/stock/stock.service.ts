import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StockService } from "../../common/services/stock.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma, StockMovementType } from "../../generated/prisma/client";

@Injectable()
export class StockModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService
  ) {}

  async findAll(dto: PaginationDto & { warehouseId?: string; productId?: string; lowStock?: string }) {
    const where: Prisma.StockWhereInput = {};
    if (dto.warehouseId) where.warehouseId = dto.warehouseId;
    if (dto.productId) where.productId = dto.productId;
    if (dto.search) {
      where.product = { name: { contains: dto.search, mode: "insensitive" } };
    }

    const [total, data] = await Promise.all([
      this.prisma.stock.count({ where }),
      this.prisma.stock.findMany({
        where,
        orderBy: { quantity: "asc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              sellingPrice: true,
              costPrice: true,
              minStockLevel: true,
              isActive: true,
              unit: { select: { name: true, code: true } },
              category: { select: { name: true } },
            },
          },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    return paginate(data, total, dto);
  }

  async lowStock(dto: PaginationDto) {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        unit: { select: { name: true, code: true } },
        stock: {
          select: {
            quantity: true,
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    });

    const data = products.flatMap((p) =>
      p.stock
        .filter((s) => s.quantity <= p.minStockLevel)
        .map((s) => ({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          unit: p.unit?.code ?? "",
          minStockLevel: p.minStockLevel,
          currentStock: s.quantity,
          warehouse: s.warehouse.name,
        }))
    );

    const total = data.length;
    const sliced = data.slice(dto.skip, dto.skip + dto.limit);
    return paginate(sliced, total, dto);
  }

  async adjust(dto: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reason?: string;
  }, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.stockService.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        type: dto.quantity >= 0 ? StockMovementType.ADJUSTMENT : StockMovementType.ADJUSTMENT,
        referenceType: "ADJUSTMENT",
        note: dto.reason,
        userId,
      });
    });

    return { message: "Stock adjusted" };
  }

  async getMovements(dto: PaginationDto & { productId?: string; warehouseId?: string; type?: string; from?: string; to?: string }) {
    const where: Prisma.StockMovementWhereInput = {};
    if (dto.productId) where.productId = dto.productId;
    if (dto.warehouseId) where.warehouseId = dto.warehouseId;
    if (dto.type) where.type = dto.type as StockMovementType;
    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) where.createdAt.gte = new Date(dto.from);
      if (dto.to) where.createdAt.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return paginate(data, total, dto);
  }
}
