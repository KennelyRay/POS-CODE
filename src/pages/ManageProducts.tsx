import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Snackbar,
  Alert,
  Chip,
  Tooltip,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory2 as InventoryIcon,
  Clear as ClearIcon,
  Category as CategoryIcon,
  Numbers as NumbersIcon,
  DriveFileRenameOutline as DriveFileRenameOutlineIcon,
  LocalOffer as LocalOfferIcon,
  Inventory as InventoryIcon2,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  ExpandLess as ExpandLessIcon,
  ViewList as ViewListIcon,
  GridView as GridViewIcon,
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { ProductsContext, Product, StoreSettingsContext } from '../App';

type PriceListCategoryGroup = {
  name: string;
  products: Product[];
};

type PriceListPrintRow =
  | {
      type: 'category';
      label: string;
    }
  | {
      type: 'product';
      product: Product;
    };

type PriceListPrintPage = {
  pageNumber: number;
  rows: PriceListPrintRow[];
  productCount: number;
};

type PriceListPrintContentProps = {
  storeName: string;
  storeAddress: string;
  pages: PriceListPrintPage[];
  totalProducts: number;
};

const PRICE_LIST_FIRST_PAGE_ROW_CAPACITY = 18;
const PRICE_LIST_OTHER_PAGE_ROW_CAPACITY = 24;

const buildPriceListPages = (categories: PriceListCategoryGroup[]): PriceListPrintPage[] => {
  const pages: PriceListPrintPage[] = [];
  let currentPage: PriceListPrintPage = {
    pageNumber: 1,
    rows: [],
    productCount: 0,
  };

  const getPageCapacity = (pageNumber: number) =>
    pageNumber === 1 ? PRICE_LIST_FIRST_PAGE_ROW_CAPACITY : PRICE_LIST_OTHER_PAGE_ROW_CAPACITY;

  const pushCurrentPage = () => {
    if (currentPage.rows.length > 0) {
      pages.push(currentPage);
    }
  };

  const startNewPage = () => {
    pushCurrentPage();
    currentPage = {
      pageNumber: pages.length + 1,
      rows: [],
      productCount: 0,
    };
  };

  const ensureRoom = (requiredRows: number) => {
    const remainingRows = getPageCapacity(currentPage.pageNumber) - currentPage.rows.length;
    if (currentPage.rows.length > 0 && remainingRows < requiredRows) {
      startNewPage();
    }
  };

  const addCategoryRow = (categoryName: string, isContinued = false) => {
    currentPage.rows.push({
      type: 'category',
      label: isContinued ? `${categoryName} (continued)` : categoryName,
    });
  };

  for (const category of categories) {
    if (category.products.length === 0) {
      continue;
    }

    // Keep the category header with at least one product row whenever possible.
    ensureRoom(2);
    addCategoryRow(category.name);

    for (const product of category.products) {
      const remainingRows = getPageCapacity(currentPage.pageNumber) - currentPage.rows.length;
      if (remainingRows === 0) {
        startNewPage();
        addCategoryRow(category.name, true);
      }

      currentPage.rows.push({
        type: 'product',
        product,
      });
      currentPage.productCount += 1;
    }
  }

  pushCurrentPage();

  return pages;
};

const PriceListPrintContent = React.forwardRef<HTMLDivElement, PriceListPrintContentProps>(
  ({ storeName, storeAddress, pages, totalProducts }, ref) => {
    const generatedAt = new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <Box
        ref={ref}
        sx={{
          bgcolor: 'common.white',
          color: 'text.primary',
          p: 3,
          minWidth: 820,
        }}
      >
        {pages.map((page, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <Box
              key={`price-list-page-${page.pageNumber}`}
              sx={{
                width: '100%',
                maxWidth: 900,
                mx: 'auto',
                mb: isLastPage ? 0 : 3,
                px: 3,
                py: 3.5,
                bgcolor: 'common.white',
                border: '1px solid',
                borderColor: 'grey.300',
                boxShadow: 2,
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                breakAfter: isLastPage ? 'auto' : 'page',
                '@media print': {
                  maxWidth: 'none',
                  minHeight: '277mm',
                  boxShadow: 'none',
                  border: 'none',
                  mb: 0,
                  px: 0,
                  py: 0,
                },
              }}
            >
              <Box
                sx={{
                  mb: 2,
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                  <Typography variant="h4" fontWeight={800}>
                    {storeName || 'Store Price List'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {storeAddress || 'Store Address'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Printed on {generatedAt}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Products on this page: {page.productCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>
                    Page {page.pageNumber} of {pages.length}
                  </Typography>
                </Box>
                {page.pageNumber === 1 && (
                  <Box
                    sx={{
                      mt: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total products: {totalProducts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total pages: {pages.length}
                    </Typography>
                  </Box>
                )}
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ width: '42%', fontWeight: 700, border: '1px solid', borderColor: 'grey.300' }}>Product</TableCell>
                      <TableCell sx={{ width: '38%', fontWeight: 700, border: '1px solid', borderColor: 'grey.300' }}>Barcode</TableCell>
                      <TableCell align="right" sx={{ width: '20%', fontWeight: 700, border: '1px solid', borderColor: 'grey.300' }}>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {page.rows.map((row, rowIndex) =>
                      row.type === 'category' ? (
                        <TableRow key={`category-${page.pageNumber}-${row.label}-${rowIndex}`}>
                          <TableCell
                            colSpan={3}
                            sx={{
                              px: 2,
                              py: 1,
                              fontWeight: 800,
                              bgcolor: 'grey.100',
                              border: '1px solid',
                              borderColor: 'grey.300',
                            }}
                          >
                            {row.label}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={row.product.id}>
                          <TableCell sx={{ border: '1px solid', borderColor: 'grey.300' }}>
                            {row.product.name}
                          </TableCell>
                          <TableCell sx={{ border: '1px solid', borderColor: 'grey.300' }}>
                            {row.product.barcodes.filter(Boolean).join(', ') || 'No barcode'}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ border: '1px solid', borderColor: 'grey.300', fontWeight: 700 }}
                          >
                            PHP {row.product.price.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  mt: 1.5,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Page {page.pageNumber} of {pages.length}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }
);

PriceListPrintContent.displayName = 'PriceListPrintContent';

const ManageProducts: React.FC = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    exportProducts,
    importProducts,
  } = useContext(ProductsContext);
  const storeSettings = useContext(StoreSettingsContext);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [priceListDialogOpen, setPriceListDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const priceListPrintRef = useRef<HTMLDivElement>(null);
  
  // New state for improved UX
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentView, setCurrentView] = useState<'categories' | 'products'>('categories');
  const [selectedCategoryForView, setSelectedCategoryForView] = useState<string>('');

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.barcodes.some((barcode) => barcode.toLowerCase().includes(normalizedSearch));
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  // Get categories with product counts for tile display
  const categoriesWithCounts = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        productCount: products.filter((p) => p.category === category.name).length,
        matchingProducts:
          currentView === 'categories' && search
            ? products.filter(
                (p) =>
                  p.category === category.name &&
                  (p.name.toLowerCase().includes(normalizedSearch) ||
                    p.barcodes.some((barcode) => barcode.toLowerCase().includes(normalizedSearch)))
              ).length
            : 0,
      }))
      .filter((category) => category.productCount > 0);
  }, [categories, currentView, products, search]);

  // Get all matching products when searching (regardless of category)
  const searchResults = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.barcodes.some((barcode) => barcode.toLowerCase().includes(normalizedSearch))
    );
  }, [products, search]);

  const priceListCategories = useMemo<PriceListCategoryGroup[]>(() => {
    const grouped = new Map<string, Product[]>();
    for (const product of products) {
      const categoryName = product.category || 'Uncategorized';
      const list = grouped.get(categoryName);
      if (list) list.push(product);
      else grouped.set(categoryName, [product]);
    }

    return Array.from(grouped.entries())
      .map(([name, categoryProducts]) => ({
        name,
        products: [...categoryProducts].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const priceListPages = useMemo(
    () => buildPriceListPages(priceListCategories),
    [priceListCategories]
  );

  const handlePrintPriceList = useReactToPrint({
    content: () => priceListPrintRef.current,
    documentTitle: `${storeSettings.storeName || 'Store'} Price List`,
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct({
        id: '',
        barcodes: [''],
        name: '',
        price: 0,
        quantity: 0,
        category: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = () => {
    if (editingProduct) {
      // Filter out empty barcodes
      const cleanedProduct = {
        ...editingProduct,
        barcodes: editingProduct.barcodes.filter(barcode => barcode.trim() !== '')
      };

      // Check for duplicate barcodes only if there are any barcodes
      if (cleanedProduct.barcodes.length > 0) {
        const hasDuplicateBarcode = products.some(product => {
          // Skip the current product when editing
          if (product.id === cleanedProduct.id) return false;
          
          // Check if any barcode in the current product matches any barcode in other products
          return product.barcodes.some(existingBarcode => 
            cleanedProduct.barcodes.some(newBarcode => 
              existingBarcode === newBarcode && newBarcode.trim() !== ''
            )
          );
        });

        if (hasDuplicateBarcode) {
          setSnackbar({ 
            open: true, 
            message: 'One or more barcodes already exist in another product', 
            severity: 'error' 
          });
          return;
        }
      }

      if (cleanedProduct.id) {
        updateProduct(cleanedProduct);
        setSnackbar({ open: true, message: 'Product updated', severity: 'success' });
      } else {
        addProduct({ ...cleanedProduct, id: Date.now().toString() });
        setSnackbar({ open: true, message: 'Product added', severity: 'success' });
      }
      handleCloseDialog();
    }
  };

  const handleAddBarcode = () => {
    setEditingProduct(prev => prev ? { ...prev, barcodes: [...prev.barcodes, ''] } : null);
  };

  const handleRemoveBarcode = (index: number) => {
    setEditingProduct(prev => prev ? {
      ...prev,
      barcodes: prev.barcodes.filter((_, i) => i !== index)
    } : null);
  };

  const handleBarcodeChange = (index: number, value: string) => {
    // Check if the barcode already exists in other products
    const isDuplicate = products.some(product => 
      product.id !== editingProduct?.id && // Don't check against the current product being edited
      product.barcodes.some(barcode => barcode === value && value.trim() !== '')
    );

    if (isDuplicate) {
      setSnackbar({ 
        open: true, 
        message: 'This barcode already exists in another product', 
        severity: 'error' 
      });
      return;
    }

    setEditingProduct(prev => prev ? {
      ...prev,
      barcodes: prev.barcodes.map((barcode, i) => i === index ? value : barcode)
    } : null);
  };

  const handleExportProducts = () => {
    try {
      const productsToExport = products.map(product => ({
        id: product.id,
        barcodes: Array.isArray(product.barcodes) ? product.barcodes : [],
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        category: product.category
      }));
      exportProducts(productsToExport, 'products.csv');
      setSnackbar({ open: true, message: 'Products exported successfully', severity: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      setSnackbar({ open: true, message: 'Error exporting products', severity: 'error' });
    }
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          const rows = text.split('\n');
          const headers = rows[0].split(',');
          
          const importedProducts = rows.slice(1).map(row => {
            const values = row.split(',');
            const product: any = {};
            headers.forEach((header, index) => {
              const value = values[index]?.replace(/"/g, '').trim();
              if (header === 'barcodes') {
                product[header] = value ? value.split(';') : [];
              } else if (header === 'price' || header === 'quantity') {
                product[header] = parseFloat(value) || 0;
              } else {
                product[header] = value || '';
              }
            });
            return product;
          });

          await importProducts(importedProducts);
          setSnackbar({ open: true, message: 'Products imported successfully', severity: 'success' });
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Import error:', error);
        setSnackbar({ open: true, message: 'Error importing products', severity: 'error' });
      }
    }
  };

  const handleClearProducts = () => {
    if (window.confirm('Are you sure you want to clear all products? This action cannot be undone.')) {
      localStorage.removeItem('pos_products');
      window.location.reload();
    }
  };

  const handleOpenPriceListDialog = () => {
    if (products.length === 0) {
      setSnackbar({ open: true, message: 'No products available to print.', severity: 'info' });
      return;
    }
    setPriceListDialogOpen(true);
  };

  const handlePrintPriceListClick = () => {
    handlePrintPriceList();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <InventoryIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={800} color="primary.main">
                  Product Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Manage your inventory and product catalog
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<PrintIcon />}
              onClick={handleOpenPriceListDialog}
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                fontWeight: 700,
              }}
            >
              Print Price List
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontWeight: 700,
                boxShadow: 3,
                '&:hover': { boxShadow: 6 }
              }}
            >
              Add Product
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight={700}>{products.length}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Products</Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight={700}>{categories.length}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Categories</Typography>
                </Box>
                <CategoryIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight={700}>{products.reduce((sum, p) => sum + p.quantity, 0)}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Stock</Typography>
                </Box>
                <InventoryIcon2 sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight={700}>{filteredProducts.length}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Filtered Results</Typography>
                </Box>
                <SearchIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content Card */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        {/* Search and Filter Controls */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search products by name or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
              />
            </Grid>
            {currentView === 'products' && (
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    label={`Category: ${selectedCategoryForView}`}
                    color="primary"
                    variant="filled"
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {filteredProducts.length} products
                  </Typography>
                </Box>
              </Grid>
            )}
            {currentView === 'categories' && (
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Browse by category to manage your products efficiently
                  </Typography>
                  <Chip
                    label={`${categoriesWithCounts.length} categories`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Tooltip title="Export Products">
                  <IconButton
                    onClick={handleExportProducts}
                    sx={{ borderRadius: 2, bgcolor: 'success.50', '&:hover': { bgcolor: 'success.100' } }}
                  >
                    <FileDownloadIcon color="success" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Import Products">
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderRadius: 2, bgcolor: 'info.50', '&:hover': { bgcolor: 'info.100' } }}
                  >
                    <FileUploadIcon color="info" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear All Products">
                  <IconButton
                    onClick={handleClearProducts}
                    sx={{ borderRadius: 2, bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}
                  >
                    <ClearIcon color="error" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Content Area */}
        {currentView === 'categories' ? (
          // Categories View
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                Product Categories
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {categoriesWithCounts.length} categories • {products.length} total products
              </Typography>
            </Box>
            
            {search.trim() ? (
              // Show search results directly when searching
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Button
                    startIcon={<ExpandLessIcon />}
                    onClick={() => setSearch('')}
                    sx={{ borderRadius: 2 }}
                  >
                    Clear Search
                  </Button>
                  <Typography variant="h6" fontWeight={700}>
                    Search Results for "{search}"
                  </Typography>
                  <Chip
                    label={`${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                
                {searchResults.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <SearchIcon sx={{ fontSize: 120, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h5" color="text.secondary" gutterBottom>
                      No products found
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      Try adjusting your search terms or browse by category
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog()}
                      sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                    >
                      Add Product
                    </Button>
                  </Box>
                ) : (
                  // Show search results in table format
                  <TableContainer>
                    <Table sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>Barcodes</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>Category</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 16 }}>Price</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 16 }}>Quantity</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: 16 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.map((product) => (
                          <TableRow
                            key={product.id}
                            hover
                            sx={{
                              '&:hover': { bgcolor: 'grey.50' },
                            }}
                          >
                            <TableCell>
                              <Stack spacing={0.5}>
                                {(product.barcodes || []).map((barcode, index) => (
                                  <Chip
                                    key={index}
                                    label={barcode}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: 11, height: 24 }}
                                  />
                                ))}
                                {product.barcodes.length === 0 && (
                                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                    No barcodes
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={product.name} placement="top">
                                <Typography fontWeight={600}>{product.name}</Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={product.category}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} color="primary.main">
                                ₱{product.price.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={product.quantity}
                                size="small"
                                color={product.quantity > 10 ? 'success' : product.quantity > 0 ? 'warning' : 'error'}
                                sx={{ fontWeight: 600, minWidth: 50 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenDialog(product)}
                                  sx={{ borderRadius: 2, bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => deleteProduct(product.id)}
                                  sx={{ borderRadius: 2, bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ) : categoriesWithCounts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CategoryIcon sx={{ fontSize: 120, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No categories with products found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Add products to categories to see them here
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                >
                  Add Product
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {categoriesWithCounts.map((category) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        },
                        border: '1px solid',
                        borderColor: 'grey.200',
                        position: 'relative',
                      }}
                      onClick={() => {
                        setSelectedCategoryForView(category.name);
                        setSelectedCategory(category.name);
                        setCurrentView('products');
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            width: 64,
                            height: 64,
                            mx: 'auto',
                            mb: 2,
                          }}
                        >
                          <CategoryIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                          <Chip
                            size="small"
                            label={`${category.productCount} items`}
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : (
          // Products View (when a category is selected)
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Button
                startIcon={<ExpandLessIcon />}
                onClick={() => {
                  setCurrentView('categories');
                  setSelectedCategory('All');
                  setSelectedCategoryForView('');
                }}
                sx={{ borderRadius: 2 }}
              >
                Back to Categories
              </Button>
              <Typography variant="h6" fontWeight={700}>
                {selectedCategoryForView} Products ({filteredProducts.length} items)
              </Typography>
            </Box>

            {/* View Mode Toggle for Products */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Tooltip title={viewMode === 'table' ? 'Switch to Grid View' : 'Switch to Table View'}>
                <IconButton
                  onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                  sx={{ borderRadius: 2, bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                >
                  {viewMode === 'table' ? <GridViewIcon color="primary" /> : <ViewListIcon color="primary" />}
                </IconButton>
              </Tooltip>
            </Box>

            {viewMode === 'table' ? (
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>Barcodes</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 16 }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 16 }}>Quantity</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: 16 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <InventoryIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                              No products found in {selectedCategoryForView}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              {search
                                ? 'Try adjusting your search criteria'
                                : 'Add your first product to this category'
                              }
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenDialog()}
                              sx={{ borderRadius: 3 }}
                            >
                              Add Product
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow
                          key={product.id}
                          hover
                          sx={{
                            '&:hover': { bgcolor: 'grey.50' },
                          }}
                        >
                          <TableCell>
                            <Stack spacing={0.5}>
                              {(product.barcodes || []).map((barcode, index) => (
                                <Chip
                                  key={index}
                                  label={barcode}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: 11, height: 24 }}
                                />
                              ))}
                              {product.barcodes.length === 0 && (
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                  No barcodes
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={product.name} placement="top">
                              <Typography fontWeight={600}>{product.name}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={product.category}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600} color="primary.main">
                              {product.price.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={product.quantity}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="Edit Product">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(product)}
                                  sx={{ 
                                    bgcolor: 'primary.50', 
                                    '&:hover': { bgcolor: 'primary.100' },
                                    borderRadius: 2
                                  }}
                                >
                                  <EditIcon fontSize="small" color="primary" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Product">
                                <IconButton
                                  size="small"
                                  onClick={() => deleteProduct(product.id)}
                                  sx={{ 
                                    bgcolor: 'error.50', 
                                    '&:hover': { bgcolor: 'error.100' },
                                    borderRadius: 2
                                  }}
                                >
                                  <DeleteIcon fontSize="small" color="error" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box>
                {filteredProducts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <InventoryIcon sx={{ fontSize: 120, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h5" color="text.secondary" gutterBottom>
                      No products found in {selectedCategoryForView}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      {search 
                        ? 'Try adjusting your search criteria'
                        : 'Add your first product to this category'
                      }
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog()}
                      sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                    >
                      Add Product
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {filteredProducts.map((product) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                        <Card
                          sx={{
                            borderRadius: 3,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: 6,
                            },
                            border: '1px solid',
                            borderColor: 'grey.200',
                            position: 'relative',
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ mb: 2 }}>
                              <Tooltip title={product.name} placement="top">
                                <Typography variant="h6" fontWeight={700} gutterBottom noWrap>
                                  {product.name}
                                </Typography>
                              </Tooltip>
                              <Chip
                                label={product.category}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mb: 2 }}
                              />
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Barcodes:
                              </Typography>
                              <Stack spacing={0.5}>
                                {product.barcodes.length > 0 ? (
                                  product.barcodes.slice(0, 2).map((barcode, index) => (
                                    <Chip
                                      key={index}
                                      label={barcode}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: 10, height: 20 }}
                                    />
                                  ))
                                ) : (
                                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                    No barcodes
                                  </Typography>
                                )}
                                {product.barcodes.length > 2 && (
                                  <Typography variant="caption" color="primary.main">
                                    +{product.barcodes.length - 2} more
                                  </Typography>
                                )}
                              </Stack>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6" color="primary.main" fontWeight={700}>
                                {product.price.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                              </Typography>
                              <Chip
                                label={`Qty: ${product.quantity}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenDialog(product)}
                                sx={{ flex: 1, borderRadius: 2 }}
                              >
                                Edit
                              </Button>
                              <IconButton
                                size="small"
                                onClick={() => deleteProduct(product.id)}
                                sx={{ 
                                  bgcolor: 'error.50', 
                                  '&:hover': { bgcolor: 'error.100' },
                                  borderRadius: 2
                                }}
                              >
                                <DeleteIcon fontSize="small" color="error" />
                              </IconButton>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* Hidden file input */}
      <input
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleImportProducts}
      />

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: 4, 
            boxShadow: 12, 
            overflow: 'hidden',
            bgcolor: 'background.paper' 
          } 
        }}
      >
        {/* Modern Header with Gradient */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 3,
          position: 'relative'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
              <InventoryIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {editingProduct?.id ? 'Edit Product' : 'Add New Product'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {editingProduct?.id ? 'Update product information' : 'Create a new product in your inventory'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: 'grey.50' }}>
          <Box component="form" onSubmit={e => { e.preventDefault(); handleSaveProduct(); }}>
            <Grid container>
              {/* Left Column - Basic Information */}
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 4, bgcolor: 'white', minHeight: '100%' }}>
                  <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DriveFileRenameOutlineIcon />
                    Basic Information
                  </Typography>
                  
                  <Stack spacing={3}>
                    <TextField
                      label="Product Name"
                      placeholder="Enter a descriptive product name"
                      value={editingProduct?.name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProduct((prev) => prev ? { ...prev, name: e.target.value } : null)}
                      fullWidth
                      required
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { borderRadius: 3 },
                        '& .MuiInputLabel-root': { fontWeight: 600 }
                      }}
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Price"
                          type="number"
                          placeholder="0.00"
                          value={editingProduct?.price || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProduct((prev) => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LocalOfferIcon color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { borderRadius: 3 },
                            '& .MuiInputLabel-root': { fontWeight: 600 }
                          }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Quantity"
                          type="number"
                          placeholder="0"
                          value={editingProduct?.quantity || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProduct((prev) => prev ? { ...prev, quantity: parseInt(e.target.value) || 0 } : null)}
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <InventoryIcon2 color="primary" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { borderRadius: 3 },
                            '& .MuiInputLabel-root': { fontWeight: 600 }
                          }}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      select
                      label="Category"
                      placeholder="Select a category"
                      value={editingProduct?.category || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingProduct((prev) => prev ? { ...prev, category: e.target.value } : null)}
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CategoryIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { borderRadius: 3 },
                        '& .MuiInputLabel-root': { fontWeight: 600 }
                      }}
                    >
                      {(categories || []).map((category) => (
                        <MenuItem key={category.id} value={category.name}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CategoryIcon fontSize="small" color="primary" />
                            {category.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Box>
              </Grid>

              {/* Right Column - Barcodes */}
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 4, bgcolor: 'primary.50', minHeight: '100%' }}>
                  <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NumbersIcon />
                    Product Barcodes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Add barcodes to make product scanning easier. Leave empty if not needed.
                  </Typography>
                  
                  <Stack spacing={2}>
                    {(editingProduct?.barcodes || ['']).map((barcode, index) => (
                      <Card key={index} sx={{ borderRadius: 3, boxShadow: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                              label={`Barcode ${index + 1}`}
                              placeholder="Scan or type barcode"
                              value={barcode}
                              onChange={(e) => handleBarcodeChange(index, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleBarcodeChange(index, (e.target as HTMLInputElement).value);
                                  if (index === ((editingProduct?.barcodes?.length ?? 1) - 1) && (e.target as HTMLInputElement).value.trim() !== '') {
                                    handleAddBarcode();
                                  }
                                  e.preventDefault();
                                }
                              }}
                              fullWidth
                              size="small"
                              autoFocus={index === 0}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <NumbersIcon color="primary" fontSize="small" />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ 
                                '& .MuiOutlinedInput-root': { borderRadius: 2 }
                              }}
                            />
                            {index > 0 && (
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveBarcode(index)}
                                size="small"
                                sx={{ 
                                  mt: 0.5,
                                  bgcolor: 'error.50',
                                  '&:hover': { bgcolor: 'error.100' },
                                  borderRadius: 2
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddBarcode}
                      variant="outlined"
                      color="primary"
                      sx={{ 
                        borderRadius: 3, 
                        borderStyle: 'dashed',
                        py: 1.5,
                        fontWeight: 600,
                        '&:hover': {
                          borderStyle: 'solid',
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      Add Another Barcode
                    </Button>
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        {/* Modern Footer */}
        <Box sx={{ 
          p: 3, 
          bgcolor: 'white',
          borderTop: '1px solid',
          borderColor: 'grey.200',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="body2" color="text.secondary">
            {editingProduct?.id ? 'Update existing product information' : 'All fields marked with * are required'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={handleCloseDialog} 
              variant="outlined"
              sx={{ 
                borderRadius: 3, 
                fontWeight: 600, 
                minWidth: 100,
                px: 3
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              variant="contained"
              sx={{ 
                borderRadius: 3, 
                fontWeight: 700, 
                minWidth: 100,
                px: 3,
                boxShadow: 3,
                '&:hover': { boxShadow: 6 }
              }}
            >
              {editingProduct?.id ? 'Update Product' : 'Create Product'}
            </Button>
          </Box>
        </Box>
      </Dialog>
      <Dialog
        open={priceListDialogOpen}
        onClose={() => setPriceListDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Print Product Price List</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'grey.50' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              mb: 2,
            }}
          >
            <Chip
              label={`${priceListPages.length} page${priceListPages.length !== 1 ? 's' : ''} to print`}
              color="primary"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" color="text.secondary">
              {products.length} products arranged neatly across separate print pages
            </Typography>
          </Box>
          <PriceListPrintContent
            ref={priceListPrintRef}
            storeName={storeSettings.storeName}
            storeAddress={storeSettings.storeAddress}
            pages={priceListPages}
            totalProducts={products.length}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPriceListDialogOpen(false)} variant="outlined" sx={{ borderRadius: 3 }}>
            Close
          </Button>
          <Button onClick={handlePrintPriceListClick} variant="contained" startIcon={<PrintIcon />} sx={{ borderRadius: 3, fontWeight: 700 }}>
            Print Price List
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageProducts; 
