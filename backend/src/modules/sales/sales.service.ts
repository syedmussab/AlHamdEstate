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
import { Prisma, SaleStatus, StockMovementType } from "../../generated/prisma/client";
import { CreateSaleDto, UpdateSaleDto } from "./dto/sale.dto";

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly audit: AuditService
  ) {}

  private compute(items: { productId: string; quantity: number; sellingPrice: number }[], discount = 0, tax = 0) {
    const lineItems = items.map((i) => ({
      ...i,
      total: Number((i.quantity * i.sellingPrice).toFixed(2)),
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

  async findAll(dto: PaginationDto & { customerId?: string; status?: string; from?: string; to?: string }) {
    const where: Prisma.SaleWhereInput = { deletedAt: null };
    if (dto.search) where.invoiceNo = { contains: dto.search, mode: "insensitive" };
    if (dto.customerId) where.customerId = dto.customerId;
    if (dto.status) where.status = dto.status as SaleStatus;
    if (dto.from || dto.to) {
      where.saleDate = {};
      if (dto.from) where.saleDate.gte = new Date(dto.from);
      if (dto.to) where.saleDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        orderBy: { saleDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          warehouse: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true } },
        warehouse: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: { select: { code: true } } } } },
        },
        payments: { include: { user: { select: { name: true } } } },
      },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    return sale;
  }

  async create(dto: CreateSaleDto, userId: string) {
    const { lineItems, subTotal, total, dueAmount } = this.compute(dto.items, dto.discount ?? 0, dto.tax ?? 0);

    const sale = await this.prisma.sale.create({
      data: {
        invoiceNo: generateRef("SAL"),
        customerId: dto.customerId,
        warehouseId: dto.warehouseId,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
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
            sellingPrice: i.sellingPrice,
            total: i.total,
          })),
        },
      },
    });

    await this.audit.log({
      userId,
      action: "SALE_CREATE",
      entity: "Sale",
      entityId: sale.id,
      newValue: { invoiceNo: sale.invoiceNo, total },
    });

    return this.findOne(sale.id);
  }

  async update(id: string, dto: UpdateSaleDto, userId: string) {
    const existing = await this.findOne(id);
    if (existing.status !== "DRAFT") {
      throw new BadRequestException("Only draft sales can be updated");
    }

    const items = dto.items ?? existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity, sellingPrice: Number(i.sellingPrice) }));
    const { lineItems, subTotal, total, dueAmount } = this.compute(items, dto.discount ?? Number(existing.discount), dto.tax ?? Number(existing.tax));

    await this.prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.update({
        where: { id },
        data: {
          customerId: dto.customerId ?? existing.customerId,
          warehouseId: dto.warehouseId === undefined ? existing.warehouseId : dto.warehouseId,
          saleDate: dto.saleDate ? new Date(dto.saleDate) : existing.saleDate,
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
              sellingPrice: i.sellingPrice,
              total: i.total,
            })),
          },
        },
      });
    });

    await this.audit.log({
      userId,
      action: "SALE_UPDATE",
      entity: "Sale",
      entityId: id,
      oldValue: { invoiceNo: existing.invoiceNo, total: Number(existing.total) },
      newValue: { total },
    });

    return this.findOne(id);
  }

  async confirm(id: string, userId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    if (sale.status !== "DRAFT") {
      throw new BadRequestException("Only draft sales can be confirmed");
    }
    if (!sale.warehouseId) {
      throw new BadRequestException("Sale needs a warehouse to deduct stock");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await this.stockService.applyMovement(tx, {
          productId: item.productId,
          warehouseId: sale.warehouseId as string,
          quantity: -item.quantity,
          type: StockMovementType.SALE,
          referenceType: "Sale",
          referenceId: sale.id,
          note: `Stock deducted for sale ${sale.invoiceNo}`,
          userId,
        });
      }
      await tx.sale.update({
        where: { id },
        data: { status: SaleStatus.CONFIRMED },
      });
    });

    await this.audit.log({
      userId,
      action: "SALE_CONFIRM",
      entity: "Sale",
      entityId: id,
      newValue: { invoiceNo: sale.invoiceNo, items: sale.items.length },
    });

    return this.findOne(id);
  }

  async cancel(id: string, userId: string) {
    const sale = await this.findOne(id);
    if (sale.status === "CANCELLED") throw new BadRequestException("Sale already cancelled");
    if (sale.status === "CONFIRMED" || sale.status === "COMPLETED") {
      throw new BadRequestException("Confirmed sales cannot be cancelled; create a sale return instead");
    }

    await this.prisma.sale.update({ where: { id }, data: { status: SaleStatus.CANCELLED } });
    await this.audit.log({
      userId,
      action: "SALE_CANCEL",
      entity: "Sale",
      entityId: id,
    });

    return this.findOne(id);
  }
}
