"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  TBody,
  Td,
  Th,
  THead,
  Table,
  Tr,
} from "@/lib/ui";

const REPORT_TYPES = [
  { key: "sales", label: "Sales Report" },
  { key: "purchases", label: "Purchases Report" },
  { key: "stock", label: "Stock Report" },
  { key: "stock-movements", label: "Stock Movements" },
  { key: "low-stock", label: "Low Stock Report" },
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "expenses", label: "Expenses Report" },
  { key: "customer-balances", label: "Customer Balances" },
  { key: "supplier-balances", label: "Supplier Balances" },
];

const CURRENCY_FIELDS = new Set([
  "subtotal", "discount", "tax", "total", "dueAmount", "paid", "amount", "unitPrice",
  "lineTotal", "stockValue", "value", "costPrice", "sellingPrice", "totalSales",
  "totalPurchases", "totalReceived", "totalPaid", "balanceDue", "totalSalesValue",
]);

function downloadBlob(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function isCurrencyField(key: string) {
  return CURRENCY_FIELDS.has(key);
}

export default function ReportsPage() {
  const { hasPerm } = useAuth();
  const canRead = hasPerm("reports.read");

  const [type, setType] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const reportQ = useQuery({
    queryKey: ["reports", type, from, to],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return (await api.get(`/reports/${type}`, { params })).data;
    },
    enabled: canRead,
  });

  const exportReport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      const params: Record<string, any> = { export: format };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get(`/reports/${type}`, { params, responseType: "blob" });
      downloadBlob(res.data, `${type}-report.${format === "csv" ? "csv" : "pdf"}`);
      toast.success(`${format.toUpperCase()} exported`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const data = reportQ.data;
  const isPnl = type === "profit-loss";

  const columns = isPnl
    ? []
    : data?.rows && data.rows.length > 0
      ? Object.keys(data.rows[0]).filter((k) => !["type"].includes(k))
      : [];

  const pnl = isPnl ? data : null;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and export business reports"
        action={
          canRead && !isPnl ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportReport("csv")} loading={exporting === "csv"}>
                <FileDown className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" onClick={() => exportReport("pdf")} loading={exporting === "pdf"}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      {!canRead ? (
        <Card className="p-6 text-sm text-zinc-500">You don&apos;t have permission to view reports.</Card>
      ) : (
        <>
          <Card className="mb-5">
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
              <Field label="Report Type">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button onClick={() => reportQ.refetch()} loading={reportQ.isFetching}>
                  <Download className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          </Card>

          {isPnl ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Revenue</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(pnl?.revenue?.totalSales ?? 0)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Cost of Goods Sold</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(pnl?.revenue?.costOfGoodsSold ?? 0)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Gross Profit</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(pnl?.revenue?.grossProfit ?? 0)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Expenses</p>
                <p className="mt-1 text-2xl font-bold text-red-500">{formatCurrency(pnl?.expenses?.totalExpenses ?? 0)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Purchases</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(pnl?.purchases?.totalPurchases ?? 0)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Net Profit / Loss</p>
                <p className={`mt-1 text-2xl font-bold ${(pnl?.net?.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {formatCurrency(pnl?.net?.netProfit ?? 0)}
                </p>
              </Card>
            </div>
          ) : reportQ.isLoading ? (
            <Card><Spinner /></Card>
          ) : !data?.rows || data.rows.length === 0 ? (
            <Card><EmptyState /></Card>
          ) : (
            <Card>
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm font-medium">{data?.type?.replace("_", " ")}</p>
                {data?.totals && (
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    {Object.entries(data.totals).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                        {k.replace(/([A-Z])/g, " $1")}: <b>{typeof v === "number" && isCurrencyField(k) ? formatCurrency(v) : String(v)}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Table>
                <THead>
                  {columns.map((c) => <Th key={c} className="capitalize">{c.replace(/([A-Z])/g, " $1")}</Th>)}
                </THead>
                <TBody>
                  {data.rows.map((row: any, i: number) => (
                    <Tr key={i}>
                      {columns.map((c) => (
                        <Td key={c}>
                          {isCurrencyField(c) && typeof row[c] === "number"
                            ? formatCurrency(row[c])
                            : c === "date"
                              ? formatDate(row[c])
                              : String(row[c] ?? "-")}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
