import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { generateRef } from "../../common/utils/ref.util";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";
import { CreatePaymentDto } from "./dto/payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(dto: CreatePaymentDto, userId: string) {
    const linkedIds = [dto.purchaseId, dto.saleId, dto.supplierId, dto.customerId].filter(Boolean);
    if (linkedIds.length === 0) {
      throw new BadRequestException("Link payment to a purchase, sale, supplier or customer");
    }

    return this.prisma.$transaction(async (tx) => {
      // validate purchase/sale amounts
      if (dto.purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: dto.purchaseId } });
        if (!purchase) throw new NotFoundException("Purchase not found");
        const newPaid = Number(purchase.paidAmount) + dto.amount;
        if (newPaid > Number(purchase.total) + 0.001) {
          throw new BadRequestException("Payment exceeds purchase total");
        }
        await tx.purchase.update({
          where: { id: dto.purchaseId },
          data: {
            paidAmount: newPaid,
            dueAmount: Number((Number(purchase.total) - newPaid).toFixed(2)),
            status: newPaid >= Number(purchase.total) ? "COMPLETED" : purchase.status,
          },
        });
      }

      if (dto.saleId) {
        const sale = await tx.sale.findUnique({ where: { id: dto.saleId } });
        if (!sale) throw new NotFoundException("Sale not found");
        const newPaid = Number(sale.paidAmount) + dto.amount;
        if (newPaid > Number(sale.total) + 0.001) {
          throw new BadRequestException("Payment exceeds sale total");
        }
        await tx.sale.update({
          where: { id: dto.saleId },
          data: {
            paidAmount: newPaid,
            dueAmount: Number((Number(sale.total) - newPaid).toFixed(2)),
            status: newPaid >= Number(sale.total) ? "COMPLETED" : sale.status,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          paymentNo: generateRef(dto.type === "RECEIVED" ? "RCP" : "PAY"),
          type: dto.type,
          amount: dto.amount,
          method: (dto.method as any) ?? "CASH",
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          purchaseId: dto.purchaseId,
          saleId: dto.saleId,
          supplierId: dto.supplierId,
          customerId: dto.customerId,
          note: dto.note,
          userId,
        },
      });

      return payment;
    });
  }

  async findAll(dto: PaginationDto & { type?: string; purchaseId?: string; saleId?: string; supplierId?: string; customerId?: string; from?: string; to?: string }) {
    const where: Prisma.PaymentWhereInput = {};
    if (dto.type) where.type = dto.type as any;
    if (dto.purchaseId) where.purchaseId = dto.purchaseId;
    if (dto.saleId) where.saleId = dto.saleId;
    if (dto.supplierId) where.supplierId = dto.supplierId;
    if (dto.customerId) where.customerId = dto.customerId;
    if (dto.from || dto.to) {
      where.paymentDate = {};
      if (dto.from) where.paymentDate.gte = new Date(dto.from);
      if (dto.to) where.paymentDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          purchase: { select: { invoiceNo: true } },
          sale: { select: { invoiceNo: true } },
          supplier: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }
}
