import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS: { name: string; module: string; description: string }[] = [
  // Users
  { name: "users.read", module: "users", description: "View users" },
  { name: "users.create", module: "users", description: "Create users" },
  { name: "users.update", module: "users", description: "Update users" },
  { name: "users.delete", module: "users", description: "Delete users" },
  // Roles
  { name: "roles.read", module: "roles", description: "View roles" },
  { name: "roles.create", module: "roles", description: "Create roles" },
  { name: "roles.update", module: "roles", description: "Update roles" },
  { name: "roles.delete", module: "roles", description: "Delete roles" },
  { name: "roles.assign_permissions", module: "roles", description: "Assign permissions to roles" },
  // Audit logs
  { name: "auditlogs.read", module: "auditlogs", description: "View audit logs" },
  // Catalog
  { name: "categories.read", module: "categories", description: "View categories" },
  { name: "categories.create", module: "categories", description: "Create categories" },
  { name: "categories.update", module: "categories", description: "Update categories" },
  { name: "categories.delete", module: "categories", description: "Delete categories" },
  { name: "brands.read", module: "brands", description: "View brands" },
  { name: "brands.create", module: "brands", description: "Create brands" },
  { name: "brands.update", module: "brands", description: "Update brands" },
  { name: "brands.delete", module: "brands", description: "Delete brands" },
  { name: "units.read", module: "units", description: "View units" },
  { name: "units.create", module: "units", description: "Create units" },
  { name: "units.update", module: "units", description: "Update units" },
  { name: "units.delete", module: "units", description: "Delete units" },
  // Warehouses
  { name: "warehouses.read", module: "warehouses", description: "View warehouses" },
  { name: "warehouses.create", module: "warehouses", description: "Create warehouses" },
  { name: "warehouses.update", module: "warehouses", description: "Update warehouses" },
  { name: "warehouses.delete", module: "warehouses", description: "Delete warehouses" },
  // Products
  { name: "products.read", module: "products", description: "View products" },
  { name: "products.create", module: "products", description: "Create products" },
  { name: "products.update", module: "products", description: "Update products" },
  { name: "products.delete", module: "products", description: "Delete products" },
  // Stock
  { name: "stock.read", module: "stock", description: "View stock" },
  { name: "stock.adjust", module: "stock", description: "Adjust stock" },
  { name: "stock.movements", module: "stock", description: "View stock movements" },
  { name: "stock.transfer", module: "stock", description: "Transfer stock between warehouses" },
  // Suppliers
  { name: "suppliers.read", module: "suppliers", description: "View suppliers" },
  { name: "suppliers.create", module: "suppliers", description: "Create suppliers" },
  { name: "suppliers.update", module: "suppliers", description: "Update suppliers" },
  { name: "suppliers.delete", module: "suppliers", description: "Delete suppliers" },
  // Customers
  { name: "customers.read", module: "customers", description: "View customers" },
  { name: "customers.create", module: "customers", description: "Create customers" },
  { name: "customers.update", module: "customers", description: "Update customers" },
  { name: "customers.delete", module: "customers", description: "Delete customers" },
  // Purchases
  { name: "purchases.read", module: "purchases", description: "View purchases" },
  { name: "purchases.create", module: "purchases", description: "Create purchases" },
  { name: "purchases.update", module: "purchases", description: "Update purchases" },
  { name: "purchases.confirm", module: "purchases", description: "Confirm purchases" },
  { name: "purchases.cancel", module: "purchases", description: "Cancel purchases" },
  // Sales
  { name: "sales.read", module: "sales", description: "View sales" },
  { name: "sales.create", module: "sales", description: "Create sales" },
  { name: "sales.update", module: "sales", description: "Update sales" },
  { name: "sales.confirm", module: "sales", description: "Confirm sales" },
  { name: "sales.cancel", module: "sales", description: "Cancel sales" },
  // Returns
  { name: "returns.read", module: "returns", description: "View returns" },
  { name: "returns.create", module: "returns", description: "Create returns" },
  // Payments
  { name: "payments.read", module: "payments", description: "View payments" },
  { name: "payments.create", module: "payments", description: "Create payments" },
  // Expenses
  { name: "expenses.read", module: "expenses", description: "View expenses" },
  { name: "expenses.create", module: "expenses", description: "Create expenses" },
  { name: "expenses.update", module: "expenses", description: "Update expenses" },
  { name: "expenses.delete", module: "expenses", description: "Delete expenses" },
  // Dashboard & Reports
  { name: "dashboard.read", module: "dashboard", description: "View dashboard" },
  { name: "reports.read", module: "reports", description: "View reports" },
];

async function main() {
  console.log("Seeding database...");

  const permissionData = await prisma.permission.createMany({
    data: PERMISSIONS,
    skipDuplicates: true,
  });
  console.log(`Created ${permissionData.count} permissions`);

  const allPermissions = await prisma.permission.findMany();

  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin", description: "Full system access", isSystem: true },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "Manager" },
    update: {},
    create: {
      name: "Manager",
      description: "Manage inventory, sales and purchases",
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "Staff" },
    update: {},
    create: { name: "Staff", description: "Handle sales and stock operations" },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });

  const readOnlyPerms = allPermissions.filter((p) => p.name.endsWith(".read") || p.name.includes("dashboard") || p.name.includes("reports") || p.name.includes("audit"));
  await prisma.rolePermission.deleteMany({ where: { roleId: managerRole.id } });
  await prisma.rolePermission.createMany({
    data: readOnlyPerms.map((p) => ({ roleId: managerRole.id, permissionId: p.id })),
  });

  const salesStockPerms = allPermissions.filter(
    (p) =>
      p.name.startsWith("products.") ||
      p.name.startsWith("customers.") ||
      p.name.startsWith("sales.") ||
      p.name.startsWith("stock.") ||
      p.name.startsWith("returns.") ||
      p.name.startsWith("payments.") ||
      p.name.startsWith("dashboard.") ||
      p.name.startsWith("categories.") ||
      p.name.startsWith("brands.") ||
      p.name.startsWith("units.") ||
      p.name.startsWith("warehouses.")
  );
  await prisma.rolePermission.deleteMany({ where: { roleId: staffRole.id } });
  await prisma.rolePermission.createMany({
    data: salesStockPerms.map((p) => ({ roleId: staffRole.id, permissionId: p.id })),
  });

  const adminPassword = await bcrypt.hash("Admin@123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@alhamd.com" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@alhamd.com",
      phone: "03001234567",
      passwordHash: adminPassword,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  for (const [name, email, role] of [
    ["Manager User", "manager@alhamd.com", managerRole],
    ["Staff User", "staff@alhamd.com", staffRole],
  ] as const) {
    const passwordHash = await bcrypt.hash("User@123", 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  // ---- Master data (Real Estate: plots & houses) ----
  const warehouse1 = await prisma.warehouse.upsert({
    where: { code: "ALHD1" },
    update: {},
    create: { name: "Al Hamd Housing Phase 1", code: "ALHD1", address: "Main Boulevard, Al Hamd Housing", phone: "03001234567" },
  });

  const warehouse2 = await prisma.warehouse.upsert({
    where: { code: "ALHD2" },
    update: {},
    create: { name: "Al Hamd Housing Phase 2", code: "ALHD2", address: "Sector B, Al Hamd Housing", phone: "03001234567" },
  });

  const unitMarla = await prisma.unit.upsert({ where: { code: "MARLA" }, update: {}, create: { name: "Marla", code: "MARLA" } });
  const unitKanal = await prisma.unit.upsert({ where: { code: "KANAL" }, update: {}, create: { name: "Kanal", code: "KANAL" } });
  const unitSqft = await prisma.unit.upsert({ where: { code: "SQFT" }, update: {}, create: { name: "Square Feet", code: "SQFT" } });
  await prisma.unit.upsert({ where: { code: "SQYD" }, update: {}, create: { name: "Square Yard", code: "SQYD" } });

  const catPlot = await prisma.category.upsert({
    where: { name: "Residential Plot" },
    update: {},
    create: { name: "Residential Plot", description: "Residential plots of all sizes" },
  });
  const catComm = await prisma.category.upsert({
    where: { name: "Commercial Plot" },
    update: {},
    create: { name: "Commercial Plot", description: "Commercial plots and shops" },
  });
  const catHouse = await prisma.category.upsert({
    where: { name: "House" },
    update: {},
    create: { name: "House", description: "Constructed houses" },
  });
  const catFlat = await prisma.category.upsert({ where: { name: "Flat" }, update: {}, create: { name: "Flat", description: "Apartments and flats" } });

  const brandAlHamd = await prisma.brand.upsert({ where: { name: "Al Hamd Housing" }, update: {}, create: { name: "Al Hamd Housing" } });
  await prisma.brand.upsert({ where: { name: "DHA" }, update: {}, create: { name: "DHA" } });
  await prisma.brand.upsert({ where: { name: "Bahria Town" }, update: {}, create: { name: "Bahria Town" } });
  await prisma.brand.upsert({ where: { name: "Gulberg Greens" }, update: {}, create: { name: "Gulberg Greens" } });

  const products = [
    { name: "Residential Plot 5 Marla - Phase 1", sku: "PLT-001", plotNo: "A-12", block: "Block A", area: 5, facing: "South", cost: 2500000, sell: 2850000, min: 1, cat: catPlot, brand: brandAlHamd, unit: unitMarla },
    { name: "Residential Plot 10 Marla - Phase 1", sku: "PLT-002", plotNo: "B-45", block: "Block B", area: 10, facing: "East", cost: 5000000, sell: 5500000, min: 1, cat: catPlot, brand: brandAlHamd, unit: unitMarla },
    { name: "House 1 Kanal - Phase 2", sku: "HS-001", plotNo: "C-08", block: "Block C", area: 1, facing: "North", cost: 18000000, sell: 20000000, min: 1, cat: catHouse, brand: brandAlHamd, unit: unitKanal },
    { name: "Apartment 3-Bed - Phase 1", sku: "FL-001", plotNo: "T-301", block: "Tower 1", area: 1250, facing: "East", cost: 9500000, sell: 10800000, min: 1, cat: catFlat, brand: brandAlHamd, unit: unitSqft },
    { name: "Commercial Plot 4 Marla - Phase 2", sku: "CPL-001", plotNo: "D-22", block: "Block D (Main Blvd)", area: 4, facing: "West", cost: 8000000, sell: 9200000, min: 1, cat: catComm, brand: brandAlHamd, unit: unitMarla },
  ];

  const openingStock: Record<string, number> = {
    "PLT-001": 5,
    "PLT-002": 3,
    "HS-001": 2,
    "FL-001": 4,
    "CPL-001": 2,
  };

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        plotNo: p.plotNo,
        block: p.block,
        area: p.area,
        facing: p.facing,
        costPrice: p.cost,
        sellingPrice: p.sell,
        minStockLevel: p.min,
        categoryId: p.cat.id,
        brandId: p.brand.id,
        unitId: p.unit.id,
      },
    });

    for (const [wh, qty] of [
      [warehouse1, openingStock[p.sku] ?? 1],
      [warehouse2, p.sku === "PLT-001" ? 2 : 0],
    ] as const) {
      const existing = await prisma.stock.findUnique({
        where: { productId_warehouseId: { productId: product.id, warehouseId: wh.id } },
      });
      if (!existing && qty > 0) {
        await prisma.stock.create({
          data: {
            productId: product.id,
            warehouseId: wh.id,
            quantity: qty,
          },
        });
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            warehouseId: wh.id,
            quantity: qty,
            type: "OPENING",
            referenceType: "SEED",
            note: "Opening stock",
            userId: adminUser.id,
          },
        });
      }
    }
  }

  const supplier = await prisma.supplier.upsert({
    where: { name: "Al Hamd Property Sellers" },
    update: {},
    create: {
      name: "Al Hamd Property Sellers",
      contactPerson: "Malik Brothers",
      phone: "03001234567",
      email: "sellers@alhamd.com",
      address: "Property Market, Main City",
      paymentInfo: "Bank transfer",
    },
  });

  const customer = await prisma.customer.upsert({
    where: { name: "Property Buyer" },
    update: {},
    create: { name: "Property Buyer", phone: "00000000000" },
  });

  const expenseCat = await prisma.expenseCategory.upsert({
    where: { name: "Sales Commission" },
    update: {},
    create: { name: "Sales Commission" },
  });
  await prisma.expenseCategory.upsert({ where: { name: "Legal & Registry" }, update: {}, create: { name: "Legal & Registry" } });
  await prisma.expenseCategory.upsert({ where: { name: "Office Rent" }, update: {}, create: { name: "Office Rent" } });
  await prisma.expenseCategory.upsert({ where: { name: "Marketing" }, update: {}, create: { name: "Marketing" } });

  console.log("Seed complete!");
  console.log("---");
  console.log("Login credentials:");
  console.log("Admin:   admin@alhamd.com / Admin@123");
  console.log("Manager: manager@alhamd.com / User@123");
  console.log("Staff:   staff@alhamd.com / User@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
