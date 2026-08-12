import { PurchaseSuggestionsPageClient } from "@/components/screens/purchase-suggestions-page-client";
import { getLatestPurchaseSuggestionSnapshot, getPurchaseSuggestions } from "@/lib/data/catalog";

export default function PurchaseSuggestionsPage() {
  const suggestions = getPurchaseSuggestions();
  const latestSnapshot = getLatestPurchaseSuggestionSnapshot();

  return <PurchaseSuggestionsPageClient suggestions={suggestions} latestSnapshot={latestSnapshot} />;
}

