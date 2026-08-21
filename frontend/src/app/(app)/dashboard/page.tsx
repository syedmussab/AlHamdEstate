"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Boxes,
  AlertTriangle,
  Users,
  Truck,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Badge, Card, CardHeader, Spinner, statusTone, cn } from "@/lib/ui";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const summaryQ = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data,
  });
  const chartsQ = useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: async () => (await api.get("/dashboard/charts?days=14")).data,
  });
  const recentQ = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: async () => (await api.get("/dashboard/recent-transactions")).data,
  });

  const s = summaryQ.data;
  const charts = chartsQ.data;
  const recent = recentQ.data ?? [];

  const cards = [
    {
      label: "Total Properties",
      value: s ? formatNumber(s.totalProducts) : "–",
      icon: <Package className="h-5 w-5" />,
      tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    },
    {
      label: "Inventory Value",
      value: s ? formatCurrency(s.totalStockValue) : "–",
      icon: <Boxes className="h-5 w-5" />,
      tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
    {
      label: "Low Inventory Alerts",
      value: s ? formatNumber(s.lowStockCount) : "–",
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    },
    {
      label: "Pending Receivables",
      value: s ? formatCurrency(s.pendingReceivables) : "–",
      icon: <Wallet className="h-5 w-5" />,
      tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Here&apos;s what&apos;s happening across your inventory today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">{c.label}</p>
                <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {c.value}
                </p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", c.tone)}>
                {c.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Sales vs Purchases (14 days)"
            subtitle="Daily transaction totals"
          />
          <div className="h-72 px-2 py-4">
            {chartsQ.isLoading ? (
              <Spinner />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                  <YAxis fontSize={11} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sales" name="Sales" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Today's Activity" />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Today&apos;s Sales</p>
                <p className="text-[11px] text-zinc-400">{s?.todaySales.count ?? 0} invoices</p>
              </div>
              <p className="text-sm font-semibold text-emerald-600">
                {formatCurrency(s?.todaySales.total)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Today&apos;s Purchases
                </p>
                <p className="text-[11px] text-zinc-400">{s?.todayPurchases.count ?? 0} invoices</p>
              </div>
              <p className="text-sm font-semibold text-amber-600">
                {formatCurrency(s?.todayPurchases.total)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users className="h-3.5 w-3.5" /> Customers
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatNumber(s?.totalCustomers)}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Truck className="h-3.5 w-3.5" /> Suppliers
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatNumber(s?.totalSuppliers)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent Transactions"
          action={
            <Link
              href="/reports"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              View reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {recentQ.isLoading ? (
          <Spinner />
        ) : recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {recent.map((t: any) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3">
                      <Badge tone={t.type === "SALE" ? "green" : "amber"}>{t.type}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {t.reference}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                      {t.party ?? "-"}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 md:table-cell">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
