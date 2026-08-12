import { SuppliersPageClient } from "@/components/screens/suppliers-page-client";
import { getSuppliers } from "@/lib/data/catalog";

export default function SuppliersPage() {
  const suppliers = getSuppliers();

  return <SuppliersPageClient suppliers={suppliers} />;
}

