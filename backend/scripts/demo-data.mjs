const API = "http://localhost:4000/api";

async function req(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function main() {
  const login = await req("POST", "/auth/login", { email: "admin@alhamd.com", password: "Admin@123" });
  const token = login.accessToken;
  console.log("Logged in as admin");

  const allProducts = (await req("GET", "/products?limit=100", null, token)).data;
  const SKU_ORDER = ["PLT-001", "PLT-002", "HS-001", "FL-001", "CPL-001"];
  const products = SKU_ORDER.map((sku) => {
    const p = allProducts.find((x) => x.sku === sku);
    if (!p) throw new Error(`Product ${sku} not found — run seed first`);
    return p;
  });
  const warehouses = (await req("GET", "/warehouses?limit=50", null, token)).data;
  const phase1 = warehouses.find((w) => w.code === "ALHD1");
  const phase2 = warehouses.find((w) => w.code === "ALHD2");
  console.log(`Phases: ${phase1?.name}, ${phase2?.name}`);

  // Property sellers (suppliers)
  const suppliers = [
    { name: "Malik Property Enterprises", contactPerson: "Malik Sajjad", phone: "0301-1112233", address: "Property Market, Main City" },
    { name: "Fazal Land Developers", contactPerson: "Fazal-ur-Rehman", phone: "0302-2223344", address: "Model Town" },
    { name: "Khan & Sons Estate", contactPerson: "Khan Brothers", phone: "0303-3334455", address: "Gulberg" },
  ];
  const supplierIds = [];
  for (const s of suppliers) {
    const sup = await req("POST", "/suppliers", s, token);
    supplierIds.push(sup.id);
    console.log(`Seller: ${s.name}`);
  }

  // Property buyers (customers)
  const customers = [
    { name: "Dr. Imran Khalid", phone: "0321-5556677", address: "Gulberg" },
    { name: "Muhammad Usman & Family", phone: "0322-6667788", address: "Saddar" },
    { name: "Al-Noor Family Trust", phone: "0323-7778899", address: "Model Town" },
    { name: "Rizwan & Sana Malik", phone: "0324-8889900", address: "DHA Phase 5" },
    { name: "Haji Abdul Rehman", phone: "0325-9990011", address: "Cantt" },
  ];
  const customerIds = [];
  for (const c of customers) {
    const cust = await req("POST", "/customers", c, token);
    customerIds.push(cust.id);
    console.log(`Buyer: ${c.name}`);
  }

  // ---- Properties acquired from sellers (purchases) ----
  // [productIdx, qty]
  const purchasePlan = [
    { days: 28, items: [[0, 2, 0], [1, 1, 0]], note: "Acquired 5 Marla plots + 10 Marla plot" },
    { days: 24, items: [[4, 1, 0]], note: "Acquired commercial plot" },
    { days: 18, items: [[2, 1, 0]], note: "Acquired 1 Kanal house" },
    { days: 12, items: [[3, 2, 0]], note: "Acquired 2 apartments" },
    { days: 7, items: [[0, 1, 0], [1, 1, 0]], note: "Acquired more residential plots" },
    { days: 3, items: [[3, 1, 0], [4, 1, 0]], note: "Acquired apartment + commercial plot" },
  ];

  const purchases = [];
  for (let i = 0; i < purchasePlan.length; i++) {
    const plan = purchasePlan[i];
    const supplierId = supplierIds[i % supplierIds.length];
    const items = plan.items.map(([pi, qty]) => ({
      productId: products[pi].id,
      quantity: qty,
      costPrice: Number(products[pi].costPrice),
    }));
    const purchase = await req("POST", "/purchases", {
      supplierId,
      warehouseId: phase1.id,
      purchaseDate: daysAgo(plan.days),
      items,
      discount: 0,
      tax: 0,
      note: plan.note,
    }, token);
    const confirmed = await req("POST", `/purchases/${purchase.id}/confirm`, {}, token);
    purchases.push(confirmed);
    console.log(`Acquired ${confirmed.invoiceNo} (${daysAgo(plan.days).slice(0, 10)}) total=${confirmed.total}`);
  }

  // ---- Properties sold to buyers (sales) ----
  const salePlan = [
    { days: 30, items: [[0, 1, 0]], cust: 0 },
    { days: 26, items: [[1, 1, 0]], cust: 1 },
    { days: 22, items: [[3, 1, 0]], cust: 2 },
    { days: 17, items: [[4, 1, 0]], cust: 3 },
    { days: 13, items: [[0, 1, 0], [2, 1, 0]], cust: 4 },
    { days: 10, items: [[3, 1, 0]], cust: 0 },
    { days: 6, items: [[1, 1, 0], [4, 1, 0]], cust: 1 },
    { days: 3, items: [[0, 1, 0]], cust: 2 },
    { days: 1, items: [[2, 1, 0]], cust: 3 },
    { days: 0, items: [[3, 1, 0]], cust: 4 },
  ];

  const sales = [];
  for (let i = 0; i < salePlan.length; i++) {
    const plan = salePlan[i];
    const items = plan.items.map(([pi, qty]) => ({
      productId: products[pi].id,
      quantity: qty,
      sellingPrice: Number(products[pi].sellingPrice),
    }));
    const sale = await req("POST", "/sales", {
      customerId: customerIds[plan.cust % customerIds.length],
      warehouseId: phase1.id,
      saleDate: daysAgo(plan.days),
      items,
      discount: 0,
      tax: 0,
      note: `Property sale ${i + 1}`,
    }, token);
    const confirmed = await req("POST", `/sales/${sale.id}/confirm`, {}, token);
    sales.push(confirmed);
    console.log(`Sold ${confirmed.invoiceNo} (${daysAgo(plan.days).slice(0, 10)}) total=${confirmed.total}`);
  }

  // ---- Payments to sellers ----
  for (let i = 0; i < purchases.length; i++) {
    const p = purchases[i];
    const amount = i === 2 ? Math.round(p.total / 2) : p.total;
    await req("POST", "/payments", {
      type: "PAID",
      amount,
      method: i % 2 === 0 ? "BANK_TRANSFER" : "CASH",
      paymentDate: daysAgo(Math.max(1, 30 - i * 4)),
      purchaseId: p.id,
      note: `Payment to seller for ${p.invoiceNo}`,
    }, token);
    console.log(`Paid seller ${amount} for ${p.invoiceNo}`);
  }

  // ---- Payments from buyers (booking + installments) ----
  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    // 0,1,2: full payment; 3,4: booking 50%; 5: 30%; rest: full
    const partial = i === 3 || i === 4 ? 0.5 : i === 5 ? 0.3 : 1;
    const amount = Math.round(s.total * partial);
    await req("POST", "/payments", {
      type: "RECEIVED",
      amount,
      method: i % 3 === 0 ? "BANK_TRANSFER" : "CASH",
      paymentDate: daysAgo(Math.max(0, 30 - i * 2)),
      saleId: s.id,
      note: `${partial < 1 ? "Booking / installment for " : "Full payment for "}${s.invoiceNo}`,
    }, token);
    console.log(`Received ${amount} for ${s.invoiceNo}${partial < 1 ? " (partial)" : ""}`);
  }

  // ---- Transfer property between phases ----
  if (phase2) {
    const transfer = await req("POST", "/stock-transfers", {
      fromWarehouseId: phase1.id,
      toWarehouseId: phase2.id,
      transferDate: daysAgo(9),
      note: "Shifted plots to Phase 2 for showcase",
      items: [
        { productId: products[0].id, quantity: 1 },
        { productId: products[4].id, quantity: 1 },
      ],
    }, token);
    const confirmed = await req("PATCH", `/stock-transfers/${transfer.id}/confirm`, {}, token);
    console.log(`Transfer ${confirmed.transferNo} confirmed`);
  }

  // ---- Expenses ----
  const expCats = await req("GET", "/expenses/categories", null, token);
  const catMap = Object.fromEntries(expCats.map((c) => [c.name, c.id]));

  const expensePlan = [
    { days: 28, cat: "Sales Commission", amount: 450000, desc: "Agent commission - plot sales" },
    { days: 15, cat: "Sales Commission", amount: 300000, desc: "Agent commission - house sale" },
    { days: 2, cat: "Sales Commission", amount: 250000, desc: "Agent commission - recent sales" },
    { days: 25, cat: "Legal & Registry", amount: 180000, desc: "Plot transfer registry fees" },
    { days: 12, cat: "Legal & Registry", amount: 95000, desc: "House sale registration" },
    { days: 5, cat: "Legal & Registry", amount: 120000, desc: "Registry and mutation fees" },
    { days: 27, cat: "Office Rent", amount: 90000, desc: "Office rent - month" },
    { days: 13, cat: "Office Rent", amount: 90000, desc: "Office rent - month" },
    { days: 1, cat: "Office Rent", amount: 90000, desc: "Office rent - month" },
    { days: 22, cat: "Marketing", amount: 75000, desc: "Property listing ads" },
    { days: 8, cat: "Marketing", amount: 50000, desc: "Social media campaign" },
    { days: 3, cat: "Marketing", amount: 45000, desc: "Banner and signboard" },
  ];
  for (const e of expensePlan) {
    const cid = catMap[e.cat];
    if (!cid) continue;
    await req("POST", "/expenses", {
      expenseCategoryId: cid,
      amount: e.amount,
      expenseDate: daysAgo(e.days),
      description: e.desc,
    }, token);
    console.log(`Expense ${e.desc} (${e.amount})`);
  }

  // ---- Returns ----
  const pr = await req("POST", "/purchase-returns", {
    purchaseId: purchases[0].id,
    returnDate: daysAgo(1),
    reason: "Plot returned by buyer to seller due to location issue",
    items: [{ productId: products[0].id, quantity: 1, unitPrice: Number(products[0].costPrice) }],
  }, token);
  console.log(`Purchase return ${pr.returnNo}`);

  const sr = await req("POST", "/sale-returns", {
    saleId: sales[1].id,
    returnDate: daysAgo(1),
    reason: "Buyer backed out, property re-listed",
    items: [{ productId: products[1].id, quantity: 1, unitPrice: Number(products[1].sellingPrice) }],
  }, token);
  console.log(`Sale return ${sr.returnNo}`);

  console.log("================");
  console.log("Real estate demo data seeded successfully!");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
