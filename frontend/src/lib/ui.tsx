"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/* ---------- Button ---------- */
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40 shadow-sm",
  secondary:
    "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 focus-visible:ring-zinc-500/40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
  outline:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40 shadow-sm",
  success:
    "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/40 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  icon: "h-9 w-9",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Inputs ---------- */
const fieldBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-20", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}

export function Field({ label, children, required, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
type BadgeTone =
  | "green"
  | "red"
  | "amber"
  | "blue"
  | "zinc"
  | "violet";

const badgeTones: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400",
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400",
};

export function Badge({
  tone = "zinc",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export const statusTone = (status: string): BadgeTone => {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
    case "SUCCESS":
    case "PAID":
    case "ACTIVE":
      return "green";
    case "DRAFT":
    case "PENDING":
    case "PARTIAL":
    case "PROCESSING":
      return "amber";
    case "CANCELLED":
    case "FAILED":
    case "INACTIVE":
    case "OVERDUE":
      return "red";
    default:
      return "zinc";
  }
};

/* ---------- Table ---------- */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">{children}</tbody>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-zinc-700 dark:text-zinc-300", className)}>{children}</td>;
}

export function EmptyState({ message = "No records found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="text-2xl">🗂️</div>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">Total {total} records</p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs text-zinc-600 dark:text-zinc-300">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:py-10">
      <div
        className={cn(
          "w-full rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className={cn("h-6 w-6 animate-spin text-emerald-600", className)} />
    </div>
  );
}
