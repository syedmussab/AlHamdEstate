import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // ---------- Categories ----------
  findAllCategories() {
    return this.prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
  }

  async createCategory(dto: { name: string; isActive?: boolean }, actorId: string) {
    const cat = await this.prisma.expenseCategory.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: "EXPENSE_CATEGORY_CREATE",
      entity: "ExpenseCategory",
      entityId: cat.id,
      newValue: dto,
    });
    return cat;
  }

  async updateCategory(id: string, dto: { name?: string; isActive?: boolean }, actorId: string) {
    await this.findCategory(id);
    const cat = await this.prisma.expenseCategory.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: "EXPENSE_CATEGORY_UPDATE",
      entity: "ExpenseCategory",
      entityId: id,
      newValue: dto,
    });
    return cat;
  }

  async removeCategory(id: string, actorId: string) {
    await this.findCategory(id);
    await this.prisma.expenseCategory.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: "EXPENSE_CATEGORY_DELETE",
      entity: "ExpenseCategory",
      entityId: id,
    });
    return { message: "Expense category deleted" };
  }

  private async findCategory(id: string) {
    const cat = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException("Expense category not found");
    return cat;
  }

  // ---------- Expenses ----------
  async findAll(dto: PaginationDto & { categoryId?: string; from?: string; to?: string }) {
    const where: Prisma.ExpenseWhereInput = {};
    if (dto.categoryId) where.expenseCategoryId = dto.categoryId;
    if (dto.search) {
      where.description = { contains: dto.search, mode: "insensitive" };
    }
    if (dto.from || dto.to) {
      where.expenseDate = {};
      if (dto.from) where.expenseDate.gte = new Date(dto.from);
      if (dto.to) where.expenseDate.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        skip: dto.skip,
        take: dto.limit,
        include: {
          expenseCategory: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);
    return paginate(data, total, dto);
  }

  async create(dto: any, userId: string) {
    const expense = await this.prisma.expense.create({
      data: {
        expenseCategoryId: dto.expenseCategoryId,
        amount: dto.amount,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        description: dto.description,
        userId,
      },
    });
    await this.audit.log({
      userId,
      action: "EXPENSE_CREATE",
      entity: "Expense",
      entityId: expense.id,
      newValue: dto,
    });
    return expense;
  }

  async update(id: string, dto: any, userId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Expense not found");
    const expense = await this.prisma.expense.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: "EXPENSE_UPDATE",
      entity: "Expense",
      entityId: id,
      oldValue: existing,
      newValue: dto,
    });
    return expense;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Expense not found");
    await this.prisma.expense.delete({ where: { id } });
    await this.audit.log({
      userId,
      action: "EXPENSE_DELETE",
      entity: "Expense",
      entityId: id,
      oldValue: existing,
    });
    return { message: "Expense deleted" };
  }

  async summary(dto: { from?: string; to?: string; categoryId?: string }) {
    const where: Prisma.ExpenseWhereInput = {};
    if (dto.from || dto.to) {
      where.expenseDate = {};
      if (dto.from) where.expenseDate.gte = new Date(dto.from);
      if (dto.to) where.expenseDate.lte = new Date(dto.to);
    }
    if (dto.categoryId) where.expenseCategoryId = dto.categoryId;

    const [total, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.prisma.expense.groupBy({
        where,
        by: ["expenseCategoryId"],
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalAmount: Number(total._sum.amount ?? 0),
      totalCount: total._count,
      byCategory,
    };
  }
}
