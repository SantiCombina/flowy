import { getSettings } from '@/app/services/settings';
import { SettingsProvider, type SettingsData } from '@/contexts/settings-context';
import { DEFAULT_ITEMS_PER_PAGE } from '@/lib/constants/table-columns';

interface SettingsFetcherProps {
  userId: number;
  children: React.ReactNode;
}

export async function SettingsFetcher({ userId, children }: SettingsFetcherProps) {
  const rawSettings = await getSettings(userId);

  const initialSettings: SettingsData = {
    id: rawSettings.id,
    productsColumns: rawSettings.productsColumns?.map((c) => c.column) ?? [],
    clientsColumns: rawSettings.clientsColumns?.map((c) => c.column) ?? [],
    salesColumns: rawSettings.salesColumns?.map((c) => c.column) ?? [],
    assignmentsColumns: rawSettings.assignmentsColumns?.map((c) => c.column) ?? [],
    historyColumns: rawSettings.historyColumns?.map((c) => c.column) ?? [],
    sellersColumns: rawSettings.sellersColumns?.map((c) => c.column) ?? [],
    budgetsColumns: rawSettings.budgetsColumns?.map((c) => c.column) ?? [],
    itemsPerPage: rawSettings.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE.toString(),
  };

  return <SettingsProvider initialSettings={initialSettings}>{children}</SettingsProvider>;
}
