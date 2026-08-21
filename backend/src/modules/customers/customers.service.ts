import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(dto: PaginationDto & { isActive?: string }) {
    const where: Prisma.CustomerWhereInput = { deletedAt: null };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: "insensitive" } },
        { phone: { contains: dto.search } },
        { email: { contains: dto.search, mode: "insensitive" } },
      ];
    }
    if (dto.isActive !== undefined && dto.isActive !== "") {
      where.isActive = dto.isActive === "true";
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { [dto.sortBy ?? "createdAt"]: dto.sortOrder === "asc" ? "asc" : "desc" },
        skip: dto.skip,
        take: dto.limit,
      }),
    ]);

    return paginate(customers, total, dto);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async create(dto: any, actorId: string) {
    const customer = await this.prisma.customer.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: "CUSTOMER_CREATE",
      entity: "Customer",
      entityId: customer.id,
      newValue: dto,
    });
    return customer;
  }

  async update(id: string, dto: any, actorId: string) {
    const existing = await this.findOne(id);
    const customer = await this.prisma.customer.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: "CUSTOMER_UPDATE",
      entity: "Customer",
      entityId: id,
      oldValue: existing,
      newValue: dto,
    });
    return customer;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findOne(id);
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: "CUSTOMER_DELETE",
      entity: "Customer",
      entityId: id,
      oldValue: existing,
    });
    return { message: "Customer deleted" };
  }

  async getSales(id: string, dto: PaginationDto) {
    const where: Prisma.SaleWhereInput = { customerId: id, deletedAt: null };
    const [total, data] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        orderBy: { saleDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          items: { select: { id: true, productId: true, quantity: true, sellingPrice: true, total: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }

  async getBalance(id: string) {
    const [totalSales, totalReceived] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { customerId: id, status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null },
        _sum: { total: true },
      }),
      this.prisma.payment.aggregate({
        where: { customerId: id, type: "RECEIVED" },
        _sum: { amount: true },
      }),
    ]);

    const sales = Number(totalSales._sum.total ?? 0);
    const received = Number(totalReceived._sum.amount ?? 0);

    return { customerId: id, totalSales: sales, totalReceived: received, balanceDue: sales - received };
  }
}
