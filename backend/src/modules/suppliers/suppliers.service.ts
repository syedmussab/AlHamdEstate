import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(dto: PaginationDto & { isActive?: string }) {
    const where: Prisma.SupplierWhereInput = { deletedAt: null };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: "insensitive" } },
        { phone: { contains: dto.search } },
        { contactPerson: { contains: dto.search, mode: "insensitive" } },
      ];
    }
    if (dto.isActive !== undefined && dto.isActive !== "") {
      where.isActive = dto.isActive === "true";
    }

    const [total, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { [dto.sortBy ?? "createdAt"]: dto.sortOrder === "asc" ? "asc" : "desc" },
        skip: dto.skip,
        take: dto.limit,
      }),
    ]);

    return paginate(suppliers, total, dto);
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException("Supplier not found");
    return supplier;
  }

  async create(dto: any, actorId: string) {
    const supplier = await this.prisma.supplier.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: "SUPPLIER_CREATE",
      entity: "Supplier",
      entityId: supplier.id,
      newValue: dto,
    });
    return supplier;
  }

  async update(id: string, dto: any, actorId: string) {
    const existing = await this.findOne(id);
    const supplier = await this.prisma.supplier.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: "SUPPLIER_UPDATE",
      entity: "Supplier",
      entityId: id,
      oldValue: existing,
      newValue: dto,
    });
    return supplier;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findOne(id);
    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: "SUPPLIER_DELETE",
      entity: "Supplier",
      entityId: id,
      oldValue: existing,
    });
    return { message: "Supplier deleted" };
  }

  async getPurchases(id: string, dto: PaginationDto) {
    const where: Prisma.PurchaseWhereInput = { supplierId: id, deletedAt: null };
    const [total, data] = await Promise.all([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        orderBy: { purchaseDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          items: { select: { id: true, productId: true, quantity: true, costPrice: true, total: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }

  async getBalance(id: string) {
    const [totalPurchases, totalPaid] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { supplierId: id, status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null },
        _sum: { total: true },
      }),
      this.prisma.payment.aggregate({
        where: { supplierId: id, type: "PAID" },
        _sum: { amount: true },
      }),
    ]);

    const purchases = Number(totalPurchases._sum.total ?? 0);
    const paid = Number(totalPaid._sum.amount ?? 0);

    return { supplierId: id, totalPurchases: purchases, totalPaid: paid, balanceDue: purchases - paid };
  }
}
