import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(dto: PaginationDto & { categoryId?: string; brandId?: string; isActive?: string }) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: "insensitive" } },
        { sku: { contains: dto.search, mode: "insensitive" } },
        { plotNo: { contains: dto.search, mode: "insensitive" } },
        { block: { contains: dto.search, mode: "insensitive" } },
      ];
    }
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.brandId) where.brandId = dto.brandId;
    if (dto.isActive !== undefined && dto.isActive !== "") {
      where.isActive = dto.isActive === "true";
    }

    const sortable = ["name", "sku", "costPrice", "sellingPrice", "createdAt"].includes(dto.sortBy ?? "");
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortable ? (dto.sortBy as string) : "createdAt"]: dto.sortOrder === "asc" ? "asc" : "desc",
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: dto.skip,
        take: dto.limit,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, code: true } },
          stock: { select: { warehouseId: true, quantity: true, warehouse: { select: { name: true } } } },
        },
      }),
    ]);

    const data = products.map((p) => ({
      ...p,
      totalStock: p.stock.reduce((sum, s) => sum + s.quantity, 0),
      stockValue: p.stock.reduce((sum, s) => sum + s.quantity * Number(p.costPrice), 0),
    }));

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, code: true } },
        stock: {
          select: {
            warehouseId: true,
            quantity: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return {
      ...product,
      totalStock: product.stock.reduce((sum, s) => sum + s.quantity, 0),
      stockValue: product.stock.reduce((sum, s) => sum + s.quantity * Number(product.costPrice), 0),
    };
  }

  async create(dto: any, actorId: string) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        description: dto.description,
        imageUrl: dto.imageUrl,
        plotNo: dto.plotNo,
        block: dto.block,
        area: dto.area,
        facing: dto.facing,
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice ?? 0,
        minStockLevel: dto.minStockLevel ?? 0,
        isActive: dto.isActive === undefined || dto.isActive === "" ? true : dto.isActive === "true" || dto.isActive === true,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        unitId: dto.unitId,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      newValue: dto,
    });

    return this.findOne(product.id);
  }

  async update(id: string, dto: any, actorId: string) {
    const existing = await this.findOne(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        barcode: dto.barcode,
        description: dto.description,
        imageUrl: dto.imageUrl,
        plotNo: dto.plotNo,
        block: dto.block,
        area: dto.area,
        facing: dto.facing,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        minStockLevel: dto.minStockLevel,
        isActive:
          dto.isActive === undefined || dto.isActive === ""
            ? undefined
            : dto.isActive === "true" || dto.isActive === true,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        unitId: dto.unitId,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: "PRODUCT_UPDATE",
      entity: "Product",
      entityId: id,
      oldValue: { name: existing.name, costPrice: existing.costPrice, sellingPrice: existing.sellingPrice },
      newValue: dto,
    });

    return this.findOne(product.id);
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: "PRODUCT_DELETE",
      entity: "Product",
      entityId: id,
      oldValue: { name: existing.name, sku: existing.sku },
    });
    return { message: "Product deleted" };
  }

  async getStock(id: string) {
    await this.findOne(id);
    return this.prisma.stock.findMany({
      where: { productId: id },
      include: { warehouse: { select: { id: true, name: true, code: true } } },
      orderBy: { quantity: "desc" },
    });
  }

  async getMovements(id: string, dto: PaginationDto) {
    const where: Prisma.StockMovementWhereInput = { productId: id };
    const [total, data] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          warehouse: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }
}
