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
import { Prisma, StockMovementType } from "../../generated/prisma/client";
import { CreatePurchaseReturnDto, CreateSaleReturnDto } from "./dto/return.dto";

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly audit: AuditService
  ) {}

  // ============ PURCHASE RETURNS (goods back to supplier -> stock OUT) ============

  async createPurchaseReturn(dto: CreatePurchaseReturnDto, userId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: dto.purchaseId },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    if (!["CONFIRMED", "COMPLETED"].includes(purchase.status)) {
      throw new BadRequestException("Only confirmed purchases can be returned");
    }
    if (!purchase.warehouseId) {
      throw new BadRequestException("Purchase has no warehouse assigned");
    }

    // validate against original quantities and already-returned quantities
    const alreadyReturned = await this.prisma.purchaseReturnItem.groupBy({
      by: ["productId"],
      where: { purchaseReturn: { purchaseId: purchase.id } },
      _sum: { quantity: true },
    });

    const returnedMap = new Map(alreadyReturned.map((r) => [r.productId, r._sum.quantity ?? 0]));

    const items: { productId: string; quantity: number; costPrice: number; total: number }[] = [];
    for (const item of dto.items) {
      const orig = purchase.items.find((pi) => pi.productId === item.productId);
      if (!orig) throw new BadRequestException(`Product ${item.productId} not in this purchase`);
      const maxReturn = orig.quantity - (returnedMap.get(item.productId) ?? 0);
      if (item.quantity > maxReturn) {
        throw new BadRequestException(
          `Return quantity for product ${item.productId} exceeds allowed maximum (${maxReturn})`
        );
      }
      items.push({
        productId: item.productId,
        quantity: item.quantity,
        costPrice: item.unitPrice,
        total: Number((item.quantity * item.unitPrice).toFixed(2)),
      });
    }

    const total = Number(items.reduce((s, i) => s + i.total, 0).toFixed(2));

    const purchaseReturn = await this.prisma.purchaseReturn.create({
      data: {
        returnNo: generateRef("PRTN"),
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        warehouseId: purchase.warehouseId,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
        reason: dto.reason,
        total,
        createdBy: userId,
        items: { create: items },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await this.stockService.applyMovement(tx, {
          productId: item.productId,
          warehouseId: purchase.warehouseId as string,
          quantity: -item.quantity,
          type: StockMovementType.PURCHASE_RETURN,
          referenceType: "PurchaseReturn",
          referenceId: purchaseReturn.id,
          note: `Goods returned to supplier on ${purchaseReturn.returnNo}`,
          userId,
        });
      }
    });

    await this.audit.log({
      userId,
      action: "PURCHASE_RETURN_CREATE",
      entity: "PurchaseReturn",
      entityId: purchaseReturn.id,
      newValue: { returnNo: purchaseReturn.returnNo, total },
    });

    return this.findPurchaseReturn(purchaseReturn.id);
  }

  async findPurchaseReturn(id: string) {
    const ret = await this.prisma.purchaseReturn.findUnique({
      where: { id },
      include: {
        purchase: { select: { invoiceNo: true, purchaseDate: true } },
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: { select: { code: true } } } } },
        },
      },
    });
    if (!ret) throw new NotFoundException("Purchase return not found");
    return ret;
  }

  async findAllPurchaseReturns(dto: PaginationDto & { purchaseId?: string; from?: string; to?: string }) {
    const where: Prisma.PurchaseReturnWhereInput = {};
    if (dto.purchaseId) where.purchaseId = dto.purchaseId;
    if (dto.from || dto.to) {
      where.returnDate = {};
      if (dto.from) where.returnDate.gte = new Date(dto.from);
      if (dto.to) where.returnDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.purchaseReturn.count({ where }),
      this.prisma.purchaseReturn.findMany({
        where,
        orderBy: { returnDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          purchase: { select: { invoiceNo: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }

  // ============ SALE RETURNS (goods back from customer -> stock IN) ============

  async createSaleReturn(dto: CreateSaleReturnDto, userId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    if (!["CONFIRMED", "COMPLETED"].includes(sale.status)) {
      throw new BadRequestException("Only confirmed sales can be returned");
    }
    if (!sale.warehouseId) {
      throw new BadRequestException("Sale has no warehouse assigned");
    }

    const alreadyReturned = await this.prisma.saleReturnItem.groupBy({
      by: ["productId"],
      where: { saleReturn: { saleId: sale.id } },
      _sum: { quantity: true },
    });
    const returnedMap = new Map(alreadyReturned.map((r) => [r.productId, r._sum.quantity ?? 0]));

    const items: { productId: string; quantity: number; sellingPrice: number; total: number }[] = [];
    for (const item of dto.items) {
      const orig = sale.items.find((si) => si.productId === item.productId);
      if (!orig) throw new BadRequestException(`Product ${item.productId} not in this sale`);
      const maxReturn = orig.quantity - (returnedMap.get(item.productId) ?? 0);
      if (item.quantity > maxReturn) {
        throw new BadRequestException(
          `Return quantity for product ${item.productId} exceeds allowed maximum (${maxReturn})`
        );
      }
      items.push({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.unitPrice,
        total: Number((item.quantity * item.unitPrice).toFixed(2)),
      });
    }

    const total = Number(items.reduce((s, i) => s + i.total, 0).toFixed(2));

    const saleReturn = await this.prisma.saleReturn.create({
      data: {
        returnNo: generateRef("SRTN"),
        saleId: sale.id,
        customerId: sale.customerId,
        warehouseId: sale.warehouseId,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
        reason: dto.reason,
        total,
        createdBy: userId,
        items: { create: items },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await this.stockService.applyMovement(tx, {
          productId: item.productId,
          warehouseId: sale.warehouseId as string,
          quantity: item.quantity,
          type: StockMovementType.SALE_RETURN,
          referenceType: "SaleReturn",
          referenceId: saleReturn.id,
          note: `Goods returned by customer on ${saleReturn.returnNo}`,
          userId,
        });
      }
    });

    await this.audit.log({
      userId,
      action: "SALE_RETURN_CREATE",
      entity: "SaleReturn",
      entityId: saleReturn.id,
      newValue: { returnNo: saleReturn.returnNo, total },
    });

    return this.findSaleReturn(saleReturn.id);
  }

  async findSaleReturn(id: string) {
    const ret = await this.prisma.saleReturn.findUnique({
      where: { id },
      include: {
        sale: { select: { invoiceNo: true, saleDate: true } },
        customer: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: { select: { code: true } } } } },
        },
      },
    });
    if (!ret) throw new NotFoundException("Sale return not found");
    return ret;
  }

  async findAllSaleReturns(dto: PaginationDto & { saleId?: string; from?: string; to?: string }) {
    const where: Prisma.SaleReturnWhereInput = {};
    if (dto.saleId) where.saleId = dto.saleId;
    if (dto.from || dto.to) {
      where.returnDate = {};
      if (dto.from) where.returnDate.gte = new Date(dto.from);
      if (dto.to) where.returnDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.saleReturn.count({ where }),
      this.prisma.saleReturn.findMany({
        where,
        orderBy: { returnDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          sale: { select: { invoiceNo: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }
}
