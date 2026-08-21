export const formatCurrency = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(n);
};

export const formatNumber = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-PK").format(n);
};

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const initials = (name?: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};
