import { SettingsPageClient } from "@/components/screens/settings-page-client";
import { getBusinessSettings } from "@/lib/data/catalog";

export default function SettingsPage() {
  const settings = getBusinessSettings() ?? null;

  return <SettingsPageClient settings={settings} />;
}
