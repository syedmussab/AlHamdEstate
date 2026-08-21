import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      productCount,
      stockAgg,
      customerCount,
      supplierCount,
      salesAgg,
      purchasesAgg,
      stockValueResult,
      pending,
    ] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.stock.aggregate({ _sum: { quantity: true } }),
      this.prisma.customer.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.supplier.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: startOfDay }, status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.purchase.aggregate({
        where: { purchaseDate: { gte: startOfDay }, status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.$queryRaw<{ value: number }[]>`
        SELECT COALESCE(SUM(s.quantity * p."costPrice"), 0) as value
        FROM "Stock" s
        JOIN "Product" p ON p.id = s."productId"
        WHERE p."deletedAt" IS NULL AND p."isActive" = true
      `,
      this.prisma.$queryRaw<{ due: number }[]>`
        SELECT
          COALESCE((SELECT SUM("dueAmount") FROM "Sale" WHERE status IN ('CONFIRMED','COMPLETED') AND "deletedAt" IS NULL), 0) +
          COALESCE((SELECT SUM("dueAmount") FROM "Purchase" WHERE status IN ('CONFIRMED','COMPLETED') AND "deletedAt" IS NULL), 0)
          as due
      `,
    ]);

    const lowStockProducts = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true, stock: { some: {} } },
      include: { stock: { select: { quantity: true } } },
    });
    const lowStockCount = lowStockProducts.filter((p) =>
      p.stock.some((s) => s.quantity <= p.minStockLevel)
    ).length;

    const stockValue = Number((stockValueResult as any)?.[0]?.value ?? 0);

    return {
      totalProducts: productCount,
      totalStockQuantity: stockAgg._sum.quantity ?? 0,
      totalStockValue: stockValue,
      lowStockCount,
      todaySales: {
        total: Number(salesAgg._sum.total ?? 0),
        count: salesAgg._count,
      },
      todayPurchases: {
        total: Number(purchasesAgg._sum.total ?? 0),
        count: purchasesAgg._count,
      },
      totalCustomers: customerCount,
      totalSuppliers: supplierCount,
      pendingReceivables: Number((pending as any)?.[0]?.due ?? 0),
      // pendingReceivables: 0,
    };
  }

  async charts(days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const salesRows = await this.prisma.$queryRaw<{ date: string; total: number; count: bigint }[]>`
      SELECT to_char("saleDate", 'YYYY-MM-DD') as date,
             SUM(total) as total,
             COUNT(*) as count
      FROM "Sale"
      WHERE "saleDate" >= ${since} AND status IN ('CONFIRMED','COMPLETED') AND "deletedAt" IS NULL
      GROUP BY date
      ORDER BY date
    `;
    const purchaseRows = await this.prisma.$queryRaw<{ date: string; total: number; count: bigint }[]>`
      SELECT to_char("purchaseDate", 'YYYY-MM-DD') as date,
             SUM(total) as total,
             COUNT(*) as count
      FROM "Purchase"
      WHERE "purchaseDate" >= ${since} AND status IN ('CONFIRMED','COMPLETED') AND "deletedAt" IS NULL
      GROUP BY date
      ORDER BY date
    `;
    const movementRows = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM "StockMovement"
      WHERE "createdAt" >= ${since}
      GROUP BY date
      ORDER BY date
    `;

    const labels: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      labels.push(d.toISOString().slice(0, 10));
    }

    const toMap = (rows: any[]) => new Map(rows.map((r) => [r.date, r]));

    const salesMap = toMap(salesRows);
    const purchaseMap = toMap(purchaseRows);
    const movementMap = toMap(movementRows);

    return {
      days,
      labels,
      sales: labels.map((l) => Number(salesMap.get(l)?.total ?? 0)),
      purchases: labels.map((l) => Number(purchaseMap.get(l)?.total ?? 0)),
      movements: labels.map((l) => Number(movementMap.get(l)?.count ?? 0)),
    };
  }

  async recentTransactions(limit = 10) {
    const [sales, purchases] = await Promise.all([
      this.prisma.sale.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      this.prisma.purchase.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          status: true,
          createdAt: true,
          supplier: { select: { name: true } },
        },
      }),
    ]);

    const merged = [
      ...sales.map((s) => ({
        id: s.id,
        reference: s.invoiceNo,
        type: "SALE",
        party: (s as any).customer?.name,
        amount: Number(s.total),
        status: s.status,
        createdAt: s.createdAt,
      })),
      ...purchases.map((p) => ({
        id: p.id,
        reference: p.invoiceNo,
        type: "PURCHASE",
        party: (p as any).supplier?.name,
        amount: Number(p.total),
        status: p.status,
        createdAt: p.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return merged;
  }
}
