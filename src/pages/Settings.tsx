import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  BackupOutlined as BackupIcon,
  CategoryOutlined as CategoryIcon,
  CheckCircleRounded as CheckIcon,
  DarkModeOutlined as DarkIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  FileDownloadOutlined as ExportIcon,
  FileUploadOutlined as ImportIcon,
  Inventory2Outlined as InventoryIcon,
  LightModeOutlined as LightIcon,
  LockOutlined as LockIcon,
  PaletteOutlined as AppearanceIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  StorefrontOutlined as StoreIcon,
  TableChartOutlined as ReportIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  WarningAmberRounded as WarningIcon,
} from '@mui/icons-material';
import { ProductsContext, SalesContext, StoreSettingsContext, ThemeContext } from '../App';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { usePrinter } from '../contexts/PrinterContext';
import { useNotify } from '../contexts/NotificationContext';
import { CATEGORY_ICONS, iconByName } from '../utils/categoryIcons';
import { tracksStock } from '../utils/stock';
import { BACKUP_ITEMS, buildBackup, describeValue, ParsedBackup, parseBackup } from '../utils/backup';
import {
  DEFAULT_LOW_STOCK,
  getLastBackupAt,
  getLoginPassword,
  getLoginUsername,
  getLowStockThreshold,
  hasCustomLogin,
  markBackedUp,
  setLogin,
  setLowStockThreshold,
} from '../utils/preferences';

type SectionId = 'store' | 'categories' | 'printer' | 'appearance' | 'inventory' | 'account' | 'data';

const SECTIONS: Array<{ id: SectionId; label: string; hint: string; Icon: typeof StoreIcon }> = [
  { id: 'store', label: 'Store', hint: 'Name and details printed on receipts', Icon: StoreIcon },
  { id: 'categories', label: 'Categories', hint: 'How products are grouped', Icon: CategoryIcon },
  { id: 'printer', label: 'Receipt printer', hint: 'Thermal printer and test print', Icon: PrintIcon },
  { id: 'appearance', label: 'Appearance', hint: 'Light or dark', Icon: AppearanceIcon },
  { id: 'inventory', label: 'Inventory', hint: 'Low-stock level', Icon: InventoryIcon },
  { id: 'account', label: 'Account & security', hint: 'Login name and password', Icon: LockIcon },
  { id: 'data', label: 'Backup & data', hint: 'Back up, restore, reports', Icon: BackupIcon },
];

const daysAgo = (date: Date) => Math.floor((Date.now() - date.getTime()) / 86400000);

const SectionHeader: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2.5 }}>
    <Box>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
    {action}
  </Box>
);

const Panel: React.FC<{ title: string; children: React.ReactNode; tone?: 'error' }> = ({ title, children, tone }) => (
  <Box sx={{ border: 1, borderColor: tone ? 'error.main' : 'divider', borderRadius: '12px', p: 2, mb: 2 }}>
    <Typography variant="subtitle2" color={tone ? 'error.main' : 'text.primary'} sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const Settings: React.FC = () => {
  const { setThemeName, themeName } = useContext(ThemeContext);
  const storeSettings = useContext(StoreSettingsContext);
  const salesContext = useContext(SalesContext);
  const productsContext = useContext(ProductsContext);
  const { printers, selectedPrinter, setSelectedPrinter, refreshPrinters, testPrint, isLoading } = usePrinter();
  const notify = useNotify();

  const [section, setSection] = useState<SectionId>('store');

  // ---------- store ----------
  const savedStore = {
    storeName: storeSettings.storeName || '',
    storeAddress: storeSettings.storeAddress || '',
    phoneNumber: storeSettings.phoneNumber || '',
    email: storeSettings.email || '',
    birNumber: storeSettings.birNumber || '',
  };
  const [storeForm, setStoreForm] = useState(savedStore);
  const storeDirty = (Object.keys(savedStore) as Array<keyof typeof savedStore>).some((k) => storeForm[k] !== savedStore[k]);
  const saveStore = (e: React.FormEvent) => {
    e.preventDefault();
    storeSettings.updateStoreSettings({ ...storeForm, storeName: storeForm.storeName.trim(), storeAddress: storeForm.storeAddress.trim() });
    notify('Store details saved', 'success');
  };

  // ---------- categories ----------
  const { categories, products } = productsContext;
  const productCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [products]);
  const [categoryDialog, setCategoryDialog] = useState<{ id: string | null; name: string; icon: string } | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const categoryFileRef = useRef<HTMLInputElement>(null);

  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryDialog) return;
    const name = categoryDialog.name.trim();
    if (!name) return setCategoryError('Give the category a name');
    const clash = categories.find((c) => c.id !== categoryDialog.id && c.name.toLowerCase() === name.toLowerCase());
    if (clash) return setCategoryError(`“${clash.name}” already exists`);
    if (categoryDialog.id) {
      const original = categories.find((c) => c.id === categoryDialog.id)!;
      productsContext.updateCategory({ ...original, name, icon: categoryDialog.icon });
      // Products point at their category by name, so a rename carries them along
      if (original.name !== name) {
        const moved = products.filter((p) => p.category === original.name).length;
        if (moved) productsContext.importProducts(products.map((p) => (p.category === original.name ? { ...p, category: name } : p)));
        notify(`Renamed to ${name}${moved ? ` · ${moved} product${moved !== 1 ? 's' : ''} moved with it` : ''}`, 'success');
      } else {
        notify(`Saved ${name}`, 'success');
      }
    } else {
      productsContext.addCategory({ id: Date.now().toString(), name, icon: categoryDialog.icon });
      notify(`Added ${name}`, 'success');
    }
    setCategoryDialog(null);
  };

  const deleteCategory = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    productsContext.deleteCategory(id);
    notify(`Deleted ${category.name}`, { severity: 'info', action: { label: 'Undo', onClick: () => productsContext.addCategory(category) } });
  };

  const exportCategories = () => {
    const q = (t: string) => `"${t.replace(/"/g, '""')}"`;
    const csv = ['id,name,icon', ...categories.map((c) => [q(c.id), q(c.name), q(c.icon ?? '')].join(','))].join('\n');
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `categories_${new Date().toISOString().split('T')[0]}.csv`);
    notify(`Exported ${categories.length} categories`, 'success');
  };

  const importCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = String(e.target?.result ?? '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      // Split on commas outside quotes
      const cells = (line: string) => (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
      const header = lines[0] ? cells(lines[0]).map((h) => h.toLowerCase()) : [];
      const hasHeader = header.includes('name');
      const nameAt = hasHeader ? header.indexOf('name') : 1;
      const idAt = hasHeader ? header.indexOf('id') : 0;
      const iconAt = hasHeader ? header.indexOf('icon') : -1;
      let added = 0;
      const known = new Set(categories.map((c) => c.name.toLowerCase()));
      (hasHeader ? lines.slice(1) : lines).forEach((line, i) => {
        const row = cells(line);
        const name = row[nameAt] ?? '';
        if (!name || known.has(name.toLowerCase())) return;
        known.add(name.toLowerCase());
        productsContext.addCategory({ id: (idAt >= 0 && row[idAt]) || `${Date.now()}${i}`, name, icon: (iconAt >= 0 && row[iconAt]) || undefined });
        added += 1;
      });
      notify(added ? `Imported ${added} new categor${added !== 1 ? 'ies' : 'y'}` : 'Every category in that file already exists', added ? 'success' : 'info');
    };
    reader.readAsText(file);
  };

  // ---------- inventory ----------
  const [lowStock, setLowStock] = useState(String(getLowStockThreshold()));

  // ---------- account ----------
  const [account, setAccount] = useState({ current: '', username: getLoginUsername(), password: '', confirm: '' });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState(false);
  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (account.current !== getLoginPassword()) errors.current = 'That isn’t the current password';
    if (!account.username.trim()) errors.username = 'Enter a username';
    if (account.password && account.password.length < 4) errors.password = 'Use at least 4 characters';
    if (account.password !== account.confirm) errors.confirm = 'The passwords don’t match';
    setAccountErrors(errors);
    if (Object.keys(errors).length) return;
    setLogin(account.username.trim(), account.password || getLoginPassword());
    setAccount({ current: '', username: account.username.trim(), password: '', confirm: '' });
    notify(account.password ? 'Login name and password updated' : 'Login name updated', 'success');
  };

  // ---------- backup & data ----------
  const [lastBackup, setLastBackup] = useState(getLastBackupAt);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<(ParsedBackup & { fileName: string }) | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseText, setEraseText] = useState('');

  const downloadBackup = () => {
    const backup = buildBackup();
    saveAs(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `pos_backup_${backup.exportedAt.slice(0, 10)}.json`);
    markBackedUp();
    setLastBackup(getLastBackupAt());
    notify(`Backup saved: ${Object.keys(backup.data).length} kinds of data`, 'success');
  };

  const chooseRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseBackup(String(e.target?.result ?? ''));
      if ('error' in parsed) notify(parsed.error, 'error');
      else if (Object.keys(parsed.data).length === 0) notify('That backup is empty', 'warning');
      else setRestore({ ...parsed, fileName: file.name });
    };
    reader.readAsText(file);
  };

  // Every page reads its data when it loads, so the app reloads after a restore or erase
  const applyRestore = () => {
    if (!restore) return;
    for (const [key, value] of Object.entries(restore.data)) localStorage.setItem(key, value);
    window.location.reload();
  };

  const eraseAll = () => {
    for (const { key, erasable } of BACKUP_ITEMS) if (erasable) localStorage.removeItem(key);
    localStorage.removeItem('pos_basket');
    sessionStorage.removeItem('pos_basket');
    window.location.reload();
  };

  const handleExportSales = async () => {
    let sales = salesContext.sales;
    if (!sales || sales.length === 0) {
      notify('No sales data to export', 'warning');
      return;
    }

    // Calculate totals for different categories
    const generalSales = sales.filter(sale => sale.type === 'general');
    const storeSales = sales.filter(sale => sale.type === 'store');
    const loadSales = sales.filter(sale => sale.type === 'load');
    
    const generalTotal = generalSales.reduce((sum, sale) => sum + sale.total, 0);
    const storeCashierTotal = storeSales.filter(sale => sale.paymentMethod === 'cashier').reduce((sum, sale) => sum + sale.total, 0);
    const storeGcashTotal = storeSales.filter(sale => sale.paymentMethod === 'gcash').reduce((sum, sale) => sum + sale.total, 0);
    const loadTotal = loadSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalGrossSales = generalTotal + storeCashierTotal + storeGcashTotal + loadTotal;
    
    // Create new workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    
    // Define colors
    const colors = {
      header: 'FF2E7D32', // Dark green
      general: 'FF4CAF50', // Light green
      store: 'FF2196F3', // Blue
      load: 'FFFF9800', // Orange
      totals: 'FF9C27B0', // Purple
      text: 'FF000000', // Black
      lightGray: 'FFF5F5F5', // Light gray
      border: 'FFCCCCCC' // Gray border
    };
    
    worksheet.columns = [
      { header: 'Sales Report', key: 'report', width: 25 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Payment Method', key: 'payment', width: 15 },
      { header: 'Category', key: 'category', width: 15 }
    ];
    
    let currentRow = 1;
    
    // Add title
    const titleRow = worksheet.addRow(['SALES REPORT', '', '', '', '', '', '', '']);
    titleRow.font = { size: 16, bold: true, color: { argb: colors.header } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightGray } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A1:H1');
    currentRow++;
    
    // Add date
    const dateRow = worksheet.addRow([`Report Date: ${new Date().toLocaleDateString()}`, '', '', '', '', '', '', '']);
    dateRow.font = { size: 12, italic: true, color: { argb: colors.text } };
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    currentRow += 2;
    
    // Add General Sales section
    if (generalSales.length > 0) {
      worksheet.addRow(['GENERAL SALES', '', '', '', '', '', '', '']);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const mergedCell = worksheet.getCell(`A${currentRow}`);
      mergedCell.value = 'GENERAL SALES';
      mergedCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.general } };
      mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;
      
      // Add column headers for this section
      const headerRow = worksheet.addRow(['', 'Date', 'Item', 'Qty', 'Price', 'Total', 'Payment', 'Category']);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightGray } };
      currentRow++;
      
      generalSales.forEach((sale: any) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        sale.items.forEach((item: any, index: number) => {
          const isFirstItem = index === 0;
          const dataRow = worksheet.addRow([
            '',
            isFirstItem ? date : '',
            item.name,
            item.quantity,
            parseFloat(item.price.toFixed(2)),
            parseFloat((item.price * item.quantity).toFixed(2)),
            'Cash',
            'General Sales'
          ]);
          
          // Alternate row colors
          if (currentRow % 2 === 0) {
            dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
          }
          currentRow++;
        });
      });
      
      // Add subtotal
      const subtotalRow = worksheet.addRow(['', '', '', '', 'SUBTOTAL:', parseFloat(generalTotal.toFixed(2)), '', '']);
      subtotalRow.font = { bold: true };
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
      currentRow += 2;
    }

    // Add Store Purchases (Cashier) section
    const storeCashierSales = storeSales.filter(sale => sale.paymentMethod === 'cashier');
    if (storeCashierSales.length > 0) {
      worksheet.addRow(['STORE PURCHASES (CASHIER)', '', '', '', '', '', '', '']);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const mergedCell = worksheet.getCell(`A${currentRow}`);
      mergedCell.value = 'STORE PURCHASES (CASHIER)';
      mergedCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.store } };
      mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;
      
      // Add column headers for this section
      const headerRow = worksheet.addRow(['', 'Date', 'Item', 'Qty', 'Price', 'Total', 'Payment', 'Category']);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightGray } };
      currentRow++;
      
      storeCashierSales.forEach((sale: any) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        sale.items.forEach((item: any, index: number) => {
          const isFirstItem = index === 0;
          const dataRow = worksheet.addRow([
            '',
            isFirstItem ? date : '',
            item.name,
            item.quantity,
            parseFloat(item.price.toFixed(2)),
            parseFloat((item.price * item.quantity).toFixed(2)),
            'Cashier',
            'Store Purchase'
          ]);
          
          // Alternate row colors
          if (currentRow % 2 === 0) {
            dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
          }
          currentRow++;
        });
      });
      
      // Add subtotal
      const subtotalRow = worksheet.addRow(['', '', '', '', 'SUBTOTAL:', parseFloat(storeCashierTotal.toFixed(2)), '', '']);
      subtotalRow.font = { bold: true };
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      currentRow += 2;
    }

    // Add Store Purchases (GCash) section
    const storeGcashSales = storeSales.filter(sale => sale.paymentMethod === 'gcash');
    if (storeGcashSales.length > 0) {
      worksheet.addRow(['STORE PURCHASES (GCASH)', '', '', '', '', '', '', '']);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const mergedCell = worksheet.getCell(`A${currentRow}`);
      mergedCell.value = 'STORE PURCHASES (GCASH)';
      mergedCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.store } };
      mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;
      
      // Add column headers for this section
      const headerRow = worksheet.addRow(['', 'Date', 'Item', 'Qty', 'Price', 'Total', 'Payment', 'Category']);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightGray } };
      currentRow++;
      
      storeGcashSales.forEach((sale: any) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        sale.items.forEach((item: any, index: number) => {
          const isFirstItem = index === 0;
          const dataRow = worksheet.addRow([
            '',
            isFirstItem ? date : '',
            item.name,
            item.quantity,
            parseFloat(item.price.toFixed(2)),
            parseFloat((item.price * item.quantity).toFixed(2)),
            'GCash',
            'Store Purchase'
          ]);
          
          // Alternate row colors
          if (currentRow % 2 === 0) {
            dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
          }
          currentRow++;
        });
      });
      
      // Add subtotal
      const subtotalRow = worksheet.addRow(['', '', '', '', 'SUBTOTAL:', parseFloat(storeGcashTotal.toFixed(2)), '', '']);
      subtotalRow.font = { bold: true };
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      currentRow += 2;
    }

    // Add Load Sales section
    if (loadSales.length > 0) {
      worksheet.addRow(['LOAD SALES', '', '', '', '', '', '', '']);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const mergedCell = worksheet.getCell(`A${currentRow}`);
      mergedCell.value = 'LOAD SALES';
      mergedCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.load } };
      mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;
      
      // Add column headers for this section
      const headerRow = worksheet.addRow(['', 'Date', 'Item', 'Qty', 'Price', 'Total', 'Payment', 'Category']);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightGray } };
      currentRow++;
      
      loadSales.forEach((sale: any) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        sale.items.forEach((item: any, index: number) => {
          const isFirstItem = index === 0;
          const dataRow = worksheet.addRow([
            '',
            isFirstItem ? date : '',
            item.name,
            item.quantity,
            parseFloat(item.price.toFixed(2)),
            parseFloat((item.price * item.quantity).toFixed(2)),
            'Load',
            'Load Sales'
          ]);
          
          // Alternate row colors
          if (currentRow % 2 === 0) {
            dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
          }
          currentRow++;
        });
      });
      
      // Add subtotal
      const subtotalRow = worksheet.addRow(['', '', '', '', 'SUBTOTAL:', parseFloat(loadTotal.toFixed(2)), '', '']);
      subtotalRow.font = { bold: true };
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
      currentRow += 2;
    }

    // Add summary totals section
    worksheet.addRow(['SUMMARY TOTALS', '', '', '', '', '', '', '']);
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const mergedCell = worksheet.getCell(`A${currentRow}`);
    mergedCell.value = 'SUMMARY TOTALS';
    mergedCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totals } };
    mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;
    
    // Add individual totals
    const totals = [
      ['General Sales:', parseFloat(generalTotal.toFixed(2))],
      ['Store Purchases (Cashier):', parseFloat(storeCashierTotal.toFixed(2))],
      ['Store Purchases (GCash):', parseFloat(storeGcashTotal.toFixed(2))],
      ['Load Sales:', parseFloat(loadTotal.toFixed(2))]
    ];
    
    totals.forEach(([label, amount]) => {
      const totalRow = worksheet.addRow(['', '', label, '', '', amount, '', '']);
      totalRow.font = { bold: true, size: 12 };
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
      currentRow++;
    });
    
    // Add grand total
    const grandTotalRow = worksheet.addRow(['', '', 'TOTAL SALES:', '', '', parseFloat(totalGrossSales.toFixed(2)), '', '']);
    grandTotalRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    grandTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totals } };
    currentRow++;
    
    // Add borders to all cells
    worksheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any) => {
        cell.border = {
          top: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } }
        };
      });
    });
    
    // Generate and download the file
    const buffer = await (workbook as any).xlsx.writeBuffer();
    const data = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('Sales report downloaded', 'success');
  };

  // ---------- render ----------

  const backupAge = lastBackup ? daysAgo(lastBackup) : null;
  const backupStale = backupAge === null || backupAge >= 7;
  const current = SECTIONS.find((s) => s.id === section)!;

  const body = (() => {
    switch (section) {
      case 'store':
        return (
          <Box component="form" onSubmit={saveStore} noValidate>
            <SectionHeader title="Store" description="These details appear at the top of every receipt." />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 280px' }, gap: 3, alignItems: 'start' }}>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField label="Store name" value={storeForm.storeName} onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })} />
                <TextField label="Address" value={storeForm.storeAddress} onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })} multiline minRows={2} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField label="Phone" value={storeForm.phoneNumber} onChange={(e) => setStoreForm({ ...storeForm, phoneNumber: e.target.value })} inputProps={{ inputMode: 'tel' }} />
                  <TextField label="Email" value={storeForm.email} onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })} inputProps={{ inputMode: 'email' }} />
                </Box>
                <TextField label="BIR / TIN number" value={storeForm.birNumber} onChange={(e) => setStoreForm({ ...storeForm, birNumber: e.target.value })} helperText="Printed under the address" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button type="submit" variant="contained" disabled={!storeDirty}>
                    Save
                  </Button>
                  {storeDirty && (
                    <>
                      <Button color="inherit" onClick={() => setStoreForm(savedStore)}>
                        Discard
                      </Button>
                      <Typography variant="caption" color="warning.main" fontWeight={700}>
                        Unsaved changes
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                  RECEIPT PREVIEW
                </Typography>
                <Box
                  sx={{
                    bgcolor: '#fff',
                    color: '#111',
                    fontFamily: '"Consolas", "Courier New", monospace',
                    fontSize: 12,
                    lineHeight: 1.5,
                    p: 2,
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{storeForm.storeName || 'Store name'}</div>
                  <div style={{ whiteSpace: 'pre-line' }}>{storeForm.storeAddress || 'Address'}</div>
                  {storeForm.phoneNumber && <div>Tel: {storeForm.phoneNumber}</div>}
                  {storeForm.birNumber && <div>BIR No: {storeForm.birNumber}</div>}
                  <div style={{ margin: '8px 0', borderTop: '1px dashed #999' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Coke Mismo x2</span>
                    <span>30.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>TOTAL</span>
                    <span>30.00</span>
                  </div>
                </Box>
              </Box>
            </Box>
          </Box>
        );

      case 'categories':
        return (
          <Box>
            <SectionHeader
              title="Categories"
              description={`${categories.length} categories. Renaming one moves its products along with it.`}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <input ref={categoryFileRef} type="file" accept=".csv" hidden onChange={importCategories} />
                  <Tooltip title="Import categories from CSV">
                    <IconButton aria-label="Import categories" onClick={() => categoryFileRef.current?.click()}>
                      <ImportIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export categories as CSV">
                    <IconButton aria-label="Export categories" onClick={exportCategories} disabled={categories.length === 0}>
                      <ExportIcon />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setCategoryDialog({ id: null, name: '', icon: 'CategoryIcon' });
                      setCategoryError('');
                    }}
                  >
                    Add category
                  </Button>
                </Box>
              }
            />
            {categories.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No categories yet. Add one, or type a new category name while adding a product.
              </Typography>
            ) : (
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                {[...categories]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => {
                    const count = productCount.get(c.name) ?? 0;
                    return (
                      <Box
                        key={c.id}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' }, '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '9px',
                            display: 'grid',
                            placeItems: 'center',
                            color: 'primary.main',
                            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
                            '& svg': { fontSize: 18 },
                          }}
                        >
                          {iconByName(c.icon)}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap>
                            {c.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {count} product{count !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        <Tooltip title="Edit">
                          <IconButton
                            aria-label={`Edit ${c.name}`}
                            onClick={() => {
                              setCategoryDialog({ id: c.id, name: c.name, icon: c.icon || 'CategoryIcon' });
                              setCategoryError('');
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={count ? `Move its ${count} product${count !== 1 ? 's' : ''} first (Products › select › Move to category)` : 'Delete'}>
                          <span>
                            <IconButton aria-label={`Delete ${c.name}`} disabled={count > 0} onClick={() => deleteCategory(c.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Box>
        );

      case 'printer':
        return (
          <Box>
            <SectionHeader
              title="Receipt printer"
              description="The thermal printer used for receipts and the cash drawer."
              action={
                <Button startIcon={<RefreshIcon />} onClick={() => refreshPrinters()} disabled={isLoading}>
                  {isLoading ? 'Scanning…' : 'Scan for printers'}
                </Button>
              }
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
              <TextField
                select
                label="Printer"
                value={selectedPrinter || ''}
                onChange={(e) => setSelectedPrinter(e.target.value || null)}
                sx={{ minWidth: 280, flex: 1 }}
                helperText={`${printers.length} printer${printers.length !== 1 ? 's' : ''} found`}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {printers.map((p) => (
                  <MenuItem key={p.name} value={p.name}>
                    {p.name}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {p.connection} · {p.manufacturer}
                      {p.isDefault ? ' · default' : ''}
                    </Typography>
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                disabled={!selectedPrinter || isLoading}
                onClick={async () => {
                  const ok = await testPrint();
                  notify(ok ? 'Test receipt printed' : 'The test print failed. Check the printer is on and connected.', ok ? 'success' : 'error');
                }}
                sx={{ mb: 2.5 }}
              >
                Test print
              </Button>
            </Box>
            {selectedPrinter ? (
              <Chip icon={<CheckIcon />} color="success" variant="outlined" label={`Using ${selectedPrinter}`} />
            ) : (
              <Panel title={printers.length ? 'Pick a printer above' : 'No printer found'}>
                <Typography variant="body2" color="text.secondary" component="div">
                  Check that the printer is:
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                    <li>connected by USB and switched on</li>
                    <li>an ESC/POS thermal printer (e.g. XP-58)</li>
                    <li>set up with the Python helper (run setup_python.bat once)</li>
                  </ul>
                  Then press Scan for printers.
                </Typography>
              </Panel>
            )}
          </Box>
        );

      case 'appearance':
        return (
          <Box>
            <SectionHeader title="Appearance" description="Applies right away. The sun/moon button in the top bar switches too." />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, maxWidth: 560 }}>
              {(
                [
                  ['light', 'Light', LightIcon, '#f4f5f2', '#ffffff', '#0f766e'],
                  ['dark', 'Dark', DarkIcon, '#0c1211', '#141b1a', '#2dd4bf'],
                ] as const
              ).map(([value, label, Icon, page, card, accent]) => {
                const active = themeName === value;
                return (
                  <Box
                    key={value}
                    component="button"
                    type="button"
                    onClick={() => setThemeName(value)}
                    aria-pressed={active}
                    sx={{
                      textAlign: 'left',
                      font: 'inherit',
                      color: 'text.primary',
                      cursor: 'pointer',
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: 'background.paper',
                      border: 2,
                      borderColor: active ? 'primary.main' : 'divider',
                      '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ height: 90, borderRadius: '8px', bgcolor: page, p: 1, display: 'grid', gridTemplateColumns: '28px 1fr', gap: 0.75, mb: 1.25 }}>
                      <Box sx={{ bgcolor: card, borderRadius: '4px' }} />
                      <Box sx={{ display: 'grid', gap: 0.75, gridTemplateRows: '14px 1fr' }}>
                        <Box sx={{ bgcolor: accent, borderRadius: '4px', width: '40%' }} />
                        <Box sx={{ bgcolor: card, borderRadius: '4px' }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon fontSize="small" />
                      <Typography fontWeight={600} sx={{ flex: 1 }}>
                        {label}
                      </Typography>
                      {active && <CheckIcon color="primary" fontSize="small" />}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 'inventory':
        return (
          <Box>
            <SectionHeader title="Inventory" description="How Products flags items that are running out." />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-start' }}>
              <TextField
                label="Low-stock level"
                type="number"
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
                inputProps={{ min: 0, step: 1 }}
                helperText={`A product with this many or fewer left shows as Low stock. Default ${DEFAULT_LOW_STOCK}.`}
                sx={{ width: 340 }}
              />
              <Button
                variant="contained"
                disabled={!/^\d+$/.test(lowStock) || Number(lowStock) === getLowStockThreshold()}
                onClick={() => {
                  setLowStockThreshold(Number(lowStock));
                  notify(`Low stock now means ${lowStock} or fewer`, 'success');
                }}
                sx={{ mt: 1 }}
              >
                Save
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Of the {products.filter(tracksStock).length} products that track stock, {products.filter((p) => tracksStock(p) && p.quantity > 0 && p.quantity <= (Number(lowStock) || 0)).length} would be
              low and {products.filter((p) => tracksStock(p) && p.quantity <= 0).length} are out. The rest have unlimited stock; switch on Track stock on a product to count it.
            </Typography>
          </Box>
        );

      case 'account':
        return (
          <Box component="form" onSubmit={saveAccount} noValidate sx={{ maxWidth: 440 }}>
            <SectionHeader title="Account & security" description="The name and password used on the login screen." />
            {!hasCustomLogin() && (
              <Panel title="You’re using the default login">
                <Typography variant="body2" color="text.secondary">
                  Anyone who reads the login screen knows it. Set your own password below; the hint disappears from the login screen once you do.
                </Typography>
              </Panel>
            )}
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="Current password"
                type={showPasswords ? 'text' : 'password'}
                value={account.current}
                onChange={(e) => setAccount({ ...account, current: e.target.value })}
                error={Boolean(accountErrors.current)}
                helperText={accountErrors.current || 'Needed to make any change'}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPasswords((v) => !v)} edge="end">
                        {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Username"
                value={account.username}
                onChange={(e) => setAccount({ ...account, username: e.target.value })}
                error={Boolean(accountErrors.username)}
                helperText={accountErrors.username || ' '}
                autoComplete="username"
              />
              <TextField
                label="New password"
                type={showPasswords ? 'text' : 'password'}
                value={account.password}
                onChange={(e) => setAccount({ ...account, password: e.target.value })}
                error={Boolean(accountErrors.password)}
                helperText={accountErrors.password || 'Leave empty to keep the current password'}
                autoComplete="new-password"
              />
              <TextField
                label="Repeat new password"
                type={showPasswords ? 'text' : 'password'}
                value={account.confirm}
                onChange={(e) => setAccount({ ...account, confirm: e.target.value })}
                error={Boolean(accountErrors.confirm)}
                helperText={accountErrors.confirm || ' '}
                autoComplete="new-password"
              />
              <Box>
                <Button type="submit" variant="contained" disabled={!account.current}>
                  Update login
                </Button>
              </Box>
            </Box>
          </Box>
        );

      case 'data':
        return (
          <Box>
            <SectionHeader title="Backup & data" description="Keep a copy of everything on a USB drive or in the cloud." />
            <Panel title="Full backup">
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                {backupStale ? <WarningIcon color="warning" /> : <CheckIcon color="success" />}
                <Typography variant="body2" sx={{ flex: 1, minWidth: 220 }}>
                  {lastBackup ? (
                    <>
                      Last backup <strong>{backupAge === 0 ? 'today' : `${backupAge} day${backupAge !== 1 ? 's' : ''} ago`}</strong> ({lastBackup.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })})
                      {backupStale ? '. Time for a new one.' : '.'}
                    </>
                  ) : (
                    <>
                      <strong>No backup made on this computer yet.</strong> If it breaks, your sales and products are gone.
                    </>
                  )}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Includes {BACKUP_ITEMS.map((i) => i.label.toLowerCase()).join(', ')}. The login password and printer choice stay on this computer.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <input ref={backupFileRef} type="file" accept=".json" hidden onChange={chooseRestoreFile} />
                <Button variant="contained" startIcon={<ExportIcon />} onClick={downloadBackup}>
                  Download backup
                </Button>
                <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => backupFileRef.current?.click()}>
                  Restore from backup…
                </Button>
              </Box>
            </Panel>
            <Panel title="Sales report">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                An Excel report of the current sales. Unlike Sales Record’s Export, this doesn’t add anything to Gross Sales.
              </Typography>
              <Button variant="outlined" startIcon={<ReportIcon />} onClick={handleExportSales} disabled={salesContext.sales.length === 0}>
                Download Excel report
              </Button>
            </Panel>
            <Panel title="Erase all data" tone="error">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Deletes products, categories, sales, receipts, gross sales, customer credit, staff and attendance from this computer. Store details, theme and login stay.
              </Typography>
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setEraseText('');
                  setEraseOpen(true);
                }}
              >
                Erase all data…
              </Button>
            </Panel>
          </Box>
        );
    }
  })();

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          {current.hint}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '240px minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
        {/* Section menu: a column on wide screens, a scrolling row on phones */}
        <Card component="nav" aria-label="Settings sections" sx={{ p: 1, position: { md: 'sticky' }, top: { md: 84 }, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 0.5, overflowX: 'auto' }}>
          {SECTIONS.map(({ id, label, Icon }) => {
            const active = section === id;
            const flag = (id === 'data' && backupStale) || (id === 'account' && !hasCustomLogin());
            return (
              <Box
                key={id}
                component="button"
                type="button"
                onClick={() => setSection(id)}
                aria-current={active ? 'page' : undefined}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  flexShrink: 0,
                  px: 1.5,
                  py: 1,
                  border: 0,
                  borderRadius: '10px',
                  font: 'inherit',
                  fontSize: '0.9375rem',
                  fontWeight: active ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  color: active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.09) : 'transparent',
                  '&:hover': { color: 'text.primary', bgcolor: active ? undefined : 'action.hover' },
                  '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' },
                }}
              >
                <Icon fontSize="small" />
                <span style={{ flex: 1 }}>{label}</span>
                {flag && <Box component="span" aria-label="needs attention" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />}
              </Box>
            );
          })}
        </Card>

        <Card sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>{body}</Card>
      </Box>

      {/* Category editor */}
      <Dialog open={categoryDialog !== null} onClose={() => setCategoryDialog(null)} maxWidth="sm" fullWidth>
        {categoryDialog && (
          <Box component="form" onSubmit={saveCategory} noValidate>
            <DialogTitle>{categoryDialog.id ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField
                autoFocus
                fullWidth
                label="Name"
                value={categoryDialog.name}
                onChange={(e) => {
                  setCategoryDialog({ ...categoryDialog, name: e.target.value });
                  setCategoryError('');
                }}
                error={Boolean(categoryError)}
                helperText={
                  categoryError ||
                  (categoryDialog.id && (productCount.get(categories.find((c) => c.id === categoryDialog.id)?.name ?? '') ?? 0) > 0
                    ? 'Its products will move to the new name'
                    : ' ')
                }
                sx={{ mb: 1 }}
              />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Icon
              </Typography>
              <Box role="radiogroup" aria-label="Category icon" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 0.75 }}>
                {CATEGORY_ICONS.map(({ name, label, Icon }) => {
                  const picked = categoryDialog.icon === name;
                  return (
                    <Tooltip key={name} title={label}>
                      <Box
                        component="button"
                        type="button"
                        role="radio"
                        aria-checked={picked}
                        aria-label={label}
                        onClick={() => setCategoryDialog({ ...categoryDialog, icon: name })}
                        sx={{
                          height: 44,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '10px',
                          border: 2,
                          cursor: 'pointer',
                          borderColor: picked ? 'primary.main' : 'transparent',
                          color: picked ? 'primary.main' : 'text.secondary',
                          bgcolor: picked ? (t) => alpha(t.palette.primary.main, 0.1) : 'action.hover',
                          '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' },
                        }}
                      >
                        <Icon />
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button color="inherit" onClick={() => setCategoryDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* Restore preview */}
      <Dialog open={restore !== null} onClose={() => setRestore(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Restore {restore?.fileName}?</DialogTitle>
        <DialogContent>
          {restore && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {restore.exportedAt ? `Made ${new Date(restore.exportedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}. ` : ''}
                {restore.legacy ? 'An older backup: it only holds sales, receipts and store details. ' : ''}
                These replace what’s on this computer now:
              </Typography>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', mb: 2 }}>
                {BACKUP_ITEMS.filter((i) => restore.data[i.key] !== undefined).map((i) => (
                  <Box key={i.key} sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 0.75, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }}>
                    <Typography variant="body2">{i.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {describeValue(restore.data[i.key])}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="body2">
                Anything not listed stays as it is. <strong>Download a backup of the current data first</strong> if you might need it. The app restarts after restoring.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button color="inherit" onClick={() => setRestore(null)} sx={{ mr: 'auto' }}>
            Cancel
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={downloadBackup}>
            Back up current data
          </Button>
          <Button variant="contained" color="error" onClick={applyRestore}>
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Erase all */}
      <Dialog open={eraseOpen} onClose={() => setEraseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Erase all data?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This can’t be undone. {lastBackup ? `Your last backup is from ${lastBackup.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}.` : 'You haven’t made a backup yet.'} Type <strong>ERASE</strong> to confirm.
          </Typography>
          <TextField fullWidth autoFocus value={eraseText} onChange={(e) => setEraseText(e.target.value)} placeholder="ERASE" inputProps={{ 'aria-label': 'Type ERASE to confirm' }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button color="inherit" onClick={() => setEraseOpen(false)} sx={{ mr: 'auto' }}>
            Cancel
          </Button>
          <Button variant="outlined" onClick={downloadBackup}>
            Back up first
          </Button>
          <Button variant="contained" color="error" disabled={eraseText.trim() !== 'ERASE'} onClick={eraseAll}>
            Erase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
