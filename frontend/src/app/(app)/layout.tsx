"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Tags,
  Boxes,
  Warehouse,
  Truck,
  Users,
  ShoppingCart,
  BadgeDollarSign,
  ArrowLeftRight,
  Wallet,
  ReceiptText,
  FileBarChart,
  UserCog,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  Ruler,
  Layers,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/ui";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  perm: string;
}

const groups: { title?: string; items: NavItem[] }[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, perm: "dashboard.read" }],
  },
  {
    title: "Properties",
    items: [
      { label: "Properties", href: "/products", icon: <Building2 className="h-4 w-4" />, perm: "products.read" },
      { label: "Property Types", href: "/categories", icon: <Tags className="h-4 w-4" />, perm: "categories.read" },
      { label: "Societies", href: "/brands", icon: <Layers className="h-4 w-4" />, perm: "brands.read" },
      { label: "Area Units", href: "/units", icon: <Ruler className="h-4 w-4" />, perm: "units.read" },
      { label: "Phases / Locations", href: "/warehouses", icon: <Warehouse className="h-4 w-4" />, perm: "warehouses.read" },
    ],
  },
  {
    title: "Parties",
    items: [
      { label: "Sellers", href: "/suppliers", icon: <Truck className="h-4 w-4" />, perm: "suppliers.read" },
      { label: "Buyers", href: "/customers", icon: <Users className="h-4 w-4" />, perm: "customers.read" },
    ],
  },
  {
    title: "Transactions",
    items: [
      { label: "Purchases", href: "/purchases", icon: <ShoppingCart className="h-4 w-4" />, perm: "purchases.read" },
      { label: "Sales", href: "/sales", icon: <BadgeDollarSign className="h-4 w-4" />, perm: "sales.read" },
      { label: "Inventory", href: "/stock", icon: <Boxes className="h-4 w-4" />, perm: "stock.read" },
      { label: "Transfers", href: "/transfers", icon: <ArrowLeftRight className="h-4 w-4" />, perm: "stock.transfer" },
      { label: "Returns", href: "/returns", icon: <ArrowLeftRight className="h-4 w-4" />, perm: "returns.read" },
      { label: "Payments", href: "/payments", icon: <Wallet className="h-4 w-4" />, perm: "payments.read" },
      { label: "Expenses", href: "/expenses", icon: <ReceiptText className="h-4 w-4" />, perm: "expenses.read" },
    ],
  },
  {
    title: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: <FileBarChart className="h-4 w-4" />, perm: "reports.read" }],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/users", icon: <UserCog className="h-4 w-4" />, perm: "users.read" },
      { label: "Roles & Permissions", href: "/roles", icon: <ShieldCheck className="h-4 w-4" />, perm: "roles.read" },
      { label: "Audit Logs", href: "/audit-logs", icon: <ScrollText className="h-4 w-4" />, perm: "auditlogs.read" },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPerm, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => hasPerm(i.perm)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-5 dark:border-zinc-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Al Hamd Estate</p>
            <p className="text-[11px] text-zinc-400">Inventory Manager</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group, gi) => (
            <div key={gi} className="mb-5">
              {group.title && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {groups
                  .flatMap((g) => g.items)
                  .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))?.label ?? "Dashboard"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                  {initials(user.name)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-32 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {user.name}
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    {user.roles.join(", ")}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
