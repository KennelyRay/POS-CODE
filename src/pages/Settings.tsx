import React, { useState, useContext, useRef } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Paper,
  Avatar,
  Stack,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Store as StoreIcon,
  Palette as ThemeIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  DeleteForever as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Assessment as ReportIcon,
  Receipt as ReceiptIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteForeverIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  FileDownload as ExportIcon,
  Assessment as AssessmentIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  // Category icons for selection
  LocalBar as LiquorIcon,
  EmojiFoodBeverage as CoffeeIcon,
  SmokingRooms as CigarettesIcon,
  Inventory as WholesaleIcon,
  Fastfood as JunkFoodIcon,
  Restaurant as CondimentsIcon,
  Kitchen as IngredientsIcon,
  Widgets as CanGoodsIcon,
  CleaningServices as DetergentIcon,
  DinnerDining as NoodlesIcon,
  KitchenOutlined as KitchenThingsIcon,
  LocalLaundryService as LaundryIcon,
  Face as CosmeticsIcon,
  Cookie as CookingBakingIcon,
  LocalCafe as DrinksIcon,
  Agriculture as CerealsIcon,
  ColorLens as DressingsIcon,
  Opacity as ButterIcon,
  Spa as FabricConditionerIcon,
  Cake as CandiesIcon,
  Favorite as ChocolateIcon,
  AcUnit as FrozenIcon,
  Icecream as IceCreamIcon,
  Soap as ToiletriesIcon,
  LocalDrink as MilkIcon,
  Store as BreadIcon,
  ShoppingBasket as BasketIcon,
  LocalGroceryStore as GroceryIcon,
  LocalPizza as PizzaIcon,
  Egg as EggIcon,
  FoodBank as LunchIcon,
  Liquor as AlcoholIcon,
  LocalFlorist as FloristIcon,
  LocalPharmacy as PharmacyIcon,
  Home as HomeIcon,
  BathroomOutlined as BathroomIcon,
  LocalMall as ShoppingIcon,
  FoodBank as FoodBankIcon,
  RiceBowl as RiceIcon,
  Yard as YardIcon,
} from '@mui/icons-material';
import { ThemeContext, StoreSettingsContext, SalesContext, ProductsContext } from '../App';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { usePrinter } from '../contexts/PrinterContext';

const Settings: React.FC = () => {
  const { setThemeName, themeName } = useContext(ThemeContext);
  const storeSettings = useContext(StoreSettingsContext);
  const salesContext = useContext(SalesContext);
  const productsContext = useContext(ProductsContext);
  const { printers, selectedPrinter, setSelectedPrinter, refreshPrinters, testPrint, isLoading } = usePrinter();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [storeForm, setStoreForm] = useState({
    storeName: storeSettings.storeName,
    storeAddress: storeSettings.storeAddress,
    phoneNumber: storeSettings.phoneNumber || '',
    email: storeSettings.email || '',
  });
  const [clearDataDialog, setClearDataDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [notifications, setNotifications] = useState({
    lowStock: true,
    dailyReport: true,
    backupReminder: false,
  });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Category management state
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; category?: any }>({ open: false, mode: 'add' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: 'CategoryIcon' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; categoryId?: string }>({ open: false });

  // Available icons for category selection
  const availableIcons = [
    { name: 'CategoryIcon', icon: <CategoryIcon />, label: 'Default Category' },
    { name: 'LiquorIcon', icon: <LiquorIcon />, label: 'Liquor & Alcohol' },
    { name: 'CoffeeIcon', icon: <CoffeeIcon />, label: 'Coffee & Tea' },
    { name: 'CigarettesIcon', icon: <CigarettesIcon />, label: 'Cigarettes & Tobacco' },
    { name: 'WholesaleIcon', icon: <WholesaleIcon />, label: 'Wholesale Items' },
    { name: 'JunkFoodIcon', icon: <JunkFoodIcon />, label: 'Junk Food & Snacks' },
    { name: 'CondimentsIcon', icon: <CondimentsIcon />, label: 'Condiments & Sauces' },
    { name: 'IngredientsIcon', icon: <IngredientsIcon />, label: 'Cooking Ingredients' },
    { name: 'CanGoodsIcon', icon: <CanGoodsIcon />, label: 'Canned Goods' },
    { name: 'DetergentIcon', icon: <DetergentIcon />, label: 'Detergent & Cleaners' },
    { name: 'NoodlesIcon', icon: <NoodlesIcon />, label: 'Noodles & Pasta' },
    { name: 'KitchenThingsIcon', icon: <KitchenThingsIcon />, label: 'Kitchen Items' },
    { name: 'LaundryIcon', icon: <LaundryIcon />, label: 'Laundry Products' },
    { name: 'CosmeticsIcon', icon: <CosmeticsIcon />, label: 'Cosmetics & Beauty' },
    { name: 'CookingBakingIcon', icon: <CookingBakingIcon />, label: 'Baking Supplies' },
    { name: 'DrinksIcon', icon: <DrinksIcon />, label: 'Beverages & Drinks' },
    { name: 'CerealsIcon', icon: <CerealsIcon />, label: 'Cereals & Grains' },
    { name: 'DressingsIcon', icon: <DressingsIcon />, label: 'Dressings & Oils' },
    { name: 'ButterIcon', icon: <ButterIcon />, label: 'Butter & Spreads' },
    { name: 'FabricConditionerIcon', icon: <FabricConditionerIcon />, label: 'Fabric Care' },
    { name: 'CandiesIcon', icon: <CandiesIcon />, label: 'Candies & Sweets' },
    { name: 'ChocolateIcon', icon: <ChocolateIcon />, label: 'Chocolate' },
    { name: 'FrozenIcon', icon: <FrozenIcon />, label: 'Frozen Foods' },
    { name: 'IceCreamIcon', icon: <IceCreamIcon />, label: 'Ice Cream & Desserts' },
    { name: 'ToiletriesIcon', icon: <ToiletriesIcon />, label: 'Toiletries & Hygiene' },
    { name: 'MilkIcon', icon: <MilkIcon />, label: 'Milk & Dairy' },
    { name: 'BreadIcon', icon: <BreadIcon />, label: 'Bread & Bakery' },
    { name: 'BasketIcon', icon: <BasketIcon />, label: 'General Shopping' },
    { name: 'GroceryIcon', icon: <GroceryIcon />, label: 'Grocery Store' },
    { name: 'PizzaIcon', icon: <PizzaIcon />, label: 'Pizza & Fast Food' },
    { name: 'EggIcon', icon: <EggIcon />, label: 'Eggs & Protein' },
    { name: 'LunchIcon', icon: <LunchIcon />, label: 'Lunch & Meals' },
    { name: 'AlcoholIcon', icon: <AlcoholIcon />, label: 'Alcoholic Beverages' },
    { name: 'FloristIcon', icon: <FloristIcon />, label: 'Flowers & Plants' },
    { name: 'PharmacyIcon', icon: <PharmacyIcon />, label: 'Pharmacy & Medicine' },
    { name: 'HomeIcon', icon: <HomeIcon />, label: 'Home & Living' },
    { name: 'CleaningIcon', icon: <DetergentIcon />, label: 'Cleaning Supplies' },
    { name: 'BathroomIcon', icon: <BathroomIcon />, label: 'Bathroom Items' },
    { name: 'ShoppingIcon', icon: <ShoppingIcon />, label: 'Shopping & Retail' },
    { name: 'FoodBankIcon', icon: <FoodBankIcon />, label: 'Food Bank Items' },
    { name: 'RiceIcon', icon: <RiceIcon />, label: 'Rice & Staples' },
    { name: 'YardIcon', icon: <YardIcon />, label: 'Garden & Yard' },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveStoreSettings = () => {
    storeSettings.setStoreName(storeForm.storeName);
    storeSettings.setStoreAddress(storeForm.storeAddress);
    storeSettings.setPhoneNumber?.(storeForm.phoneNumber);
    storeSettings.setEmail?.(storeForm.email);
    setSnackbar({ open: true, message: 'Store settings saved successfully!', severity: 'success' });
  };

  const handleExportSales = async () => {
    let sales = salesContext.sales;
    if (!sales || sales.length === 0) {
      setSnackbar({ open: true, message: 'No sales data to export', severity: 'warning' });
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
    setSnackbar({
      open: true,
      message: 'Beautiful sales report exported successfully!',
      severity: 'success',
    });
  };

  const handleExportAllData = () => {
    const data = {
      sales: salesContext.sales,
      receipts: salesContext.receipts,
      settings: {
        storeName: storeSettings.storeName,
        storeAddress: storeSettings.storeAddress,
        phoneNumber: storeSettings.phoneNumber,
        email: storeSettings.email,
        theme: themeName,
      },
      timestamp: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([jsonStr], { type: 'application/json' });
    saveAs(dataBlob, `pos_backup_${new Date().toISOString().split('T')[0]}.json`);
    setSnackbar({ open: true, message: 'Full backup exported successfully!', severity: 'success' });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.sales) {
          salesContext.setSales(data.sales);
          localStorage.setItem('pos_sales', JSON.stringify(data.sales));
        }
        
        if (data.receipts) {
          salesContext.setReceipts?.(data.receipts);
          localStorage.setItem('pos_receipts', JSON.stringify(data.receipts));
        }
        
        if (data.settings) {
          if (data.settings.storeName) storeSettings.setStoreName(data.settings.storeName);
          if (data.settings.storeAddress) storeSettings.setStoreAddress(data.settings.storeAddress);
          if (data.settings.phoneNumber) storeSettings.setPhoneNumber?.(data.settings.phoneNumber);
          if (data.settings.email) storeSettings.setEmail?.(data.settings.email);
          if (data.settings.theme) setThemeName(data.settings.theme);
        }

        setSnackbar({ open: true, message: 'Data imported successfully!', severity: 'success' });
        setImportDialog(false);
      } catch (error) {
        setSnackbar({ open: true, message: 'Error importing data. Please check the file format.', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    salesContext.setSales([]);
    salesContext.setReceipts([]);
    setSnackbar({ open: true, message: 'All data cleared successfully!', severity: 'success' });
  };

  // Category management functions
  const handleAddCategory = () => {
    setCategoryForm({ name: '', description: '', icon: 'CategoryIcon' });
    setCategoryDialog({ open: true, mode: 'add' });
  };

  const handleEditCategory = (category: any) => {
    setCategoryForm({ name: category.name, description: '', icon: category.icon || 'CategoryIcon' });
    setCategoryDialog({ open: true, mode: 'edit', category });
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) {
      setSnackbar({ open: true, message: 'Category name is required!', severity: 'error' });
      return;
    }

    if (categoryDialog.mode === 'add') {
      const newCategory = {
        id: Date.now().toString(),
        name: categoryForm.name.trim(),
        icon: categoryForm.icon,
      };
      productsContext.addCategory(newCategory);
      setSnackbar({ open: true, message: 'Category added successfully!', severity: 'success' });
    } else if (categoryDialog.mode === 'edit' && categoryDialog.category) {
      const updatedCategory = {
        ...categoryDialog.category,
        name: categoryForm.name.trim(),
        icon: categoryForm.icon,
      };
      productsContext.updateCategory(updatedCategory);
      setSnackbar({ open: true, message: 'Category updated successfully!', severity: 'success' });
    }

    setCategoryDialog({ open: false, mode: 'add' });
    setCategoryForm({ name: '', description: '', icon: 'CategoryIcon' });
  };

  const handleDeleteCategory = (categoryId: string) => {
    setDeleteDialog({ open: true, categoryId });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.categoryId) {
      // Check if category has products
      const hasProducts = productsContext.products.some(p => p.category === 
        productsContext.categories.find(c => c.id === deleteDialog.categoryId)?.name
      );
      
      if (hasProducts) {
        setSnackbar({ 
          open: true, 
          message: 'Cannot delete category with products. Please move or delete products first.', 
          severity: 'error' 
        });
      } else {
        productsContext.deleteCategory(deleteDialog.categoryId);
        setSnackbar({ open: true, message: 'Category deleted successfully!', severity: 'success' });
      }
    }
    setDeleteDialog({ open: false });
  };

  const handleExportCategories = () => {
    // Create CSV content with id,name format
    const csvContent = [
      'id,name', // Header row
      ...productsContext.categories.map(cat => `${cat.id},"${cat.name}"`)
    ].join('\n');
    
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(csvBlob, `categories_${new Date().toISOString().split('T')[0]}.csv`);
    setSnackbar({ open: true, message: 'Categories exported successfully!', severity: 'success' });
  };

  const handleImportCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
          
          if (lines.length === 0) {
            setSnackbar({ open: true, message: 'CSV file is empty!', severity: 'error' });
            return;
          }
          
          // Check if first line is header (id,name)
          const hasHeader = lines[0].toLowerCase().includes('id') && lines[0].toLowerCase().includes('name');
          const dataLines = hasHeader ? lines.slice(1) : lines;
          
          let importedCount = 0;
          dataLines.forEach((line) => {
            const parts = line.split(',');
            if (parts.length >= 2) {
              const id = parts[0].trim().replace(/"/g, '');
              const name = parts[1].trim().replace(/"/g, '');
              
              if (id && name) {
                // Check if category doesn't already exist
                if (!productsContext.categories.some(c => c.id === id || c.name === name)) {
                  const category = { id, name };
                  productsContext.addCategory(category);
                  importedCount++;
                }
              }
            }
          });
          
          if (importedCount > 0) {
            setSnackbar({ 
              open: true, 
              message: `${importedCount} categories imported successfully!`, 
              severity: 'success' 
            });
          } else {
            setSnackbar({ 
              open: true, 
              message: 'No new categories found to import (all categories already exist)', 
              severity: 'warning' 
            });
          }
        } catch (error) {
          setSnackbar({ 
            open: true, 
            message: 'Error importing CSV file. Please check file format.', 
            severity: 'error' 
          });
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'dark': return <DarkModeIcon />;
      case 'light': return <LightModeIcon />;
      default: return <ThemeIcon />;
    }
  };

  const getThemeDescription = (theme: string) => {
    switch (theme) {
      case 'dark': return 'Dark theme for low-light environments';
      case 'light': return 'Light theme for bright environments';
      default: return 'System theme follows device preferences';
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'store': return <StoreIcon />;
      case 'categories': return <CategoryIcon />;
      case 'appearance': return <ThemeIcon />;
      case 'printer': return <PrintIcon />;
      case 'notifications': return <NotificationIcon />;
      case 'data': return <BackupIcon />;
      case 'security': return <SecurityIcon />;
      default: return <SettingsIcon />;
    }
  };

  const sections = [
    { id: 'store', title: 'Store Information', description: 'Configure your store details and contact information' },
    { id: 'categories', title: 'Category Management', description: 'Add, edit, and organize your product categories' },
    { id: 'appearance', title: 'Appearance & Theme', description: 'Customize the look and feel of your application' },
    { id: 'printer', title: 'Thermal Printer', description: 'Configure thermal receipt printer and printing options' },
    { id: 'notifications', title: 'Notifications', description: 'Manage alerts and notification preferences' },
    { id: 'data', title: 'Data Management', description: 'Export, import, and manage your business data' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <SettingsIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                Application Settings
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Configure your store settings and preferences
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2}>
            <Chip 
              icon={getThemeIcon(themeName)} 
              label={`${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme`}
              color="primary" 
              variant="outlined"
              sx={{ borderRadius: 3, px: 2 }}
            />
          </Stack>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <ReportIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="info.main">
                  {salesContext.sales.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Sales Records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <ReceiptIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {salesContext.receipts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receipt Records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <BusinessIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {storeSettings.storeName ? '✓' : '⚠'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Store Setup
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <PrintIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="secondary.main">
                  {printers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available Printers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Settings Sections */}
      <Box>
        {sections.map((section) => (
          <Card key={section.id} sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
            <Accordion 
              expanded={expandedSection === section.id}
              onChange={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              sx={{ 
                '&:before': { display: 'none' },
                boxShadow: 'none',
                borderRadius: 3,
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  p: 3,
                  '&:hover': { bgcolor: 'grey.50' },
                  borderRadius: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50 }}>
                    {getSectionIcon(section.id)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {section.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {section.description}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 3, pt: 0 }}>
                {section.id === 'store' && (
                  <Stack spacing={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Store Name"
                          value={storeForm.storeName}
                          onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <BusinessIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Store Address"
                          value={storeForm.storeAddress}
                          onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LocationIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          value={storeForm.phoneNumber}
                          onChange={(e) => setStoreForm({ ...storeForm, phoneNumber: e.target.value })}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          type="email"
                          value={storeForm.email}
                          onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveStoreSettings}
                        sx={{ borderRadius: 3, px: 4 }}
                      >
                        Save Store Settings
                      </Button>
                    </Box>
                  </Stack>
                )}

                {section.id === 'categories' && (
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Product Categories
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleImportCategories}
                          style={{ display: 'none' }}
                        />
                        <Button
                          size="small"
                          startIcon={<UploadIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          sx={{ borderRadius: 2 }}
                        >
                          Import
                        </Button>
                        <Button
                          size="small"
                          startIcon={<ExportIcon />}
                          onClick={handleExportCategories}
                          sx={{ borderRadius: 2 }}
                        >
                          Export
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={handleAddCategory}
                          sx={{ borderRadius: 2 }}
                        >
                          Add Category
                        </Button>
                      </Stack>
                    </Box>

                    {productsContext.categories.length === 0 ? (
                      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50' }}>
                        <CategoryIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Categories Yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Create your first product category to organize your inventory
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddCategory}
                          sx={{ borderRadius: 3 }}
                        >
                          Create First Category
                        </Button>
                      </Paper>
                    ) : (
                      <Grid container spacing={2}>
                        {productsContext.categories.map((category) => {
                          const productCount = productsContext.products.filter(p => p.category === category.name).length;
                          return (
                            <Grid item xs={12} sm={6} md={4} key={category.id}>
                              <Card 
                                sx={{ 
                                  borderRadius: 3, 
                                  transition: 'all 0.3s',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4,
                                  },
                                  border: '1px solid',
                                  borderColor: 'grey.200',
                                }}
                              >
                                <CardContent sx={{ p: 3 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                      {availableIcons.find(icon => icon.name === category.icon)?.icon || <CategoryIcon />}
                                    </Avatar>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditCategory(category)}
                                        sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDeleteCategory(category.id)}
                                        sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}
                                        disabled={productCount > 0}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                  
                                  <Typography variant="h6" fontWeight={700} gutterBottom>
                                    {category.name}
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                    <Chip 
                                      label={`${productCount} product${productCount !== 1 ? 's' : ''}`}
                                      size="small"
                                      color={productCount > 0 ? 'primary' : 'default'}
                                      variant="outlined"
                                    />
                                    {productCount > 0 && (
                                      <Tooltip title="Category has products - cannot delete">
                                        <InfoIcon color="info" fontSize="small" />
                                      </Tooltip>
                                    )}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Stack>
                )}

                {section.id === 'appearance' && (
                  <Stack spacing={3}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Choose Theme
                    </Typography>
                    <Grid container spacing={2}>
                      {['light', 'dark'].map((themeOption) => (
                        <Grid item xs={12} sm={6} key={themeOption}>
                          <Card 
                            sx={{ 
                              borderRadius: 3, 
                              border: '2px solid',
                              borderColor: themeName === themeOption ? 'primary.main' : 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 4,
                              }
                            }}
                            onClick={() => setThemeName(themeOption as any)}
                          >
                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                              <Avatar 
                                sx={{ 
                                  bgcolor: themeName === themeOption ? 'primary.main' : 'grey.300',
                                  width: 60, 
                                  height: 60, 
                                  mx: 'auto', 
                                  mb: 2 
                                }}
                              >
                                {getThemeIcon(themeOption)}
                              </Avatar>
                              <Typography variant="h6" fontWeight={700} gutterBottom>
                                {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)} Theme
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getThemeDescription(themeOption)}
                              </Typography>
                              {themeName === themeOption && (
                                <Chip 
                                  label="Active" 
                                  color="primary" 
                                  size="small" 
                                  icon={<CheckIcon />}
                                  sx={{ mt: 2 }}
                                />
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                )}

                {section.id === 'printer' && (
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Thermal Printer Configuration
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={refreshPrinters}
                        disabled={isLoading}
                        sx={{ borderRadius: 3 }}
                      >
                        {isLoading ? 'Scanning...' : 'Refresh Printers'}
                      </Button>
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={8}>
                        <FormControl fullWidth>
                          <InputLabel>Select Thermal Printer</InputLabel>
                          <Select
                            value={selectedPrinter || ''}
                            label="Select Thermal Printer"
                            onChange={(e) => setSelectedPrinter(e.target.value || null)}
                            sx={{ borderRadius: 3 }}
                          >
                            {printers.length === 0 && (
                              <MenuItem value="">
                                <Typography color="text.secondary">No thermal printers found</Typography>
                              </MenuItem>
                            )}
                            {printers.map((printer) => (
                              <MenuItem key={printer.name} value={printer.name}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                  <PrintIcon color={printer.isDefault ? 'primary' : 'action'} />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight={600}>{printer.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {printer.connection} • {printer.manufacturer}
                                    </Typography>
                                  </Box>
                                  {printer.isDefault && (
                                    <Chip label="Default" size="small" color="primary" />
                                  )}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                          <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={async () => {
                              if (selectedPrinter) {
                                const success = await testPrint();
                                setSnackbar({
                                  open: true,
                                  message: success ? 'Test receipt printed successfully!' : 'Failed to print test receipt',
                                  severity: success ? 'success' : 'error'
                                });
                              }
                            }}
                            disabled={!selectedPrinter || isLoading}
                            fullWidth
                            sx={{ borderRadius: 3 }}
                          >
                            Test Print
                          </Button>
                          <Chip 
                            label={`${printers.length} printer${printers.length !== 1 ? 's' : ''} detected`}
                            color={printers.length > 0 ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                    
                    {/* Printer Info */}
                    {selectedPrinter && (
                      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'success.200', bgcolor: 'success.50' }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'success.main' }}>
                              <PrintIcon />
                            </Avatar>
                            <Typography variant="h6" fontWeight={700} color="success.dark">
                              Selected Printer
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Name:</Typography>
                              <Typography variant="body1" fontWeight={600}>{selectedPrinter}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Status:</Typography>
                              <Chip 
                                label="Ready to Print" 
                                color="success" 
                                size="small" 
                                icon={<CheckIcon />}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    )}

                    {printers.length === 0 && !isLoading && (
                      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <WarningIcon color="warning" />
                          <Typography variant="h6" fontWeight={700} color="warning.dark">
                            No Thermal Printers Detected
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="warning.dark" sx={{ mb: 2 }}>
                          Make sure your thermal printer is:
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <Typography variant="body2">• Connected via USB or Serial port</Typography>
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <Typography variant="body2">• Powered on and ready</Typography>
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <Typography variant="body2">• Compatible with ESC/POS commands</Typography>
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <Typography variant="body2">• Python dependencies installed (run setup_python.bat)</Typography>
                          </ListItem>
                        </List>
                      </Paper>
                    )}
                  </Stack>
                )}

                {section.id === 'notifications' && (
                  <Stack spacing={3}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Notification Preferences
                    </Typography>
                    
                    <List>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary="Low Stock Alerts"
                          secondary="Get notified when product stock is running low"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={notifications.lowStock}
                            onChange={(e) => setNotifications({ ...notifications, lowStock: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary="Daily Sales Report"
                          secondary="Receive daily sales summaries"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={notifications.dailyReport}
                            onChange={(e) => setNotifications({ ...notifications, dailyReport: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary="Backup Reminders"
                          secondary="Get reminded to backup your data regularly"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={notifications.backupReminder}
                            onChange={(e) => setNotifications({ ...notifications, backupReminder: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Stack>
                )}

                {section.id === 'data' && (
                  <Stack spacing={3}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Data Export & Import
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'success.200', bgcolor: 'success.50' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar sx={{ bgcolor: 'success.main' }}>
                                <ExportIcon />
                              </Avatar>
                              <Typography variant="h6" fontWeight={700}>
                                Export Data
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Download your sales data and create backups
                            </Typography>
                            <Stack spacing={2}>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<ExportIcon />}
                                onClick={handleExportSales}
                                fullWidth
                                sx={{ borderRadius: 3 }}
                              >
                                Export Sales (Excel)
                              </Button>
                              <Button
                                variant="outlined"
                                color="success"
                                startIcon={<BackupIcon />}
                                onClick={handleExportAllData}
                                fullWidth
                                sx={{ borderRadius: 3 }}
                              >
                                Full Backup (JSON)
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'info.200', bgcolor: 'info.50' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar sx={{ bgcolor: 'info.main' }}>
                                <UploadIcon />
                              </Avatar>
                              <Typography variant="h6" fontWeight={700}>
                                Import Data
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Restore data from previous backups
                            </Typography>
                            <Button
                              variant="contained"
                              color="info"
                              startIcon={<UploadIcon />}
                              onClick={() => setImportDialog(true)}
                              fullWidth
                              sx={{ borderRadius: 3 }}
                            >
                              Import Backup
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom color="error">
                        Danger Zone
                      </Typography>
                      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'error.200', bgcolor: 'error.50' }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'error.main' }}>
                              <DeleteIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight={700} color="error">
                                Clear All Data
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                This will permanently delete all sales, receipts, and settings
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setClearDataDialog(true)}
                            sx={{ borderRadius: 3 }}
                          >
                            Clear All Data
                          </Button>
                        </CardContent>
                      </Card>
                    </Box>
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          </Card>
        ))}
      </Box>

      {/* Add/Edit Category Dialog */}
      <Dialog 
        open={categoryDialog.open} 
        onClose={() => setCategoryDialog({ open: false, mode: 'add' })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }
        }}
      >
        {/* Clean Header with Original Blue */}
        <Box
          sx={{
            position: 'relative',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 4,
            overflow: 'hidden'
          }}
        >
          {/* Subtle decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              {availableIcons.find(icon => icon.name === categoryForm.icon)?.icon || <CategoryIcon sx={{ fontSize: 32, color: 'white' }} />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                {categoryDialog.mode === 'add' ? 'Add New Category' : 'Edit Category'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {categoryDialog.mode === 'add' 
                  ? 'Create a new product category for better organization'
                  : 'Update category information and settings'
                }
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setCategoryDialog({ open: false, mode: 'add' })} 
              sx={{ 
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.25)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Grid container spacing={4}>
            {/* Left side - Form */}
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  Category Information
                </Typography>
                
                <Stack spacing={3}>
                  {/* Category Name Field */}
                  <TextField
                    fullWidth
                    label="Category Name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Enter category name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 3,
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      }
                    }}
                    autoFocus
                  />
                  
                  {/* Description Field */}
                  <TextField
                    fullWidth
                    label="Description (Optional)"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Describe what products belong to this category"
                    multiline
                    rows={3}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 3,
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      }
                    }}
                  />
                  
                  {/* Icon Selection */}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
                      Category Icon
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Choose an icon that best represents this category
                    </Typography>
                    
                    <Box sx={{ 
                      maxHeight: 300, 
                      overflowY: 'auto', 
                      border: '1px solid', 
                      borderColor: 'grey.300', 
                      borderRadius: 2, 
                      p: 2,
                      bgcolor: 'grey.50'
                    }}>
                      <Grid container spacing={1.5}>
                        {availableIcons.map((iconOption) => (
                          <Grid item xs={4} sm={3} key={iconOption.name}>
                            <Tooltip title={iconOption.label} placement="top">
                              <Card
                                sx={{
                                  p: 1.5,
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  borderRadius: 2,
                                  border: '2px solid',
                                  borderColor: categoryForm.icon === iconOption.name ? 'primary.main' : 'grey.300',
                                  bgcolor: categoryForm.icon === iconOption.name ? 'primary.50' : 'white',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    borderColor: 'primary.light',
                                    bgcolor: categoryForm.icon === iconOption.name ? 'primary.100' : 'grey.100',
                                    transform: 'scale(1.05)',
                                  }
                                }}
                                onClick={() => setCategoryForm({ ...categoryForm, icon: iconOption.name })}
                              >
                                <Avatar sx={{ 
                                  bgcolor: categoryForm.icon === iconOption.name ? 'primary.main' : 'grey.600', 
                                  width: 40, 
                                  height: 40, 
                                  mx: 'auto',
                                  mb: 1,
                                  color: 'white'
                                }}>
                                  {iconOption.icon}
                                </Avatar>
                                <Typography variant="caption" sx={{ 
                                  fontSize: '0.7rem',
                                  lineHeight: 1.2,
                                  fontWeight: categoryForm.icon === iconOption.name ? 600 : 500,
                                  color: categoryForm.icon === iconOption.name ? 'primary.main' : 'text.primary'
                                }}>
                                  {iconOption.label.split(' ')[0]}
                                </Typography>
                              </Card>
                            </Tooltip>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Box>
                  
                  {/* Tips Section */}
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'info.main', width: 24, height: 24 }}>
                        <InfoIcon sx={{ fontSize: 14, color: 'white' }} />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={700} color="info.main">
                        Category Tips
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="info.dark">
                      Categories help organize your products, making them easier to find and manage. You can filter products by category and generate category-specific reports.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* Right side - Preview */}
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                {/* Category Preview Card */}
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
                    Live Preview
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, bgcolor: 'grey.100' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                      {availableIcons.find(icon => icon.name === categoryForm.icon)?.icon || <CategoryIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {categoryForm.name.trim() || 'Category Name'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {categoryForm.description.trim() || 'No description provided'}
                      </Typography>
                    </Box>
                  </Box>
                </Card>

                {/* Statistics Card */}
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
                    Quick Stats
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'success.50' }}>
                        <Typography variant="h5" fontWeight={700} color="success.main">
                          {productsContext.categories.length}
                        </Typography>
                        <Typography variant="caption" color="success.dark">
                          Categories
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'info.50' }}>
                        <Typography variant="h5" fontWeight={700} color="info.main">
                          {productsContext.products.length}
                        </Typography>
                        <Typography variant="caption" color="info.dark">
                          Products
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        
        {/* Action Buttons */}
        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setCategoryDialog({ open: false, mode: 'add' })}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleSaveCategory}
            startIcon={<SaveIcon />}
            disabled={!categoryForm.name.trim()}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              },
              '&:disabled': {
                background: 'grey.300',
                boxShadow: 'none'
              }
            }}
            size="large"
          >
            {categoryDialog.mode === 'add' ? 'Create Category' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header with gradient background */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              <DeleteForeverIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Delete Category
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                This action cannot be undone
              </Typography>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Card sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: 'text.primary' }}>
              Are you sure you want to delete this category?
            </Typography>
            
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'error.main', width: 24, height: 24 }}>
                  <Typography variant="caption" fontWeight={700}>!</Typography>
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700} color="error.main">
                  Warning
                </Typography>
              </Box>
              <Typography variant="body2" color="error.dark">
                This action will permanently delete the category and cannot be undone.
              </Typography>
            </Box>
            
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24 }}>
                  <InfoIcon sx={{ fontSize: 16, color: 'white' }} />
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                  Important Note
                </Typography>
              </Box>
              <Typography variant="body2" color="warning.dark">
                Categories with products cannot be deleted. Please remove or reassign products first.
              </Typography>
            </Box>
          </Card>
        </DialogContent>
        
        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setDeleteDialog({ open: false })}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleConfirmDelete}
            startIcon={<DeleteForeverIcon />}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff5252 0%, #d84315 100%)',
                boxShadow: '0 6px 20px rgba(255, 107, 107, 0.6)',
              }
            }}
            size="large"
          >
            Delete Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog 
        open={importDialog} 
        onClose={() => setImportDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header with gradient background */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              <UploadIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Import Backup Data
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Restore your data from a backup file
              </Typography>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Grid container spacing={4}>
            {/* Left side - Instructions */}
            <Grid item xs={12} md={8}>
              <Card sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  Import Instructions
                </Typography>
                
                <Stack spacing={3}>
                  <Typography variant="body1" color="text.secondary">
                    Select a backup file to restore your data. This will overwrite existing data with the backup contents.
                  </Typography>
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'info.main', width: 24, height: 24 }}>
                        <InfoIcon sx={{ fontSize: 16, color: 'white' }} />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={700} color="info.main">
                        Supported File Types
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="info.dark" sx={{ mb: 1 }}>
                      • <strong>JSON (.json):</strong> Full backup files created by this application
                    </Typography>
                    <Typography variant="body2" color="info.dark">
                      • Files must be valid backup files generated by the export function
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24 }}>
                        <WarningIcon sx={{ fontSize: 16, color: 'white' }} />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                        Important Warning
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="warning.dark">
                      This action will replace your current data. Make sure to create a backup of your current data before proceeding.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* Right side - File Selection */}
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white', height: 'fit-content' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  Select File
                </Typography>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.50', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                    <UploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Avatar>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Click the button below to select your backup file
                  </Typography>
                  
                  <Button
                    variant="contained"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<UploadIcon />}
                    sx={{ 
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3d8bfe 0%, #00d4fe 100%)',
                        boxShadow: '0 6px 20px rgba(79, 172, 254, 0.6)',
                      }
                    }}
                    fullWidth
                    size="large"
                  >
                    Choose Backup File
                  </Button>
                </Box>
              </Card>
            </Grid>
          </Grid>
          
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImportData}
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setImportDialog(false)} 
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Data Confirmation Dialog */}
      <Dialog 
        open={clearDataDialog} 
        onClose={() => setClearDataDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 4, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header with gradient background */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              <DeleteIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Confirm Data Deletion
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                This will permanently delete all your data
              </Typography>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Grid container spacing={4}>
            {/* Left side - Warning */}
            <Grid item xs={12} md={8}>
              <Card sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  What will be deleted?
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                  This action will permanently delete the following data:
                </Typography>
                
                <List sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                  <ListItem sx={{ py: 1 }}>
                    <Avatar sx={{ bgcolor: 'error.main', width: 32, height: 32, mr: 2 }}>
                      <AssessmentIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <ListItemText 
                      primary="All sales records" 
                      secondary="Complete transaction history"
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 1 }}>
                    <Avatar sx={{ bgcolor: 'error.main', width: 32, height: 32, mr: 2 }}>
                      <ReceiptIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <ListItemText 
                      primary="All receipt records" 
                      secondary="Printed and stored receipts"
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 1 }}>
                    <Avatar sx={{ bgcolor: 'error.main', width: 32, height: 32, mr: 2 }}>
                      <BusinessIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <ListItemText 
                      primary="Store settings" 
                      secondary="Business information and preferences"
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 1 }}>
                    <Avatar sx={{ bgcolor: 'error.main', width: 32, height: 32, mr: 2 }}>
                      <SettingsIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <ListItemText 
                      primary="All other application data" 
                      secondary="Categories, products, and configurations"
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                </List>
              </Card>
            </Grid>

            {/* Right side - Final Warning */}
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white', height: 'fit-content' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'error.50', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                    <WarningIcon sx={{ fontSize: 40, color: 'error.main' }} />
                  </Avatar>
                  
                  <Typography variant="h6" fontWeight={700} color="error.main" sx={{ mb: 2 }}>
                    Final Warning
                  </Typography>
                  
                  <Typography variant="body2" color="error.dark" sx={{ mb: 3 }}>
                    This action cannot be undone! Make sure you have a backup if you need to recover this data later.
                  </Typography>
                  
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                    <Typography variant="body2" color="error.dark" fontWeight={700}>
                      ⚠️ IRREVERSIBLE ACTION
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setClearDataDialog(false)} 
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleClearAllData}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff5252 0%, #d84315 100%)',
                boxShadow: '0 6px 20px rgba(255, 107, 107, 0.6)',
              }
            }}
            size="large"
          >
            Delete All Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings; 
