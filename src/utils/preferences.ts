// Small settings kept on this device and read by more than one page.

const LOW_STOCK_KEY = 'pos_low_stock_threshold';
export const DEFAULT_LOW_STOCK = 5;

/** Products at or below this quantity count as low stock. */
export const getLowStockThreshold = () => {
  const value = parseInt(localStorage.getItem(LOW_STOCK_KEY) ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_LOW_STOCK;
};

export const setLowStockThreshold = (value: number) => localStorage.setItem(LOW_STOCK_KEY, String(Math.max(0, Math.round(value))));

const LAST_BACKUP_KEY = 'pos_last_backup_at';
export const getLastBackupAt = (): Date | null => {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  return raw ? new Date(raw) : null;
};
export const markBackedUp = () => localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());

// The login account. Before anyone changes it, the default Admin / 000000 applies.
export const DEFAULT_USERNAME = 'Admin';
export const DEFAULT_PASSWORD = '000000';
export const getLoginUsername = () => localStorage.getItem('pos_username') || DEFAULT_USERNAME;
export const getLoginPassword = () => localStorage.getItem('pos_password') || DEFAULT_PASSWORD;
export const hasCustomLogin = () => localStorage.getItem('pos_password') !== null;
export const setLogin = (username: string, password: string) => {
  localStorage.setItem('pos_username', username);
  localStorage.setItem('pos_password', password);
};
