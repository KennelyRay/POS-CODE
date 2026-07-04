import React, { useEffect, useMemo, useState, useContext } from 'react';
import {
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Card,
  CardContent,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Avatar,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Stack,
  Chip,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalAtm as LoadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Clear as ClearIcon,
  AccountBalanceWallet as CashierIcon,
  QrCode as GcashIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { GrossSalesContext, SaleRecord, SalesContext } from '../App';
import { useTheme } from '@mui/material/styles';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

type SalesCol = 'general' | 'store-cashier' | 'store-gcash' | 'globe' | 'smart';

type ClearedSalesBatch = {
  id: string;
  clearedAt: string;
  reason: 'clear-all' | 'export-and-clear';
  sales: SaleRecord[];
};

const CLEARED_SALES_HISTORY_KEY = 'pos_cleared_sales_history';

// Add type guard for load network
function isLoadNetwork(col: SalesCol): col is 'globe' | 'smart' {
  return col === 'globe' || col === 'smart';
}

// Add type guard for store purchase
function isStorePurchase(col: SalesCol): col is 'store-cashier' | 'store-gcash' {
  return col === 'store-cashier' || col === 'store-gcash';
}

const SalesRecord: React.FC = () => {
  const salesContext = useContext(SalesContext);
  const grossSalesContext = useContext(GrossSalesContext);
  const sales = salesContext.sales;
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({ open: false, message: '', severity: 'success' });
  const theme = useTheme();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [clearedSalesHistory, setClearedSalesHistory] = useState<ClearedSalesBatch[]>(() => {
    const stored = localStorage.getItem(CLEARED_SALES_HISTORY_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as ClearedSalesBatch[];
    } catch {
      return [];
    }
  });

  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem(CLEARED_SALES_HISTORY_KEY, JSON.stringify(clearedSalesHistory));
  }, [clearedSalesHistory]);

  const addToClearedHistory = (batchSales: SaleRecord[], reason: ClearedSalesBatch['reason']) => {
    if (!batchSales.length) return;
    const entry: ClearedSalesBatch = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      clearedAt: new Date().toISOString(),
      reason,
      sales: batchSales,
    };
    setClearedSalesHistory((prev) => [entry, ...prev]);
  };

  const deleteClearedHistory = (idsToDelete: string[]) => {
    if (!idsToDelete.length) return;
    setClearedSalesHistory((prev) => prev.filter((h) => !idsToDelete.includes(h.id)));
    setSelectedHistoryIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    setSnackbar({ open: true, message: 'History deleted successfully', severity: 'success' });
  };

  const historyByMonth = useMemo(() => {
    const buckets = new Map<string, { label: string; items: ClearedSalesBatch[] }>();
    for (const entry of clearedSalesHistory) {
      const d = new Date(entry.clearedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const existing = buckets.get(key);
      if (existing) existing.items.push(entry);
      else buckets.set(key, { label, items: [entry] });
    }
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => {
      const bucket = buckets.get(key)!;
      bucket.items.sort((a, b) => new Date(b.clearedAt).getTime() - new Date(a.clearedAt).getTime());
      return { key, label: bucket.label, items: bucket.items };
    });
  }, [clearedSalesHistory]);

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const setHistorySelection = (ids: string[], selected: boolean) => {
    setSelectedHistoryIds((prev) => {
      if (selected) {
        const set = new Set(prev);
        for (const id of ids) set.add(id);
        return Array.from(set);
      }
      return prev.filter((id) => !ids.includes(id));
    });
  };

  // Inline input state for each column
  const [inputs, setInputs] = useState<Record<SalesCol, { name: string; price: string }>>({
    general: { name: '', price: '' },
    'store-cashier': { name: '', price: '' },
    'store-gcash': { name: '', price: '' },
    globe: { name: '', price: '' },
    smart: { name: '', price: '' },
  });

  // Add state for load network
  const [loadNetwork, setLoadNetwork] = useState<'globe' | 'smart'>('globe');

  // Add state for unlisted item input (only price needed now)
  const [unlistedInput, setUnlistedInput] = useState<{ price: string }>({ price: '' });

  const handleInputChange = (col: SalesCol, field: string, value: string) => {
    setInputs((prev) => ({ ...prev, [col]: { ...prev[col], [field]: value } }));
  };

  // Add handler for unlisted item input (only price)
  const handleUnlistedInputChange = (value: string) => {
    setUnlistedInput({ price: value });
  };

  // Add handler for adding unlisted items
  const handleAddUnlistedItem = () => {
    if (!unlistedInput.price || isNaN(Number(unlistedInput.price)) || Number(unlistedInput.price) <= 0) {
      setSnackbar({ open: true, message: 'Please enter a valid price for unlisted sales.', severity: 'error' });
      return;
    }
    
    const sale = {
      id: Date.now().toString(),
      date: new Date(),
      items: [{ name: 'Unlisted Sales', quantity: 1, price: Number(unlistedInput.price) }],
      total: Number(unlistedInput.price),
      type: 'general' as const,
    };
    salesContext.addSale(sale);
    setSnackbar({ open: true, message: 'Unlisted sales added!', severity: 'success' });
    setUnlistedInput({ price: '' });
  };

  const handleUnlistedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddUnlistedItem();
    }
  };

  const handleAddSale = (col: SalesCol) => {
    const input = inputs[col];
    if (isLoadNetwork(col)) {
      const network: 'globe' | 'smart' = col;
      if (!input.price || isNaN(Number(input.price)) || Number(input.price) <= 0) {
        setSnackbar({ open: true, message: 'Please enter a valid price.', severity: 'error' });
        return;
      }
      const sale = {
        id: Date.now().toString(),
        date: new Date(),
        items: [{ name: `Load (${network.charAt(0).toUpperCase() + network.slice(1)})`, quantity: 1, price: Number(input.price) }],
        total: Number(input.price),
        type: 'load' as const,
      };
      salesContext.addSale(sale);
      setSnackbar({ open: true, message: 'Sale added!', severity: 'success' });
      setInputs((prev) => ({ ...prev, [col]: { name: '', price: '' } }));
      return;
    } else if (col === 'general' || isStorePurchase(col)) {
      if (!input.name || !input.price || isNaN(Number(input.price)) || Number(input.price) <= 0) {
        setSnackbar({ open: true, message: 'Please enter a valid name and price.', severity: 'error' });
        return;
      }
      
      // For store purchases, we need to store the payment method in the sale
      const saleType: 'general' | 'store' = isStorePurchase(col) ? 'store' : 'general';
      const paymentMethod: 'cashier' | 'gcash' | undefined = col === 'store-cashier' ? 'cashier' : col === 'store-gcash' ? 'gcash' : undefined;
      
      const sale = {
        id: Date.now().toString(),
        date: new Date(),
        items: [{ name: input.name, quantity: 1, price: Number(input.price) }],
        total: Number(input.price),
        type: saleType,
        paymentMethod: paymentMethod, // Add payment method to distinguish cashier vs gcash
      };
      salesContext.addSale(sale);
      setSnackbar({ open: true, message: 'Sale added!', severity: 'success' });
      setInputs((prev) => ({ ...prev, [col]: { name: '', price: '' } }));
      return;
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent, col: SalesCol) => {
    if (e.key === 'Enter') {
      handleAddSale(col);
    }
  };

  // Add delete sale function
  const handleDeleteSale = (saleId: string) => {
    const updatedSales = sales.filter(sale => sale.id !== saleId);
    salesContext.setSales(updatedSales);
    localStorage.setItem('pos_sales', JSON.stringify(updatedSales));
    setSnackbar({ open: true, message: 'Sale deleted successfully', severity: 'success' });
  };

  const handleExportSales = async () => {
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
    
    // Record gross sales data using the context
    grossSalesContext.recordGrossSales(totalGrossSales, storeCashierTotal + storeGcashTotal);
    
    setSnackbar({
      open: true,
      message: 'Beautiful sales report exported and recorded in Gross Sales!',
      severity: 'success',
    });
  };

  const handleClearAllSales = () => {
    addToClearedHistory(sales, 'clear-all');
    salesContext.setSales([]);
    localStorage.removeItem('pos_sales');
    setClearDialogOpen(false);
    setSnackbar({
      open: true,
      message: 'All sales have been cleared successfully!',
      severity: 'success',
    });
  };

  // 1. Calculate general sales total including cashier purchases, but only list general sales in the table
  const generalSales = sales.filter(sale => sale.type === 'general');
  const cashierSales = sales.filter(sale => sale.type === 'store' && sale.paymentMethod === 'cashier');
  const generalTotal = generalSales.reduce((sum, sale) => sum + sale.total, 0);
  const cashierTotal = cashierSales.reduce((sum, sale) => sum + sale.total, 0);
  const generalNetTotal = generalTotal - cashierTotal; // Net total for table
  const generalGrossTotal = generalTotal; // Gross total for big total display

  const renderSalesTable = (type: 'general' | 'store' | 'load', network?: 'globe' | 'smart', paymentMethod?: 'cashier' | 'gcash', showInputRow = true, showSales = true) => {
    let filteredSales = sales.filter((sale) => sale.type === type);
    
    // Filter by payment method for store purchases
    if (type === 'store' && paymentMethod) {
      filteredSales = filteredSales.filter((sale) => sale.paymentMethod === paymentMethod);
    }
    
    let col: SalesCol = (type === 'load' && network) ? network : 
                       (type === 'store' && paymentMethod) ? `store-${paymentMethod}` as SalesCol :
                       (type as SalesCol);
    
    // For the main Load table (input only, no sales), show total of all load sales
    let total = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    if (type === 'load' && !network && showInputRow && !showSales) {
      filteredSales = [];
      // Sum all load sales for the total
      total = sales.filter((sale) => sale.type === 'load').reduce((sum, sale) => sum + sale.total, 0);
    }
    if (type === 'load' && network) {
      filteredSales = filteredSales.filter((sale) => sale.items[0].name.toLowerCase().includes(network));
      total = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    }
    
    // For general sales table, use the net total (general - cashier)
    if (type === 'general') {
      total = generalNetTotal;
    }
    
    // Unlisted items are now actual sales entries, so just use the sales total
    const finalTotal = total;
    
    return (
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, boxShadow: 1, mt: 2, bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : undefined }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={tableHeaderSx}>
              <TableCell>Name</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
            {showInputRow && (
              <TableRow>
                {type === 'load' ? (
                  <>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <InputLabel id="load-network-label">Network</InputLabel>
                        <Select
                          labelId="load-network-label"
                          value={loadNetwork}
                          label="Network"
                          onChange={e => setLoadNetwork(e.target.value as 'globe' | 'smart')}
                          fullWidth
                        >
                          <MenuItem value="globe">Globe</MenuItem>
                          <MenuItem value="smart">Smart</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        placeholder="Price"
                        value={inputs[loadNetwork].price}
                        onChange={e => handleInputChange(loadNetwork, 'price', e.target.value)}
                        onKeyDown={e => handleInputKeyDown(e, loadNetwork)}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleAddSale(loadNetwork)}>
                        <AddIcon />
                      </IconButton>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <TextField
                        placeholder="Name"
                        value={inputs[col].name}
                        onChange={e => handleInputChange(col, 'name', e.target.value)}
                        onKeyDown={e => handleInputKeyDown(e, col)}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        placeholder="Price"
                        value={inputs[col].price}
                        onChange={e => handleInputChange(col, 'price', e.target.value)}
                        onKeyDown={e => handleInputKeyDown(e, col)}
                        size="small"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleAddSale(col)}>
                        <AddIcon />
                      </IconButton>
                    </TableCell>
                  </>
                )}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {/* Only show sales if showSales is true */}
            {showSales && (filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography color="text.secondary">No sales found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale, idx) => (
                <TableRow key={sale.id} sx={getRowSx(idx)}>
                  <TableCell>{sale.items[0].name}</TableCell>
                  <TableCell align="right">
                    {sale.total.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                  </TableCell>
                  <TableCell align="right">
                    {(type === 'general' || type === 'store' || type === 'load') && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ))}
            {/* Only show Unlisted Item input for General Sales */}
            {type === 'general' && (
              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[50] }}>
                <TableCell>
                  <Typography variant="body2" fontStyle="italic" color="text.secondary">
                    Unlisted Sales
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    placeholder="Price"
                    value={unlistedInput.price}
                    onChange={e => handleUnlistedInputChange(e.target.value)}
                    onKeyDown={handleUnlistedKeyDown}
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ maxWidth: 120 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="secondary" onClick={handleAddUnlistedItem}>
                    <AddIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell colSpan={1}>
                <Typography variant="subtitle1">Total</Typography>
              </TableCell>
              <TableCell align="right" colSpan={2}>
                <Typography variant="subtitle1" color={finalTotal < 0 ? 'error' : 'inherit'}>
                  {finalTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // NEW: Render Store Purchase section with Cashier and GCash
  const renderStorePurchaseSection = () => {
    const cashierSales = sales.filter((sale) => sale.type === 'store' && sale.paymentMethod === 'cashier');
    const gcashSales = sales.filter((sale) => sale.type === 'store' && sale.paymentMethod === 'gcash');
    
    const cashierTotal = cashierSales.reduce((sum, sale) => sum + sale.total, 0);
    const gcashTotal = gcashSales.reduce((sum, sale) => sum + sale.total, 0);
    const universalTotal = cashierTotal + gcashTotal;

    return (
      <Box>
        {/* Cashier Purchase Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <CashierIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>Cashier Purchase:</Typography>
          </Box>
          {renderSalesTable('store', undefined, 'cashier', true, true)}
        </Box>

        {/* GCash Purchase Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <GcashIcon color="success" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>GCash Purchase:</Typography>
          </Box>
          {renderSalesTable('store', undefined, 'gcash', true, true)}
        </Box>
        
        {/* Universal Total */}
        <Box sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], 
          p: 2, 
          borderRadius: 2,
          textAlign: 'center'
        }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            Total Store Purchases: {universalTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </Typography>
        </Box>
      </Box>
    );
  };

  const tableHeaderSx = {
    bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : 'grey.100',
    '& .MuiTableCell-head': {
      color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
      fontWeight: 800,
      fontSize: 16,
      letterSpacing: 0.5,
    },
  };
  const getRowSx = (idx: number) => theme.palette.mode === 'dark'
    ? { bgcolor: idx % 2 === 0 ? theme.palette.grey[800] : theme.palette.grey[900] }
    : { bgcolor: idx % 2 === 0 ? 'grey.50' : undefined };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h4" fontWeight={800} gutterBottom letterSpacing={1}>
            Sales Record
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeTab === 0 ? (
            <>
              <Button
                variant="contained"
                color="error"
                startIcon={<ClearIcon />}
                onClick={() => setClearDialogOpen(true)}
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: theme.palette.error.dark,
                  },
                  minWidth: '150px'
                }}
              >
                Clear All Sales
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportSales}
                sx={{ borderRadius: 2 }}
              >
                Export Sales
              </Button>
            </>
          ) : (
            <>
              <Chip
                icon={<HistoryIcon />}
                label={`${clearedSalesHistory.length} cleared record${clearedSalesHistory.length === 1 ? '' : 's'}`}
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={selectedHistoryIds.length === 0}
                onClick={() => deleteClearedHistory(selectedHistoryIds)}
                sx={{ borderRadius: 2, minWidth: 160 }}
              >
                Delete Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                disabled={clearedSalesHistory.length === 0}
                onClick={() => deleteClearedHistory(clearedSalesHistory.map((h) => h.id))}
                sx={{ borderRadius: 2, minWidth: 160 }}
              >
                Clear History
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => {
          setActiveTab(value);
          setSelectedHistoryIds([]);
        }}
        sx={{ mb: 2 }}
      >
        <Tab label="Current" />
        <Tab label="History" />
      </Tabs>

      {/* Add confirmation dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        PaperProps={{ 
          sx: { 
            borderRadius: 4, 
            boxShadow: 12, 
            overflow: 'hidden',
            bgcolor: 'background.paper' 
          } 
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(135deg, #ef5350 0%, #f44336 100%)',
          color: 'white',
          p: 3,
          position: 'relative'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
              <ClearIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Confirm Clear All Sales
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                This action cannot be undone
              </Typography>
            </Box>
          </Box>
        </Box>
        <DialogContent sx={{ p: 4 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to clear all sales records? This will permanently delete all sales data and cannot be undone.
          </Typography>
          <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'warning.50',
            border: '1px solid',
            borderColor: 'warning.200'
          }}>
            <Typography variant="body2" color="warning.dark" fontWeight={600}>
              ⚠️ Warning: Consider exporting your sales data before clearing to keep a backup.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setClearDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClearAllSales} 
            color="error" 
            variant="contained"
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            Clear All Sales
          </Button>
        </DialogActions>
      </Dialog>

      {activeTab === 0 ? (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{
              borderRadius: 4,
              boxShadow: 6,
              p: 0,
              height: '100%',
              overflow: 'hidden',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Box sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                boxShadow: 2,
              }}>
                <Box sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2 }}>
                  <ShoppingCartIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color: 'white' }}>General Sales</Typography>
                  <Typography variant="subtitle2" sx={{ color: 'white', opacity: 0.85 }}>Includes Cashier Purchases in total</Typography>
                </Box>
              </Box>
              <Box sx={{ px: 3, pb: 2, pt: 2, bgcolor: 'background.paper', flex: 1, display: 'flex', flexDirection: 'column', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <CardContent sx={{ p: 0 }}>
                  {renderSalesTable('general', undefined, undefined, true, true)}
                </CardContent>
                <Box sx={{
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
                  p: 2,
                  borderRadius: 2,
                  textAlign: 'center',
                  mt: 2
                }}>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    Total General Sales: {generalGrossTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{
              borderRadius: 4,
              boxShadow: 6,
              p: 0,
              height: '100%',
              overflow: 'hidden',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Box sx={{
                background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
                color: 'white',
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                boxShadow: 2,
              }}>
                <Box sx={{ bgcolor: 'info.main', color: '#fff', borderRadius: '50%', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2 }}>
                  <StoreIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color: 'white' }}>Store Purchases</Typography>
                </Box>
              </Box>
              <Box sx={{ px: 3, pb: 2, pt: 2, bgcolor: 'background.paper', flex: 1, display: 'flex', flexDirection: 'column', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <CardContent sx={{ p: 0 }}>
                  {renderStorePurchaseSection()}
                </CardContent>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{
              borderRadius: 4,
              boxShadow: 6,
              p: 0,
              height: '100%',
              overflow: 'hidden',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Box sx={{
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                boxShadow: 2,
              }}>
                <Box sx={{ bgcolor: 'success.main', color: '#fff', borderRadius: '50%', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2 }}>
                  <LoadIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color: 'white' }}>Load Sales</Typography>
                </Box>
              </Box>
              <Box sx={{ px: 3, pb: 2, pt: 2, bgcolor: 'background.paper', flex: 1, display: 'flex', flexDirection: 'column', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <CardContent sx={{ p: 0 }}>
                  {renderSalesTable('load', undefined, undefined, true, false)}
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>Globe</Typography>
                      {renderSalesTable('load', 'globe', undefined, false, true)}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>Smart</Typography>
                      {renderSalesTable('load', 'smart', undefined, false, true)}
                    </Grid>
                  </Grid>
                </CardContent>
              </Box>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Box sx={{ mt: 1 }}>
          {clearedSalesHistory.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" fontWeight={700}>
                No cleared sales records yet
              </Typography>
            </Box>
          ) : (
            <Box>
              {historyByMonth.map((month) => {
                const monthIds = month.items.map((i) => i.id);
                const allSelected = monthIds.length > 0 && monthIds.every((id) => selectedHistoryIds.includes(id));
                const someSelected = monthIds.some((id) => selectedHistoryIds.includes(id)) && !allSelected;
                const monthTotal = month.items.reduce((sum, batch) => sum + batch.sales.reduce((s, sale) => s + sale.total, 0), 0);
                const monthSalesCount = month.items.reduce((sum, b) => sum + b.sales.length, 0);

                return (
                  <Accordion key={month.key} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(_, checked) => setHistorySelection(monthIds, checked)}
                          />
                          <Typography fontWeight={800}>{month.label}</Typography>
                          <Chip label={`${month.items.length} clear${month.items.length === 1 ? '' : 's'}`} size="small" />
                          <Chip label={`${monthSalesCount} sale${monthSalesCount === 1 ? '' : 's'}`} size="small" variant="outlined" />
                        </Box>
                        <Typography fontWeight={700}>
                          {monthTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.5}>
                        {month.items.map((entry) => {
                          const selected = selectedHistoryIds.includes(entry.id);
                          const clearedAt = new Date(entry.clearedAt);
                          const entryTotal = entry.sales.reduce((sum, sale) => sum + sale.total, 0);
                          const entrySalesSorted = [...entry.sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                          return (
                            <Accordion key={entry.id} disableGutters sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Checkbox
                                      checked={selected}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={() => toggleHistorySelection(entry.id)}
                                    />
                                    <Typography fontWeight={700}>
                                      {clearedAt.toLocaleString()}
                                    </Typography>
                                    <Chip size="small" label={entry.reason === 'clear-all' ? 'Clear All' : 'Export & Clear'} variant="outlined" />
                                    <Chip size="small" label={`${entry.sales.length} sale${entry.sales.length === 1 ? '' : 's'}`} />
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography fontWeight={700}>
                                      {entryTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteClearedHistory([entry.id]);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                {entrySalesSorted.length === 0 ? (
                                  <Typography color="text.secondary">No sales in this record.</Typography>
                                ) : (
                                  <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={tableHeaderSx}>
                                          <TableCell>Date</TableCell>
                                          <TableCell>Type</TableCell>
                                          <TableCell>Item</TableCell>
                                          <TableCell align="right">Total</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {entrySalesSorted.map((sale, idx) => {
                                          const saleDate = new Date(sale.date);
                                          const itemLabel = sale.items.length <= 1
                                            ? (sale.items[0]?.name ?? '')
                                            : `${sale.items[0]?.name ?? ''} +${sale.items.length - 1}`;
                                          return (
                                            <TableRow key={sale.id} sx={getRowSx(idx)}>
                                              <TableCell>{saleDate.toLocaleString()}</TableCell>
                                              <TableCell sx={{ textTransform: 'capitalize' }}>{sale.type}</TableCell>
                                              <TableCell>{itemLabel}</TableCell>
                                              <TableCell align="right">
                                                {sale.total.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                        <TableRow>
                                          <TableCell colSpan={3}>
                                            <Typography fontWeight={800}>Batch Total</Typography>
                                          </TableCell>
                                          <TableCell align="right">
                                            <Typography fontWeight={800}>
                                              {entryTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                )}
                              </AccordionDetails>
                            </Accordion>
                          );
                        })}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Box>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesRecord; 
