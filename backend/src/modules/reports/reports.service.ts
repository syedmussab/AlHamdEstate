import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import PDFDocument from "pdfkit";

export interface ReportQuery {
  from?: string;
  to?: string;
  search?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(q: ReportQuery) {
    const range: { gte?: Date; lte?: Date } = {};
    if (q.from) range.gte = new Date(q.from);
    if (q.to) range.lte = new Date(q.to);
    return range;
  }

  async sales(q: ReportQuery & { customerId?: string; status?: string }) {
    const where: any = { deletedAt: null };
    const range = this.dateRange(q);
    if (q.from || q.to) where.saleDate = range;
    if (q.customerId) where.customerId = q.customerId;
    if (q.status) where.status = q.status;
    if (q.search) where.invoiceNo = { contains: q.search, mode: "insensitive" };

    const [rows, totals] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        orderBy: { saleDate: "desc" },
        include: {
          customer: { select: { name: true, phone: true } },
          warehouse: { select: { name: true } },
          items: { select: { quantity: true, sellingPrice: true, total: true } },
        },
      }),
      this.prisma.sale.aggregate({
        where: { ...where, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { total: true, discount: true, tax: true, dueAmount: true },
        _count: true,
      }),
    ]);

    return {
      type: "SALES",
      rows: rows.map((r) => ({
        invoiceNo: r.invoiceNo,
        date: r.saleDate,
        customer: r.customer.name,
        items: r.items.length,
        quantity: r.items.reduce((s, i) => s + i.quantity, 0),
        subtotal: Number(r.subTotal),
        discount: Number(r.discount),
        tax: Number(r.tax),
        total: Number(r.total),
        paid: Number(r.paidAmount),
        due: Number(r.dueAmount),
        status: r.status,
      })),
      totals: {
        count: totals._count,
        totalAmount: Number(totals._sum.total ?? 0),
        totalDiscount: Number(totals._sum.discount ?? 0),
        totalTax: Number(totals._sum.tax ?? 0),
        totalDue: Number(totals._sum.dueAmount ?? 0),
      },
    };
  }

  async purchases(q: ReportQuery & { supplierId?: string; status?: string }) {
    const where: any = { deletedAt: null };
    const range = this.dateRange(q);
    if (q.from || q.to) where.purchaseDate = range;
    if (q.supplierId) where.supplierId = q.supplierId;
    if (q.status) where.status = q.status;
    if (q.search) where.invoiceNo = { contains: q.search, mode: "insensitive" };

    const [rows, totals] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        orderBy: { purchaseDate: "desc" },
        include: {
          supplier: { select: { name: true, phone: true } },
          warehouse: { select: { name: true } },
          items: { select: { quantity: true, costPrice: true, total: true } },
        },
      }),
      this.prisma.purchase.aggregate({
        where: { ...where, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { total: true, discount: true, tax: true, dueAmount: true },
        _count: true,
      }),
    ]);

    return {
      type: "PURCHASES",
      rows: rows.map((r) => ({
        invoiceNo: r.invoiceNo,
        date: r.purchaseDate,
        supplier: r.supplier.name,
        items: r.items.length,
        quantity: r.items.reduce((s, i) => s + i.quantity, 0),
        subtotal: Number(r.subTotal),
        discount: Number(r.discount),
        tax: Number(r.tax),
        total: Number(r.total),
        paid: Number(r.paidAmount),
        due: Number(r.dueAmount),
        status: r.status,
      })),
      totals: {
        count: totals._count,
        totalAmount: Number(totals._sum.total ?? 0),
        totalDiscount: Number(totals._sum.discount ?? 0),
        totalTax: Number(totals._sum.tax ?? 0),
        totalDue: Number(totals._sum.dueAmount ?? 0),
      },
    };
  }

  async stock(q: ReportQuery & { warehouseId?: string; productId?: string }) {
    const where: any = {};
    if (q.warehouseId) where.warehouseId = q.warehouseId;
    if (q.productId) where.productId = q.productId;
    if (q.search) where.product = { name: { contains: q.search, mode: "insensitive" } };

    const rows = await this.prisma.stock.findMany({
      where,
      orderBy: { quantity: "desc" },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            costPrice: true,
            sellingPrice: true,
            minStockLevel: true,
            unit: { select: { code: true } },
          },
        },
        warehouse: { select: { name: true } },
      },
    });

    const mapped = rows.map((r) => ({
      sku: r.product.sku,
      product: r.product.name,
      warehouse: r.warehouse.name,
      unit: r.product.unit?.code ?? "",
      quantity: r.quantity,
      costPrice: Number(r.product.costPrice),
      sellingPrice: Number(r.product.sellingPrice),
      stockValue: Number((r.quantity * Number(r.product.costPrice)).toFixed(2)),
      minStockLevel: r.product.minStockLevel,
      lowStock: r.quantity <= r.product.minStockLevel,
    }));

    return {
      type: "STOCK",
      rows: mapped,
      totals: {
        totalQuantity: mapped.reduce((s, r) => s + r.quantity, 0),
        totalValue: mapped.reduce((s, r) => s + r.stockValue, 0),
        lowStockCount: mapped.filter((r) => r.lowStock).length,
      },
    };
  }

  async stockMovements(q: ReportQuery & { type?: string; productId?: string; warehouseId?: string }) {
    const where: any = {};
    const range = this.dateRange(q);
    if (q.from || q.to) where.createdAt = range;
    if (q.type) where.type = q.type;
    if (q.productId) where.productId = q.productId;
    if (q.warehouseId) where.warehouseId = q.warehouseId;

    const rows = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    const mapped = rows.map((r) => ({
      date: r.createdAt,
      product: r.product.name,
      sku: r.product.sku,
      warehouse: r.warehouse.name,
      type: r.type,
      quantity: r.quantity,
      user: r.user?.name ?? "-",
      note: r.note,
    }));

    return {
      type: "STOCK_MOVEMENTS",
      rows: mapped,
      totals: {
        count: mapped.length,
        totalIn: mapped.filter((r) => r.quantity > 0).reduce((s, r) => s + r.quantity, 0),
        totalOut: mapped.filter((r) => r.quantity < 0).reduce((s, r) => s + -r.quantity, 0),
      },
    };
  }

  async lowStock(q: ReportQuery) {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true, stock: { some: {} } },
      include: { stock: { select: { quantity: true, warehouse: { select: { name: true } } } }, unit: { select: { code: true } } },
    });

    const rows = products.flatMap((p) =>
      p.stock
        .filter((s) => s.quantity <= p.minStockLevel)
        .map((s) => ({
          sku: p.sku,
          product: p.name,
          warehouse: s.warehouse.name,
          currentStock: s.quantity,
          minStockLevel: p.minStockLevel,
          shortBy: p.minStockLevel - s.quantity,
          unit: p.unit?.code ?? "",
        }))
    );

    return { type: "LOW_STOCK", rows, totals: { count: rows.length } };
  }

  async profitLoss(q: ReportQuery) {
    const salesWhere: any = { status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null };
    const purchaseWhere: any = { status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null };
    const expenseWhere: any = {};
    const range = this.dateRange(q);
    if (q.from || q.to) {
      salesWhere.saleDate = range;
      purchaseWhere.purchaseDate = range;
      expenseWhere.expenseDate = range;
    }

    const [sales, purchases, expenses] = await Promise.all([
      this.prisma.sale.aggregate({
        where: salesWhere,
        _sum: { total: true },
      }),
      this.prisma.purchase.aggregate({ where: purchaseWhere, _sum: { total: true } }),
      this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
    ]);

    // Cost of goods sold = sum of sale item quantities * product cost price
    const salesItems = await this.prisma.saleItem.findMany({
      where: { sale: { ...salesWhere } },
      include: { product: { select: { costPrice: true } } },
    });
    const cogs = salesItems.reduce((sum, i) => sum + i.quantity * Number(i.product.costPrice), 0);

    const totalSales = Number(sales._sum.total ?? 0);
    const totalPurchases = Number(purchases._sum.total ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      type: "PROFIT_LOSS",
      from: q.from,
      to: q.to,
      revenue: {
        totalSales,
        costOfGoodsSold: Number(cogs.toFixed(2)),
        grossProfit: Number((totalSales - cogs).toFixed(2)),
      },
      costs: {
        totalPurchases,
        totalExpenses,
        totalCosts: Number((totalPurchases + totalExpenses).toFixed(2)),
      },
      netProfit: Number((totalSales - cogs - totalExpenses).toFixed(2)),
    };
  }

  async expenses(q: ReportQuery & { categoryId?: string }) {
    const where: any = {};
    const range = this.dateRange(q);
    if (q.from || q.to) where.expenseDate = range;
    if (q.categoryId) where.expenseCategoryId = q.categoryId;

    const rows = await this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      include: { expenseCategory: { select: { name: true } }, user: { select: { name: true } } },
    });

    return {
      type: "EXPENSES",
      rows: rows.map((r) => ({
        date: r.expenseDate,
        category: r.expenseCategory.name,
        amount: Number(r.amount),
        description: r.description,
        user: r.user?.name ?? "-",
      })),
      totals: { count: rows.length, totalAmount: rows.reduce((s, r) => s + Number(r.amount), 0) },
    };
  }

  async customerBalances() {
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        sales: { where: { status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null }, select: { total: true } },
        payments: { where: { type: "RECEIVED" }, select: { amount: true } },
      },
    });

    return {
      type: "CUSTOMER_BALANCES",
      rows: customers.map((c) => {
        const salesTotal = c.sales.reduce((s, x) => s + Number(x.total), 0);
        const received = c.payments.reduce((s, x) => s + Number(x.amount), 0);
        return {
          customer: c.name,
          phone: c.phone,
          totalSales: Number(salesTotal.toFixed(2)),
          totalReceived: Number(received.toFixed(2)),
          balanceDue: Number((salesTotal - received).toFixed(2)),
        };
      }),
    };
  }

  async supplierBalances() {
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      include: {
        purchases: { where: { status: { in: ["CONFIRMED", "COMPLETED"] }, deletedAt: null }, select: { total: true } },
        payments: { where: { type: "PAID" }, select: { amount: true } },
      },
    });

    return {
      type: "SUPPLIER_BALANCES",
      rows: suppliers.map((s) => {
        const purchasesTotal = s.purchases.reduce((sum, x) => sum + Number(x.total), 0);
        const paid = s.payments.reduce((sum, x) => sum + Number(x.amount), 0);
        return {
          supplier: s.name,
          phone: s.phone,
          totalPurchases: Number(purchasesTotal.toFixed(2)),
          totalPaid: Number(paid.toFixed(2)),
          balanceDue: Number((purchasesTotal - paid).toFixed(2)),
        };
      }),
    };
  }

  // ==================== EXPORT HELPERS ====================

  private columnsFor(report: any): string[] {
    switch (report.type) {
      case "SALES":
        return ["invoiceNo", "date", "customer", "items", "quantity", "subtotal", "discount", "tax", "total", "paid", "due", "status"];
      case "PURCHASES":
        return ["invoiceNo", "date", "supplier", "items", "quantity", "subtotal", "discount", "tax", "total", "paid", "due", "status"];
      case "STOCK":
        return ["sku", "product", "warehouse", "unit", "quantity", "costPrice", "sellingPrice", "stockValue", "minStockLevel", "lowStock"];
      case "STOCK_MOVEMENTS":
        return ["date", "product", "sku", "warehouse", "type", "quantity", "user", "note"];
      case "LOW_STOCK":
        return ["sku", "product", "warehouse", "currentStock", "minStockLevel", "shortBy", "unit"];
      case "EXPENSES":
        return ["date", "category", "amount", "description", "user"];
      case "CUSTOMER_BALANCES":
        return ["customer", "phone", "totalSales", "totalReceived", "balanceDue"];
      case "SUPPLIER_BALANCES":
        return ["supplier", "phone", "totalPurchases", "totalPaid", "balanceDue"];
      default:
        return Object.keys(report.rows?.[0] ?? {});
    }
  }

  toCsv(report: any): string {
    const columns = this.columnsFor(report);
    const rows = report.rows ?? [];
    const header = columns.join(",");
    const body = rows
      .map((r: any) =>
        columns.map((c) => {
          const v = r[c];
          if (v === null || v === undefined) return "";
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          const s = String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      )
      .join("\n");
    return `${header}\n${body}`;
  }

  toPdf(report: any): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(16).text("Al Hamd Estate - Inventory Report", { align: "center" });
      doc.fontSize(11).text(`${report.type.replace("_", " ")} Report`, { align: "center" });
      doc.moveDown();

      if (report.totals) {
        doc.fontSize(9).text(`Totals: ${Object.entries(report.totals).map(([k, v]) => `${k}=${v}`).join("  ")}`, { align: "center" });
        doc.moveDown();
      }

      const columns = this.columnsFor(report);
      const rows = report.rows ?? [];
      const pageWidth = doc.page.width - 80;
      const colWidth = Math.min(pageWidth / Math.max(columns.length, 1), 110);
      const cellPad = 4;

      const drawRow = (values: string[], isHeader: boolean) => {
        const y = doc.y;
        const maxLines = 1;
        doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(7);
        let x = 40;
        values.forEach((val, i) => {
          const text = String(val).slice(0, 60);
          doc.text(text, x + cellPad, y + 2, { width: colWidth - cellPad * 2, height: 14 });
          x += colWidth;
        });
        doc.moveDown();
      };

      drawRow(columns, true);
      for (const r of rows) {
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
          drawRow(columns, true);
        }
        drawRow(columns.map((c) => (r[c] instanceof Date ? r[c].toISOString().slice(0, 10) : r[c])), false);
      }

      doc.end();
    });
  }
}
