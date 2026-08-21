import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StockService } from "../../common/services/stock.service";
import { AuditService } from "../../common/services/audit.service";
import { generateRef } from "../../common/utils/ref.util";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma, PurchaseStatus, StockMovementType } from "../../generated/prisma/client";
import { CreatePurchaseDto, UpdatePurchaseDto } from "./dto/purchase.dto";

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly audit: AuditService
  ) {}

  private compute(items: { productId: string; quantity: number; costPrice: number }[], discount = 0, tax = 0) {
    const lineItems = items.map((i) => ({
      ...i,
      total: Number((i.quantity * i.costPrice).toFixed(2)),
    }));
    const subTotal = lineItems.reduce((sum, i) => sum + i.total, 0);
    const total = subTotal - discount + (subTotal - discount) * (tax / 100);
    return {
      lineItems,
      subTotal: Number(subTotal.toFixed(2)),
      total: Number(total.toFixed(2)),
      dueAmount: Number(total.toFixed(2)),
    };
  }

  async findAll(dto: PaginationDto & { supplierId?: string; status?: string; from?: string; to?: string }) {
    const where: Prisma.PurchaseWhereInput = { deletedAt: null };
    if (dto.search) where.invoiceNo = { contains: dto.search, mode: "insensitive" };
    if (dto.supplierId) where.supplierId = dto.supplierId;
    if (dto.status) where.status = dto.status as PurchaseStatus;
    if (dto.from || dto.to) {
      where.purchaseDate = {};
      if (dto.from) where.purchaseDate.gte = new Date(dto.from);
      if (dto.to) where.purchaseDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        orderBy: { purchaseDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          warehouse: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, phone: true, address: true } },
        warehouse: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: { select: { code: true } } } } },
        },
        payments: { include: { user: { select: { name: true } } } },
      },
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    return purchase;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    const { lineItems, subTotal, total, dueAmount } = this.compute(dto.items, dto.discount ?? 0, dto.tax ?? 0);

    const purchase = await this.prisma.purchase.create({
      data: {
        invoiceNo: generateRef("PUR"),
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
        discount: dto.discount ?? 0,
        tax: dto.tax ?? 0,
        subTotal,
        total,
        dueAmount,
        note: dto.note,
        createdBy: userId,
        items: {
          create: lineItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            costPrice: i.costPrice,
            total: i.total,
          })),
        },
      },
    });

    await this.audit.log({
      userId,
      action: "PURCHASE_CREATE",
      entity: "Purchase",
      entityId: purchase.id,
      newValue: { invoiceNo: purchase.invoiceNo, total },
    });

    return this.findOne(purchase.id);
  }

  async update(id: string, dto: UpdatePurchaseDto, userId: string) {
    const existing = await this.findOne(id);
    if (existing.status !== "DRAFT") {
      throw new BadRequestException("Only draft purchases can be updated");
    }

    const items = dto.items ?? existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity, costPrice: Number(i.costPrice) }));
    const { lineItems, subTotal, total, dueAmount } = this.compute(items, dto.discount ?? Number(existing.discount), dto.tax ?? Number(existing.tax));

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.update({
        where: { id },
        data: {
          supplierId: dto.supplierId ?? existing.supplierId,
          warehouseId: dto.warehouseId === undefined ? existing.warehouseId : dto.warehouseId,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : existing.purchaseDate,
          discount: dto.discount ?? existing.discount,
          tax: dto.tax ?? existing.tax,
          subTotal,
          total,
          paidAmount: existing.paidAmount,
          dueAmount,
          note: dto.note === undefined ? existing.note : dto.note,
          items: {
            create: lineItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              costPrice: i.costPrice,
              total: i.total,
            })),
          },
        },
      });
    });

    await this.audit.log({
      userId,
      action: "PURCHASE_UPDATE",
      entity: "Purchase",
      entityId: id,
      oldValue: { invoiceNo: existing.invoiceNo, total: Number(existing.total) },
      newValue: { total },
    });

    return this.findOne(id);
  }

  async confirm(id: string, userId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    if (purchase.status !== "DRAFT") {
      throw new BadRequestException("Only draft purchases can be confirmed");
    }
    if (!purchase.warehouseId) {
      throw new BadRequestException("Purchase needs a warehouse to add stock");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await this.stockService.applyMovement(tx, {
          productId: item.productId,
          warehouseId: purchase.warehouseId as string,
          quantity: item.quantity,
          type: StockMovementType.PURCHASE,
          referenceType: "Purchase",
          referenceId: purchase.id,
          note: `Stock added from purchase ${purchase.invoiceNo}`,
          userId,
        });
      }
      await tx.purchase.update({
        where: { id },
        data: { status: PurchaseStatus.CONFIRMED },
      });
    });

    await this.audit.log({
      userId,
      action: "PURCHASE_CONFIRM",
      entity: "Purchase",
      entityId: id,
      newValue: { invoiceNo: purchase.invoiceNo, items: purchase.items.length },
    });

    return this.findOne(id);
  }

  async cancel(id: string, userId: string) {
    const purchase = await this.findOne(id);
    if (purchase.status === "CANCELLED") throw new BadRequestException("Purchase already cancelled");
    if (purchase.status === "CONFIRMED" || purchase.status === "COMPLETED") {
      throw new BadRequestException("Confirmed purchases cannot be cancelled; create a purchase return instead");
    }

    await this.prisma.purchase.update({ where: { id }, data: { status: PurchaseStatus.CANCELLED } });
    await this.audit.log({
      userId,
      action: "PURCHASE_CANCEL",
      entity: "Purchase",
      entityId: id,
    });

    return this.findOne(id);
  }
}
