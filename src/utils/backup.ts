// A full backup is every piece of business data, stored exactly as the app keeps it.
// Device-only items (selected printer, open basket) and the login password are left out.

export const BACKUP_ITEMS: Array<{ key: string; label: string; erasable: boolean }> = [
  { key: 'pos_products', label: 'Products', erasable: true },
  { key: 'pos_categories', label: 'Categories', erasable: true },
  { key: 'pos_sales', label: 'Current sales', erasable: true },
  { key: 'pos_receipts', label: 'Receipts', erasable: true },
  { key: 'pos_cleared_sales_history', label: 'Sales history', erasable: true },
  { key: 'pos_gross_sales', label: 'Monthly gross sales', erasable: true },
  { key: 'pos_daily_sales', label: 'Daily gross sales', erasable: true },
  { key: 'customerCredits', label: 'Customer credit', erasable: true },
  { key: 'pos_staff', label: 'Staff', erasable: true },
  { key: 'pos_attendance', label: 'Attendance', erasable: true },
  { key: 'pos_store_settings', label: 'Store information', erasable: false },
  { key: 'pos_theme_name', label: 'Theme', erasable: false },
  { key: 'pos_low_stock_threshold', label: 'Low-stock level', erasable: false },
];

export type BackupFile = { app: 'pos-system'; version: 2; exportedAt: string; data: Record<string, string> };

export const buildBackup = (): BackupFile => {
  const data: Record<string, string> = {};
  for (const { key } of BACKUP_ITEMS) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { app: 'pos-system', version: 2, exportedAt: new Date().toISOString(), data };
};

/** How many entries a stored value holds, for previews ("1,204 products"). */
export const describeValue = (raw: string): string => {
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) return `${value.length.toLocaleString()} item${value.length !== 1 ? 's' : ''}`;
    if (value && typeof value === 'object') {
      const count = Object.keys(value).length;
      return `${count} entr${count !== 1 ? 'ies' : 'y'}`;
    }
  } catch {
    // plain text values such as the theme name
  }
  return raw.length > 24 ? 'saved' : raw;
};

export type ParsedBackup = { exportedAt: string | null; data: Record<string, string>; legacy: boolean };

/** Reads this app's backups, including the older sales-only format. Returns null for anything else. */
export const parseBackup = (text: string): ParsedBackup | { error: string } => {
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: 'That file isn’t a backup (it isn’t valid JSON).' };
  }
  if (json?.app === 'pos-system' && json.data && typeof json.data === 'object') {
    const data: Record<string, string> = {};
    for (const { key } of BACKUP_ITEMS) if (typeof json.data[key] === 'string') data[key] = json.data[key];
    return { exportedAt: json.exportedAt ?? null, data, legacy: false };
  }
  if (json?.credits && !json.sales) {
    return { error: 'That’s a Customer Credit backup. Restore it from the Customer Credit page (Import).' };
  }
  // Earlier versions saved only sales, receipts and store details
  if (json && (json.sales || json.receipts || json.settings)) {
    const data: Record<string, string> = {};
    if (Array.isArray(json.sales)) data.pos_sales = JSON.stringify(json.sales);
    if (Array.isArray(json.receipts)) data.pos_receipts = JSON.stringify(json.receipts);
    if (json.settings) {
      const { theme, ...store } = json.settings;
      data.pos_store_settings = JSON.stringify(store);
      if (typeof theme === 'string') data.pos_theme_name = theme;
    }
    return { exportedAt: json.timestamp ?? null, data, legacy: true };
  }
  return { error: 'That file isn’t a backup from this app.' };
};
