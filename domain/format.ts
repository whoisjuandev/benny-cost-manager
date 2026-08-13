// Pure formatters — no React, no business logic beyond presentation.
const CURRENCY_NUMBER = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export const PCT = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const NUM = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

export const formatCurrency = (n: number, currencySymbol = "$") => `${currencySymbol} ${CURRENCY_NUMBER.format(n)}`;
export const formatPercent = (n: number) => PCT.format(n);
export const formatNumber = (n: number) => NUM.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const daysSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
