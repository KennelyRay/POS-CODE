import React, { createContext, useMemo, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Layout from './components/Layout';
import Login from './pages/Login';
import Basket from './pages/Basket';
import SalesRecord from './pages/SalesRecord';
import ManageProducts from './pages/ManageProducts';
import Receipts from './pages/Receipts';
import Settings from './pages/Settings';
import CustomerCredit from './pages/CustomerCredit';
import Staff from './pages/Staff';
import GrossSales from './pages/GrossSales';
import ProtectedRoute from './components/ProtectedRoute';
import { PrinterProvider } from './contexts/PrinterContext';

// 1. Theme context for global theme selection
export const ThemeContext = createContext<{ setThemeName: (theme: ThemeName) => void; themeName: ThemeName }>({ setThemeName: () => {}, themeName: 'light' });

// 2. Sales context for managing sales and receipts
export interface SaleRecord {
  id: string;
  date: Date;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  type: 'general' | 'store' | 'load';
  paymentMethod?: 'cashier' | 'gcash'; // Add optional payment method for store purchases
}
export interface ReceiptRecord {
  id: string;
  date: Date;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  type: 'general' | 'store' | 'load';
  customerMoney?: number;
  change?: number;
}
export const SalesContext = createContext<{
  sales: SaleRecord[];
  receipts: ReceiptRecord[];
  addSale: (sale: SaleRecord) => void;
  addReceipt: (receipt: ReceiptRecord) => void;
  deleteReceipt: (id: string) => void;
  setSales: (sales: SaleRecord[]) => void;
  setReceipts: (receipts: ReceiptRecord[]) => void;
}>({
  sales: [],
  receipts: [],
  addSale: () => {},
  addReceipt: () => {},
  deleteReceipt: () => {},
  setSales: () => {},
  setReceipts: () => {},
});

// 3. Store Settings context for managing store information
export const StoreSettingsContext = createContext({
  storeName: 'My Store',
  storeAddress: '123 Main Street',
  phoneNumber: '',
  email: '',
  setStoreName: (name: string) => {},
  setStoreAddress: (address: string) => {},
  setPhoneNumber: (phone: string) => {},
  setEmail: (email: string) => {},
  updateStoreSettings: (settings: { storeName?: string; storeAddress?: string; phoneNumber?: string; email?: string }) => {},
});

// 5. Gross Sales context for tracking financial data
export interface GrossSalesRecord {
  year: number;
  month: number;
  monthName: string;
  day?: number; // Add optional day field for daily tracking
  dayName?: string; // Add optional day name for daily tracking
  gross: number;
  purchase: number;
  profit: number;
  date: Date;
}

export interface DailySalesRecord {
  year: number;
  month: number;
  day: number;
  dayName: string;
  monthName: string;
  gross: number;
  purchase: number;
  profit: number;
  date: Date;
}

export const GrossSalesContext = createContext<{
  grossSalesData: GrossSalesRecord[];
  dailySalesData: DailySalesRecord[];
  recordGrossSales: (grossAmount: number, purchaseAmount?: number) => void;
  setGrossSalesData: (data: GrossSalesRecord[]) => void;
  setDailySalesData: (data: DailySalesRecord[]) => void;
}>({
  grossSalesData: [],
  dailySalesData: [],
  recordGrossSales: () => {},
  setGrossSalesData: () => {},
  setDailySalesData: () => {},
});

// 4. Products context for managing products and categories
export interface Product {
  id: string;
  barcodes: string[];
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // Icon name to be used for this category
}

interface ProductsContextType {
  products: Product[];
  categories: Category[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  exportProducts: (products: Product[], filename: string) => void;
  importProducts: (products: Product[]) => Promise<void>;
}

export const ProductsContext = createContext<ProductsContextType>({
  products: [],
  categories: [],
  addProduct: () => {},
  updateProduct: () => {},
  deleteProduct: () => {},
  addCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
  exportProducts: () => {},
  importProducts: async () => {},
});

type ThemeName = 'light' | 'dark' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'teal' | 'red' | 'gray';

const themeOptions: Record<ThemeName, any> = {
  light: {
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#009688' },
      background: { default: '#f4f6f8', paper: '#fff' },
      text: { primary: '#222', secondary: '#555' },
    },
    shape: { borderRadius: 12 },
  },
  dark: {
    palette: {
      mode: 'dark',
      primary: { main: '#90caf9' },
      secondary: { main: '#80cbc4' },
      background: { default: '#121212', paper: '#1e1e1e' },
      text: { primary: '#fff', secondary: '#b0b0b0' },
    },
    shape: { borderRadius: 12 },
  },
  blue: {
    palette: {
      mode: 'light',
      primary: { main: '#1565c0' },
      secondary: { main: '#00bcd4' },
      background: { default: '#e3f2fd', paper: '#ffffff' },
      text: { primary: '#0d1a26', secondary: '#1976d2' },
    },
    shape: { borderRadius: 12 },
  },
  green: {
    palette: {
      mode: 'light',
      primary: { main: '#388e3c' },
      secondary: { main: '#8bc34a' },
      background: { default: '#e8f5e9', paper: '#ffffff' },
      text: { primary: '#1b5e20', secondary: '#388e3c' },
    },
    shape: { borderRadius: 12 },
  },
  pink: {
    palette: {
      mode: 'light',
      primary: { main: '#d81b60' },
      secondary: { main: '#f06292' },
      background: { default: '#fce4ec', paper: '#ffffff' },
      text: { primary: '#880e4f', secondary: '#d81b60' },
    },
    shape: { borderRadius: 12 },
  },
  purple: {
    palette: {
      mode: 'light',
      primary: { main: '#7c4dff' },
      secondary: { main: '#b388ff' },
      background: { default: '#f3e5f5', paper: '#fff' },
      text: { primary: '#4a148c', secondary: '#7c4dff' },
    },
    shape: { borderRadius: 12 },
  },
  orange: {
    palette: {
      mode: 'light',
      primary: { main: '#ff9800' },
      secondary: { main: '#ffb74d' },
      background: { default: '#fff3e0', paper: '#fff' },
      text: { primary: '#e65100', secondary: '#ff9800' },
    },
    shape: { borderRadius: 12 },
  },
  teal: {
    palette: {
      mode: 'light',
      primary: { main: '#009688' },
      secondary: { main: '#4db6ac' },
      background: { default: '#e0f2f1', paper: '#fff' },
      text: { primary: '#004d40', secondary: '#009688' },
    },
    shape: { borderRadius: 12 },
  },
  red: {
    palette: {
      mode: 'light',
      primary: { main: '#e53935' },
      secondary: { main: '#ff8a65' },
      background: { default: '#ffebee', paper: '#fff' },
      text: { primary: '#b71c1c', secondary: '#e53935' },
    },
    shape: { borderRadius: 12 },
  },
  gray: {
    palette: {
      mode: 'light',
      primary: { main: '#757575' },
      secondary: { main: '#bdbdbd' },
      background: { default: '#f5f5f5', paper: '#fff' },
      text: { primary: '#212121', secondary: '#757575' },
    },
    shape: { borderRadius: 12 },
  },
};

function App() {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('pos_theme_name') as ThemeName;
    return stored && themeOptions[stored] ? stored : 'light';
  });

  useEffect(() => {
    localStorage.setItem('pos_theme_name', themeName);
  }, [themeName]);

  const themeContextValue = useMemo(
    () => ({
      setThemeName: (name: ThemeName) => {
        if (themeOptions[name]) setThemeName(name);
      },
      themeName: themeName,
    }),
    [themeName]
  );

  const theme = useMemo(() => createTheme(themeOptions[themeName]), [themeName]);

  // Check authentication state on app start
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated && window.location.hash !== '#/login') {
      window.location.hash = '#/login';
    }
  }, []);

  // Store Settings state with local storage
  const [storeSettings, setStoreSettings] = useState(() => {
    const stored = localStorage.getItem('pos_store_settings');
    return stored ? JSON.parse(stored) : {
      storeName: 'My Store',
      storeAddress: '123 Main Street',
      phoneNumber: '',
      email: '',
    };
  });

  const updateStoreSettings = (settings: { storeName?: string; storeAddress?: string; phoneNumber?: string; email?: string }) => {
    setStoreSettings((prev: typeof storeSettings) => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('pos_store_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Individual setter methods for store settings
  const setStoreName = (storeName: string) => {
    updateStoreSettings({ storeName });
  };

  const setStoreAddress = (storeAddress: string) => {
    updateStoreSettings({ storeAddress });
  };

  const setPhoneNumber = (phoneNumber: string) => {
    updateStoreSettings({ phoneNumber });
  };

  const setEmail = (email: string) => {
    updateStoreSettings({ email });
  };

  // Sales/Receipts state with local storage
  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const stored = localStorage.getItem('pos_sales');
    return stored ? JSON.parse(stored) : [];
  });

  const [receipts, setReceipts] = useState<ReceiptRecord[]>(() => {
    const stored = localStorage.getItem('pos_receipts');
    return stored ? JSON.parse(stored) : [];
  });

  // Gross Sales state with local storage
  const [grossSalesData, setGrossSalesData] = useState<GrossSalesRecord[]>(() => {
    const stored = localStorage.getItem('pos_gross_sales');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((record: any) => ({
          ...record,
          date: new Date(record.date)
        }));
      } catch (error) {
        console.error('Error loading gross sales data:', error);
        return [];
      }
    }
    return [];
  });

  // Daily Sales state with local storage
  const [dailySalesData, setDailySalesData] = useState<DailySalesRecord[]>(() => {
    const stored = localStorage.getItem('pos_daily_sales');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((record: any) => ({
          ...record,
          date: new Date(record.date)
        }));
      } catch (error) {
        console.error('Error loading daily sales data:', error);
        return [];
      }
    }
    return [];
  });

  // Function to record gross sales (now handles both monthly and daily)
  const recordGrossSales = (grossAmount: number, purchaseAmount: number = 0) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const dayName = now.toLocaleString('default', { weekday: 'long' });

    // Update monthly data
    setGrossSalesData(prev => {
      const existingRecordIndex = prev.findIndex(
        record => record.year === year && record.month === month
      );

      let updatedData: GrossSalesRecord[];
      
      if (existingRecordIndex >= 0) {
        // Update existing record
        updatedData = [...prev];
        updatedData[existingRecordIndex] = {
          ...updatedData[existingRecordIndex],
          gross: updatedData[existingRecordIndex].gross + grossAmount,
          purchase: updatedData[existingRecordIndex].purchase + purchaseAmount,
          profit: (updatedData[existingRecordIndex].gross + grossAmount) - (updatedData[existingRecordIndex].purchase + purchaseAmount),
          date: now
        };
      } else {
        // Create new record
        const newRecord: GrossSalesRecord = {
          year,
          month,
          monthName,
          gross: grossAmount,
          purchase: purchaseAmount,
          profit: grossAmount - purchaseAmount,
          date: now
        };
        updatedData = [...prev, newRecord];
      }

      // Save to localStorage
      localStorage.setItem('pos_gross_sales', JSON.stringify(updatedData));
      return updatedData;
    });

    // Update daily data
    setDailySalesData(prev => {
      const existingRecordIndex = prev.findIndex(
        record => record.year === year && record.month === month && record.day === day
      );

      let updatedData: DailySalesRecord[];
      
      if (existingRecordIndex >= 0) {
        // Update existing record
        updatedData = [...prev];
        updatedData[existingRecordIndex] = {
          ...updatedData[existingRecordIndex],
          gross: updatedData[existingRecordIndex].gross + grossAmount,
          purchase: updatedData[existingRecordIndex].purchase + purchaseAmount,
          profit: (updatedData[existingRecordIndex].gross + grossAmount) - (updatedData[existingRecordIndex].purchase + purchaseAmount),
          date: now
        };
      } else {
        // Create new record
        const newRecord: DailySalesRecord = {
          year,
          month,
          day,
          dayName,
          monthName,
          gross: grossAmount,
          purchase: purchaseAmount,
          profit: grossAmount - purchaseAmount,
          date: now
        };
        updatedData = [...prev, newRecord];
      }

      // Save to localStorage
      localStorage.setItem('pos_daily_sales', JSON.stringify(updatedData));
      return updatedData;
    });
  };

  const addSale = (sale: SaleRecord) => {
    setSales(prev => {
      const newSales = [...prev, sale];
      localStorage.setItem('pos_sales', JSON.stringify(newSales));
      return newSales;
    });
  };

  const addReceipt = (receipt: ReceiptRecord) => {
    setReceipts(prev => {
      const newReceipts = [...prev, receipt];
      localStorage.setItem('pos_receipts', JSON.stringify(newReceipts));
      return newReceipts;
    });
  };

  const deleteReceipt = (id: string) => {
    setReceipts(prev => {
      const newReceipts = prev.filter(receipt => receipt.id !== id);
      localStorage.setItem('pos_receipts', JSON.stringify(newReceipts));
      return newReceipts;
    });
  };

  // Products and Categories state with local storage
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('pos_products');
      if (stored) {
        const parsedProducts = JSON.parse(stored);
        // Migrate products to ensure barcodes are arrays
        const migratedProducts = parsedProducts.map((product: any) => ({
          ...product,
          barcodes: Array.isArray(product.barcodes) ? product.barcodes.filter((b: string) => b.trim() !== '') : 
                   (typeof product.barcodes === 'string' && product.barcodes.trim() !== '' ? [product.barcodes] : [])
        }));
        // Save migrated products back to localStorage
        localStorage.setItem('pos_products', JSON.stringify(migratedProducts));
        return migratedProducts;
      }
      return [];
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem('pos_categories');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  });

  // Initialize categories in localStorage if not present
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pos_categories');
      if (!stored) {
        localStorage.setItem('pos_categories', JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  }, []);

  // Products and Categories handlers
  const addProduct = (product: Product) => {
    try {
      setProducts(prev => {
        const newProducts = [...prev, product];
        localStorage.setItem('pos_products', JSON.stringify(newProducts));
        return newProducts;
      });
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const updateProduct = (product: Product) => {
    try {
      setProducts(prev => {
        const newProducts = prev.map(p => p.id === product.id ? product : p);
        localStorage.setItem('pos_products', JSON.stringify(newProducts));
        return newProducts;
      });
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const deleteProduct = (id: string) => {
    try {
      setProducts(prev => {
        const newProducts = prev.filter(p => p.id !== id);
        localStorage.setItem('pos_products', JSON.stringify(newProducts));
        return newProducts;
      });
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const addCategory = (category: Category) => {
    try {
      setCategories(prev => {
        const newCategories = [...prev, category];
        localStorage.setItem('pos_categories', JSON.stringify(newCategories));
        return newCategories;
      });
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const updateCategory = (category: Category) => {
    try {
      setCategories(prev => {
        const newCategories = prev.map(c => c.id === category.id ? category : c);
        localStorage.setItem('pos_categories', JSON.stringify(newCategories));
        return newCategories;
      });
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const deleteCategory = (id: string) => {
    try {
      setCategories(prev => {
        const newCategories = prev.filter(c => c.id !== id);
        localStorage.setItem('pos_categories', JSON.stringify(newCategories));
        return newCategories;
      });
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Add CSV export/import functions
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle arrays (like barcodes)
          if (Array.isArray(value)) {
            return `"${value.join(';')}"`;
          }
          // Handle strings that might contain commas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          // Handle numbers
          if (typeof value === 'number') {
            return value.toString();
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add export/import functions to the App component
  const exportProducts = (products: Product[], filename: string) => {
    const exportData = products.map(product => ({
      id: product.id,
      barcodes: product.barcodes, // Keep as array
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      category: product.category
    }));
    exportToCSV(exportData, filename);
  };

  const importProducts = async (products: any[]) => {
    try {
      const newProducts = products.map(row => ({
        id: row.id || Date.now().toString(),
        barcodes: Array.isArray(row.barcodes) ? row.barcodes.filter((b: string) => b.trim() !== '') : 
                 (typeof row.barcodes === 'string' && row.barcodes.trim() !== '' ? [row.barcodes] : []),
        name: row.name || '',
        price: parseFloat(row.price?.toString() || '0'),
        quantity: parseInt(row.quantity?.toString() || '0'),
        category: row.category || ''
      }));
      setProducts(newProducts);
      localStorage.setItem('pos_products', JSON.stringify(newProducts));
    } catch (error) {
      console.error('Error importing products:', error);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <StoreSettingsContext.Provider value={{ 
        ...storeSettings, 
        setStoreName,
        setStoreAddress,
        setPhoneNumber,
        setEmail,
        updateStoreSettings 
      }}>
        <ProductsContext.Provider value={{ 
          products, 
          categories, 
          addProduct, 
          updateProduct, 
          deleteProduct,
          addCategory,
          updateCategory,
          deleteCategory,
          exportProducts,
          importProducts
        }}>
          <SalesContext.Provider value={{ sales, receipts, addSale, addReceipt, deleteReceipt, setSales, setReceipts }}>
            <GrossSalesContext.Provider value={{ 
              grossSalesData,
              dailySalesData,
              recordGrossSales,
              setGrossSalesData,
              setDailySalesData
            }}>
              <PrinterProvider>
                <ThemeProvider theme={theme}>
                  <CssBaseline />
                  <Router>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Basket />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/sales"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <SalesRecord />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/products"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <ManageProducts />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/receipts"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Receipts />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Settings />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/customer-credit"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <CustomerCredit />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/staff"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Staff />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/gross-sales"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <GrossSales />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                  </Router>
                </ThemeProvider>
              </PrinterProvider>
            </GrossSalesContext.Provider>
          </SalesContext.Provider>
        </ProductsContext.Provider>
      </StoreSettingsContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App; 
