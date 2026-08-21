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
import { Prisma, StockMovementType, TransferStatus } from "../../generated/prisma/client";
import { CreateTransferDto } from "./dto/transfer.dto";

@Injectable()
export class StockTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly audit: AuditService
  ) {}

  async create(dto: CreateTransferDto, userId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException("Source and destination warehouses must differ");
    }

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNo: generateRef("TRF"),
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        transferDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
        note: dto.note,
        createdBy: userId,
        items: {
          create: dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
    });

    await this.audit.log({
      userId,
      action: "TRANSFER_CREATE",
      entity: "StockTransfer",
      entityId: transfer.id,
      newValue: { transferNo: transfer.transferNo },
    });

    return this.findOne(transfer.id);
  }

  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        createdByUser: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: { select: { code: true } } } } },
        },
      },
    });
    if (!transfer) throw new NotFoundException("Stock transfer not found");
    return transfer;
  }

  async findAll(dto: PaginationDto & { status?: string; from?: string; to?: string }) {
    const where: Prisma.StockTransferWhereInput = {};
    if (dto.status) where.status = dto.status as TransferStatus;
    if (dto.from || dto.to) {
      where.transferDate = {};
      if (dto.from) where.transferDate.gte = new Date(dto.from);
      if (dto.to) where.transferDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.stockTransfer.count({ where }),
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }

  async confirm(id: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException("Stock transfer not found");
    if (transfer.status !== "PENDING") {
      throw new BadRequestException("Only pending transfers can be confirmed");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        await this.stockService.applyMovement(tx, {
          productId: item.productId,
          warehouseId: transfer.fromWarehouseId,
          quantity: -item.quantity,
          type: StockMovementType.TRANSFER_OUT,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          note: `Transferred to ${transfer.toWarehouseId} on ${transfer.transferNo}`,
          userId,
        });
      }
      for (const item of transfer.items) {
        await this.stockService.applyMovement(tx, {
          productId: item.productId,
          warehouseId: transfer.toWarehouseId,
          quantity: item.quantity,
          type: StockMovementType.TRANSFER_IN,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          note: `Received from ${transfer.fromWarehouseId} on ${transfer.transferNo}`,
          userId,
        });
      }
      await tx.stockTransfer.update({
        where: { id },
        data: { status: TransferStatus.CONFIRMED },
      });
    });

    await this.audit.log({
      userId,
      action: "TRANSFER_CONFIRM",
      entity: "StockTransfer",
      entityId: id,
      newValue: { transferNo: transfer.transferNo },
    });

    return this.findOne(id);
  }

  async cancel(id: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException("Stock transfer not found");
    if (transfer.status !== "PENDING") {
      throw new BadRequestException("Only pending transfers can be cancelled");
    }

    await this.prisma.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    });

    await this.audit.log({
      userId,
      action: "TRANSFER_CANCEL",
      entity: "StockTransfer",
      entityId: id,
    });

    return this.findOne(id);
  }
}
