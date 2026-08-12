import { FinancePageClient } from "@/components/screens/finance-page-client";
import { getMonthlyLedgerOverviewById } from "@/lib/data/catalog";

type FinancePageProps = {
  searchParams: Promise<{
    ledger?: string;
  }>;
};

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const { ledger: ledgerId } = await searchParams;
  const overview = getMonthlyLedgerOverviewById(ledgerId);

  return (
    <FinancePageClient
      ledger={overview.ledger}
      lines={overview.lines.map((line) => ({
        ...line,
        type: line.type as "income" | "fixed" | "variable",
      }))}
      ledgers={overview.ledgers}
    />
  );
}
