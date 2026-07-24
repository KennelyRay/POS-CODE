import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Collapse,
  Avatar,
  Stack,
  Badge,
  Paper,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Inventory2 as InventoryIcon,
  ExpandLess as ExpandLessIcon,
  Category as CategoryIcon,
  Search as SearchIcon,
  LocalOffer as LocalOfferIcon,
  Print as PrintIcon,
  // Category-specific icons
  LocalBar as LiquorIcon,
  Store as BreadIcon,
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
  ColorLens as DressingsIcon,
  Cookie as BiscuitsIcon,
  Opacity as ButterIcon,
  Spa as FabricConditionerIcon,
  Cake as CandiesIcon,
  Favorite as ChocolateIcon,
  AcUnit as FrozenIcon,
  Icecream as IceCreamIcon,
  Soap as ToiletriesIcon,
  LocalDrink as MilkIcon,
  Agriculture as CerealsIcon,
} from '@mui/icons-material';
import { SalesContext } from '../App';
import { ProductsContext, Product } from '../App';
import { StoreSettingsContext } from '../App';
import { GrossSalesContext } from '../App';
import { usePrinter } from '../contexts/PrinterContext';
import { useTheme } from '@mui/material/styles';

interface BasketItem extends Product {
  quantity: number;
}

const isEditableElement = (element: EventTarget | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  );
};

const createReceiptQrData = (receiptId: string) => {
  const randomSegment = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `DISPLAY-${receiptId}-${randomSegment}`;
};

type BasketItemsListProps = {
  basket: BasketItem[];
  expandedItem: string | null;
  setExpandedItem: React.Dispatch<React.SetStateAction<string | null>>;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, change: number) => void;
  onDirectQuantityChange: (id: string, newQuantity: number) => void;
  onPriceChange: (id: string, newPrice: number) => void;
};

const BasketItemsList = React.memo(function BasketItemsList({
  basket,
  expandedItem,
  setExpandedItem,
  onRemoveItem,
  onUpdateQuantity,
  onDirectQuantityChange,
  onPriceChange,
}: BasketItemsListProps) {
  return (
    <Stack spacing={2}>
      {basket.map((item) => (
        <Paper
          key={item.id}
          sx={{
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: expandedItem === item.id ? 'primary.main' : 'grey.200',
            transition: 'all 0.3s',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 3,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: expandedItem === item.id ? 2 : 0 }}>
            <Box sx={{ flex: 1, cursor: 'pointer' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {item.category}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="primary.main" fontWeight={600}>
                  {item.price.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })} each
                </Typography>
                <Chip
                  size="small"
                  label={`Qty: ${item.quantity}`}
                  color="primary"
                  sx={{ fontWeight: 600 }} 
                />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right', ml: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {(item.price * item.quantity).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
              </Typography>
              <Box>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedItem(item.id);
                  }}
                  sx={{ borderRadius: 2, bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' }, mr: 1 }}
                  disabled={expandedItem === item.id}
                >
                  <span className="material-icons">edit</span>
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'error.50',
                    '&:hover': { bgcolor: 'error.100' },
                    mt: 0.5
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
          <Collapse in={expandedItem === item.id}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <IconButton
                size="small"
                color="default"
                onClick={() => setExpandedItem(null)}
                sx={{ borderRadius: 2 }}
              >
                <span className="material-icons">close</span>
              </IconButton>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Quantity
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(item.id, -1);
                    }}
                    sx={{
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '&:hover': { bgcolor: 'grey.300' },
                      width: 36,
                      height: 36
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    value={item.quantity}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newQty = parseInt(e.target.value) || 1;
                      onDirectQuantityChange(item.id, newQty);
                    }}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => e.stopPropagation()}
                    size="small"
                    type="number"
                    sx={{
                      width: 80,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        textAlign: 'center'
                      },
                      '& input': { textAlign: 'center', fontWeight: 700 }
                    }}
                    inputProps={{ min: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(item.id, 1);
                    }}
                    sx={{
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '&:hover': { bgcolor: 'grey.300' },
                      width: 36,
                      height: 36
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Unit Price
                </Typography>
                <TextField
                  value={item.price.toString()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const value = e.target.value;
                    if (value === '') {
                      return;
                    }
                    const newPrice = parseFloat(value);
                    if (!isNaN(newPrice)) {
                      onPriceChange(item.id, newPrice);
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                  onFocus={e => e.stopPropagation()}
                  size="small"
                  type="number"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    '& input': { fontWeight: 600 }
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  placeholder=""
                />
              </Grid>
            </Grid>
          </Collapse>
        </Paper>
      ))}
    </Stack>
  );
});

const Basket: React.FC = () => {
  const { products, categories } = useContext(ProductsContext);
  const storeSettings = useContext(StoreSettingsContext);
  const { recordGrossSales } = useContext(GrossSalesContext);
  const { selectedPrinter, printReceipt, testPrint, openCashDrawer } = usePrinter();
  const [searchQuery, setSearchQuery] = useState('');
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [customerMoney, setCustomerMoney] = useState<string>('');
  const salesContext = useContext(SalesContext);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    total: number;
    customerMoney: number;
    change: number;
  } | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const theme = useTheme();
  
  // New state for improved design
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const searchQueryRef = useRef(searchQuery);
  const customerMoneyRef = useRef(customerMoney);
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    customerMoneyRef.current = customerMoney;
  }, [customerMoney]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current != null) window.clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = window.setTimeout(() => {
      setBasket([]);
      setSearchQuery('');
      resetInactivityTimer();
    }, 5 * 60 * 1000);
  }, []);

  useEffect(() => {
    resetInactivityTimer();

    const onActivity = () => resetInactivityTimer();
    const options: AddEventListenerOptions = { capture: true, passive: true };
    const keydownOptions: AddEventListenerOptions = { capture: true };

    window.addEventListener('mousemove', onActivity, options);
    window.addEventListener('mousedown', onActivity, options);
    window.addEventListener('keydown', onActivity, keydownOptions);
    window.addEventListener('touchstart', onActivity, options);
    window.addEventListener('wheel', onActivity, options);
    window.addEventListener('scroll', onActivity, options);

    return () => {
      window.removeEventListener('mousemove', onActivity, options);
      window.removeEventListener('mousedown', onActivity, options);
      window.removeEventListener('keydown', onActivity, keydownOptions);
      window.removeEventListener('touchstart', onActivity, options);
      window.removeEventListener('wheel', onActivity, options);
      window.removeEventListener('scroll', onActivity, options);
      if (inactivityTimerRef.current != null) window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    };
  }, [resetInactivityTimer]);

  // Function to get category-specific icon
  const getCategoryIcon = (categoryName: string) => {
    // Find the category in the categories array
    const category = categories.find(cat => cat.name === categoryName);
    
    // If category has a stored icon, use it; otherwise fall back to name-based mapping
    if (category?.icon) {
      const iconName = category.icon;
      switch (iconName) {
        case 'LiquorIcon':
          return <LiquorIcon />;
        case 'BreadIcon':
          return <BreadIcon />;
        case 'MilkIcon':
          return <MilkIcon />;
        case 'CoffeeIcon':
          return <CoffeeIcon />;
        case 'CigarettesIcon':
          return <CigarettesIcon />;
        case 'WholesaleIcon':
          return <WholesaleIcon />;
        case 'JunkFoodIcon':
          return <JunkFoodIcon />;
        case 'CondimentsIcon':
          return <CondimentsIcon />;
        case 'IngredientsIcon':
          return <IngredientsIcon />;
        case 'CanGoodsIcon':
          return <CanGoodsIcon />;
        case 'DetergentIcon':
          return <DetergentIcon />;
        case 'NoodlesIcon':
          return <NoodlesIcon />;
        case 'KitchenThingsIcon':
          return <KitchenThingsIcon />;
        case 'LaundryIcon':
          return <LaundryIcon />;
        case 'CosmeticsIcon':
          return <CosmeticsIcon />;
        case 'CookingBakingIcon':
          return <CookingBakingIcon />;
        case 'DrinksIcon':
          return <DrinksIcon />;
        case 'CerealsIcon':
          return <CerealsIcon />;
        case 'DressingsIcon':
          return <DressingsIcon />;
        case 'BiscuitsIcon':
          return <BiscuitsIcon />;
        case 'ButterIcon':
          return <ButterIcon />;
        case 'FabricConditionerIcon':
          return <FabricConditionerIcon />;
        case 'CandiesIcon':
          return <CandiesIcon />;
        case 'ChocolateIcon':
          return <ChocolateIcon />;
        case 'FrozenIcon':
          return <FrozenIcon />;
        case 'IceCreamIcon':
          return <IceCreamIcon />;
        case 'ToiletriesIcon':
          return <ToiletriesIcon />;
        default:
          return <CategoryIcon />;
      }
    }
    
    // Fallback to name-based mapping for backwards compatibility
    const name = categoryName.toUpperCase();
    switch (name) {
      case 'LIQUOR':
        return <LiquorIcon />;
      case 'BREAD':
        return <BreadIcon />;
      case 'MILK':
        return <MilkIcon />;
      case 'COFFEE':
        return <CoffeeIcon />;
      case 'CIGARETTES':
        return <CigarettesIcon />;
      case 'WHOLE SALE':
        return <WholesaleIcon />;
      case 'JUNK FOOD':
        return <JunkFoodIcon />;
      case 'CONDIMENTS':
        return <CondimentsIcon />;
      case 'INGREDIENTS':
        return <IngredientsIcon />;
      case 'CAN GOODS':
        return <CanGoodsIcon />;
      case 'DETERGENT':
        return <DetergentIcon />;
      case 'NOODLES':
        return <NoodlesIcon />;
      case 'KITCHEN THINGS':
        return <KitchenThingsIcon />;
      case 'LAUNDRY SOAP':
        return <LaundryIcon />;
      case 'COSMETICS':
        return <CosmeticsIcon />;
      case 'COOKING AND BAKING':
        return <CookingBakingIcon />;
      case 'DRINKS':
        return <DrinksIcon />;
      case 'CEREALS':
        return <CerealsIcon />;
      case 'DRESSINGS':
        return <DressingsIcon />;
      case 'BISCUITS':
        return <BiscuitsIcon />;
      case 'BUTTER':
        return <ButterIcon />;
      case 'FABRIC CONDITIONER':
        return <FabricConditionerIcon />;
      case 'CANDIES':
        return <CandiesIcon />;
      case 'CHOCOLATE':
        return <ChocolateIcon />;
      case 'FROZEN':
        return <FrozenIcon />;
      case 'ICE CREAM':
        return <IceCreamIcon />;
      case 'TOILETRIES':
        return <ToiletriesIcon />;
      default:
        return <CategoryIcon />;
    }
  };

  // Function to get category-specific color
  const getCategoryColor = (categoryName: string) => {
    // Return the same color for all categories - using the theme's primary color
    return theme.palette.primary.main;
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = useMemo(() => deferredSearchQuery.trim().toLowerCase(), [deferredSearchQuery]);

  const basketById = useMemo(() => {
    const map = new Map<string, BasketItem>();
    for (const item of basket) map.set(item.id, item);
    return map;
  }, [basket]);

  const basketCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of basket) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [basket]);

  const productsByCategoryMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const list = map.get(product.category);
      if (list) list.push(product);
      else map.set(product.category, [product]);
    }
    return map;
  }, [products]);

  const productByBarcode = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      for (const barcode of product.barcodes ?? []) {
        const normalized = barcode.trim();
        if (!normalized) continue;
        if (!map.has(normalized)) map.set(normalized, product);
        const lower = normalized.toLowerCase();
        if (!map.has(lower)) map.set(lower, product);
      }
    }
    return map;
  }, [products]);

  const total = useMemo(() => basket.reduce((sum, item) => sum + item.price * item.quantity, 0), [basket]);

  const productsByCategory = useMemo(() => {
    if (selectedCategory !== 'All' || normalizedSearchQuery) return [];
    return categories
      .map((category) => ({
        ...category,
        products: productsByCategoryMap.get(category.name) ?? [],
        itemsInBasket: basketCountByCategory.get(category.name) ?? 0
      }))
      .filter((category) => category.products.length > 0);
  }, [basketCountByCategory, categories, normalizedSearchQuery, productsByCategoryMap, selectedCategory]);

  const productsInSelectedCategory = useMemo(() => {
    if (selectedCategory === 'All') return [];
    return productsByCategoryMap.get(selectedCategory) ?? [];
  }, [productsByCategoryMap, selectedCategory]);

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return [];
    return products.filter((product) => {
      if (product.name.toLowerCase().includes(normalizedSearchQuery)) return true;
      return product.barcodes?.some((barcode) => barcode.toLowerCase().includes(normalizedSearchQuery)) ?? false;
    });
  }, [normalizedSearchQuery, products]);

  const handleAddToBasket = useCallback((product: Product) => {
    setBasket((prevBasket) => {
      const existingItem = prevBasket.find((item) => item.id === product.id);
      if (existingItem) {
        setSnackbar({ open: true, message: 'Increased quantity in basket', severity: 'info' });
        return prevBasket.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      setSnackbar({ open: true, message: 'Added to basket', severity: 'success' });
      return [...prevBasket, { ...product, quantity: 1 }];
    });
  }, [setSnackbar]);

  const pendingScanProductsRef = useRef<Product[]>([]);
  const pendingScanNotFoundCountRef = useRef(0);
  const pendingScanFlushTimerRef = useRef<number | null>(null);

  const flushPendingScans = useCallback(() => {
    if (pendingScanFlushTimerRef.current != null) {
      window.clearTimeout(pendingScanFlushTimerRef.current);
      pendingScanFlushTimerRef.current = null;
    }

    const productsToAdd = pendingScanProductsRef.current;
    const notFoundCount = pendingScanNotFoundCountRef.current;
    pendingScanProductsRef.current = [];
    pendingScanNotFoundCountRef.current = 0;

    if (productsToAdd.length === 0 && notFoundCount === 0) return;

    let addedCount = 0;
    let firstAddedName: string | null = null;

    if (productsToAdd.length > 0) {
      const countsById = new Map<string, { product: Product; count: number }>();
      for (const product of productsToAdd) {
        const existing = countsById.get(product.id);
        if (existing) {
          existing.count += 1;
        } else {
          countsById.set(product.id, { product, count: 1 });
        }
      }

      addedCount = productsToAdd.length;
      firstAddedName = productsToAdd[0]?.name ?? null;

      setBasket((prevBasket) => {
        const nextBasket = [...prevBasket];
        const indexById = new Map<string, number>();
        for (let i = 0; i < nextBasket.length; i += 1) {
          indexById.set(nextBasket[i].id, i);
        }

        countsById.forEach(({ product, count }) => {
          const index = indexById.get(product.id);
          if (index === undefined) {
            indexById.set(product.id, nextBasket.length);
            nextBasket.push({ ...product, quantity: count });
            return;
          }

          const existingItem = nextBasket[index];
          nextBasket[index] = { ...existingItem, quantity: existingItem.quantity + count };
        });

        return nextBasket;
      });
    }

    if (addedCount > 0 && notFoundCount > 0) {
      setSnackbar({
        open: true,
        message: `Added ${addedCount} item${addedCount === 1 ? '' : 's'}. ${notFoundCount} barcode${notFoundCount === 1 ? '' : 's'} not found.`,
        severity: 'warning',
      });
      return;
    }

    if (addedCount > 1) {
      setSnackbar({ open: true, message: `Added ${addedCount} items to basket`, severity: 'success' });
      return;
    }

    if (addedCount === 1 && firstAddedName) {
      setSnackbar({ open: true, message: `Added ${firstAddedName} to basket`, severity: 'success' });
      return;
    }

    setSnackbar({ open: true, message: 'Product not found', severity: 'error' });
  }, [setBasket, setSnackbar]);

  const scheduleFlushPendingScans = useCallback(() => {
    if (pendingScanFlushTimerRef.current != null) return;
    pendingScanFlushTimerRef.current = window.setTimeout(() => flushPendingScans(), 100);
  }, [flushPendingScans]);

  const handleBarcodeScan = useCallback((rawBarcode: string) => {
    const normalized = rawBarcode.trim();
    if (!normalized) return;

    const found = productByBarcode.get(normalized) ?? productByBarcode.get(normalized.toLowerCase());
    if (found) {
      pendingScanProductsRef.current.push(found);
      scheduleFlushPendingScans();
      return;
    }

    pendingScanNotFoundCountRef.current += 1;
    scheduleFlushPendingScans();
  }, [productByBarcode, scheduleFlushPendingScans]);

  useEffect(() => {
    return () => {
      if (pendingScanFlushTimerRef.current != null) {
        window.clearTimeout(pendingScanFlushTimerRef.current);
        pendingScanFlushTimerRef.current = null;
      }
    };
  }, []);

  const barcodeBufferRef = useRef('');
  const barcodeStartTimeRef = useRef<number | null>(null);
  const barcodeLastKeyTimeRef = useRef<number | null>(null);
  const barcodeResetTimerRef = useRef<number | null>(null);
  const barcodeLikelyScannerRef = useRef(false);
  const barcodeStartSnapshotRef = useRef<{ searchQuery: string; customerMoney: string } | null>(null);
  const barcodeStartedInEditableRef = useRef(false);

  useEffect(() => {
    const reset = () => {
      barcodeBufferRef.current = '';
      barcodeStartTimeRef.current = null;
      barcodeLastKeyTimeRef.current = null;
      barcodeLikelyScannerRef.current = false;
      barcodeStartSnapshotRef.current = null;
      barcodeStartedInEditableRef.current = false;
      if (barcodeResetTimerRef.current != null) {
        window.clearTimeout(barcodeResetTimerRef.current);
        barcodeResetTimerRef.current = null;
      }
    };

    const scheduleReset = () => {
      if (barcodeResetTimerRef.current != null) window.clearTimeout(barcodeResetTimerRef.current);
      barcodeResetTimerRef.current = window.setTimeout(() => reset(), 300);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      const lastKeyTime = barcodeLastKeyTimeRef.current;
      const isPrintable = e.key.length === 1;

      if (e.key === 'Enter') {
        const buffered = barcodeBufferRef.current;
        const startedAt = barcodeStartTimeRef.current;
        const durationMs = startedAt == null ? Infinity : now - startedAt;

        if (
          barcodeLikelyScannerRef.current &&
          !barcodeStartedInEditableRef.current &&
          buffered.trim().length >= 3 &&
          durationMs <= 1500
        ) {
          e.preventDefault();
          e.stopPropagation();
          handleBarcodeScan(buffered);
        }
        reset();
        return;
      }

      if (!isPrintable) return;

      if (lastKeyTime == null || now - lastKeyTime > 150) {
        barcodeBufferRef.current = e.key;
        barcodeStartTimeRef.current = now;
        barcodeStartedInEditableRef.current = isEditableElement(document.activeElement);
        barcodeStartSnapshotRef.current = {
          searchQuery: searchQueryRef.current,
          customerMoney: customerMoneyRef.current,
        };
      } else {
        barcodeBufferRef.current += e.key;
        if (now - lastKeyTime <= 80) {
          const wasLikelyScanner = barcodeLikelyScannerRef.current;
          barcodeLikelyScannerRef.current = true;
          if (!wasLikelyScanner && !barcodeStartedInEditableRef.current) {
            const snapshot = barcodeStartSnapshotRef.current;
            if (snapshot) {
              if (searchQueryRef.current !== snapshot.searchQuery) setSearchQuery(snapshot.searchQuery);
              if (customerMoneyRef.current !== snapshot.customerMoney) setCustomerMoney(snapshot.customerMoney);
            }
            const active = document.activeElement as HTMLElement | null;
            if (isEditableElement(active)) {
              active.blur();
            }
          }
          if (!barcodeStartedInEditableRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }

      barcodeLastKeyTimeRef.current = now;
      scheduleReset();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      reset();
    };
  }, [handleBarcodeScan]);

  const handleUpdateQuantity = useCallback((id: string, change: number) => {
    setBasket((prevBasket) =>
      prevBasket
        .map((item) => {
          if (item.id === id) {
            const newQuantity = Math.max(1, item.quantity + change);
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleDirectQuantityChange = useCallback((id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setBasket((prevBasket) =>
      prevBasket.map((item) => {
        if (item.id === id) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, []);

  const handlePriceChange = useCallback((id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setBasket((prevBasket) =>
      prevBasket.map((item) => {
        if (item.id === id) {
          return { ...item, price: newPrice };
        }
        return item;
      })
    );
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setBasket((prevBasket) => prevBasket.filter((item) => item.id !== id));
    setSnackbar({ open: true, message: 'Removed from basket', severity: 'info' });
  }, [setSnackbar]);

  const handleCheckout = () => {
    if (basket.length === 0) return;
    if (!customerMoney || isNaN(Number(customerMoney))) {
      setSnackbar({ open: true, message: 'Please enter customer money.', severity: 'warning' });
      return;
    }
    const total = basket.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const money = Number(customerMoney);
    if (money < total) {
      setSnackbar({ open: true, message: 'Customer money is not enough.', severity: 'warning' });
      return;
    }
    setPaymentDetails({
      total,
      customerMoney: money,
      change: money - total
    });
    setShowPaymentSummary(true);
  };

  const handleConfirmPayment = async () => {
    if (!paymentDetails) return;
    
    const sale = {
      id: Date.now().toString(),
      date: new Date(),
      items: basket.map(({ name, quantity, price }) => ({ name, quantity, price })),
      total: paymentDetails.total,
      type: 'general' as 'general',
    };
    const qrData = createReceiptQrData(sale.id);
    salesContext.addSale(sale);
    
    // Create receipt with customer money and change information
    const receipt = {
      ...sale,
      customerMoney: paymentDetails.customerMoney,
      change: paymentDetails.change,
      qrData,
    };
    salesContext.addReceipt(receipt);

    // Record gross sales
    recordGrossSales(paymentDetails.total);

    // Automatically open cash drawer
    try {
      const drawerOpened = await openCashDrawer();
      if (drawerOpened) {
        console.log('Cash drawer opened successfully');
        setSnackbar({ 
          open: true, 
          message: 'Cash drawer opened successfully', 
          severity: 'success' 
        });
      } else {
        console.warn('Failed to open cash drawer - check printer connection');
        setSnackbar({ 
          open: true, 
          message: 'Cash drawer failed to open - check printer connection', 
          severity: 'warning' 
        });
      }
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error opening cash drawer - please check thermal printer', 
        severity: 'error' 
      });
    }

    // Prepare receipt data for printing
    const preparedReceiptData = {
      id: sale.id,
      date: sale.date.toISOString(),
      items: sale.items,
      total: paymentDetails.total,
      customerMoney: paymentDetails.customerMoney,
      change: paymentDetails.change,
      storeName: storeSettings.storeName,
      storeAddress: storeSettings.storeAddress,
      qrData,
    };

    // Store receipt data and show print confirmation dialog
    setReceiptData(preparedReceiptData);
    setShowPaymentSummary(false);
    setShowPrintDialog(true);
  };

  const handlePrintConfirmation = async (shouldPrint: boolean) => {
    setShowPrintDialog(false);
    
    if (shouldPrint && selectedPrinter && receiptData) {
      try {
        const printSuccess = await printReceipt(receiptData);
        if (printSuccess) {
          setSnackbar({ 
            open: true, 
            message: `Payment processed & receipt printed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 
            severity: 'success' 
          });
        } else {
          setSnackbar({ 
            open: true, 
            message: `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (Print failed)`, 
            severity: 'warning' 
          });
        }
      } catch (error) {
        console.error('Print error:', error);
        setSnackbar({ 
          open: true, 
          message: `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (Print error)`, 
          severity: 'warning' 
        });
      }
    } else {
      // No printing - just show success message
      const message = shouldPrint && !selectedPrinter 
        ? `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (No printer selected)`
        : `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      
      setSnackbar({ 
        open: true, 
        message, 
        severity: 'success' 
      });
    }
    
    // Clear basket and payment details
    setBasket([]);
    setCustomerMoney('');
    setPaymentDetails(null);
    setReceiptData(null);
  };

  const handlePrintTestReceipt = async () => {
    if (!selectedPrinter) {
      setSnackbar({ open: true, message: 'No printer selected', severity: 'error' });
      return;
    }

    try {
      const success = await testPrint();
      if (success) {
        setSnackbar({ open: true, message: 'Test receipt printed successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to print test receipt', severity: 'error' });
      }
    } catch (error) {
      console.error('Test print error:', error);
      setSnackbar({ open: true, message: 'Test print failed', severity: 'error' });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <ShoppingCartIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                Point of Sale
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Select products and manage your sales
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={handleCheckout}
              disabled={basket.length === 0}
              sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
            >
              Checkout
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrintTestReceipt}
              disabled={!selectedPrinter}
              sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
            >
              Test Print
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Printer Status */}
      <Box sx={{ mb: 3 }}>
        <Card sx={{ borderRadius: 3, boxShadow: 1, bgcolor: selectedPrinter ? 'success.50' : 'warning.50' }}>
          <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PrintIcon color={selectedPrinter ? 'success' : 'warning'} />
                <Typography variant="body2" fontWeight={600}>
                  {selectedPrinter ? `Printer: ${selectedPrinter}` : 'No thermal printer selected'}
                </Typography>
              </Box>
              <Chip
                label={selectedPrinter ? 'Ready' : 'Not Available'}
                color={selectedPrinter ? 'success' : 'warning'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={3}>
        {/* Left side - Category-based Product Selection */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: 'fit-content' }}>
            {/* Search and Filter Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  fullWidth
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 3 }
                  }}
                />
              </Stack>
            </Box>

            {/* Category Filter */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Browse by Category
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Category</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Select Category"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      startAdornment={<CategoryIcon color="action" sx={{ mr: 1 }} />}
                      sx={{ borderRadius: 3 }}
                    >
                      <MenuItem value="All">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                              <InventoryIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography>All Categories</Typography>
                          </Box>
                          <Badge badgeContent={products.length} color="primary" />
                        </Box>
                      </MenuItem>
                      {categories.map((category) => {
                        const categoryProducts = products.filter(p => p.category === category.name);
                        const itemsInBasket = basket.filter(item => item.category === category.name).length;
                        return (
                          <MenuItem key={category.id} value={category.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: getCategoryColor(category.name) }}>
                                  {React.cloneElement(getCategoryIcon(category.name), { sx: { fontSize: 14 } })}
                                </Avatar>
                                <Typography>{category.name}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Badge badgeContent={categoryProducts.length} color="secondary" />
                                {itemsInBasket > 0 && (
                                  <Badge badgeContent={itemsInBasket} color="success" />
                                )}
                              </Box>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${selectedCategory === 'All' ? 'All' : selectedCategory}`}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                    {selectedCategory !== 'All' && (
                      <Chip
                        label="Clear Filter"
                        variant="outlined"
                        clickable
                        onClick={() => setSelectedCategory('All')}
                        size="small"
                        sx={{ '&:hover': { bgcolor: 'grey.100' } }}
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Products Display */}
            <Box sx={{ p: 3 }}>
              {searchQuery.trim() ? (
                // Show search results directly when searching
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Button
                      startIcon={<ExpandLessIcon />}
                      onClick={() => setSearchQuery('')}
                      sx={{ borderRadius: 2 }}
                    >
                      Clear Search
                    </Button>
                    <Typography variant="h6" fontWeight={700}>
                      Search Results for "{searchQuery}"
                    </Typography>
                    <Chip
                      label={`${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  
                  {searchResults.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <SearchIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No products found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search terms or browse by category
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {searchResults.map((product) => {
                        const basketItem = basketById.get(product.id);
                        return (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                            <Card
                              sx={{
                                borderRadius: 3,
                                transition: 'all 0.3s',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 4,
                                },
                                border: '1px solid',
                                borderColor: basketItem ? 'success.main' : 'grey.200',
                                position: 'relative',
                              }}
                            >
                              {basketItem && (
                                <Chip
                                  label={`${basketItem.quantity} in basket`}
                                  size="small"
                                  color="success"
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    zIndex: 1,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                              <CardContent sx={{ p: 2 }}>
                                <Tooltip title={product.name} placement="top">
                                  <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap>
                                    {product.name}
                                  </Typography>
                                </Tooltip>
                                <Typography variant="h6" color="primary.main" fontWeight={700} gutterBottom>
                                  {product.price.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Stock: {product.quantity}
                                </Typography>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddToBasket(product)}
                                  sx={{ 
                                    mt: 1,
                                    borderRadius: 2,
                                    fontWeight: 600
                                  }}
                                >
                                  Add to Basket
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Box>
              ) : selectedCategory === 'All' ? (
                // Show categories when "All" is selected and no search
                <Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Product Categories
                  </Typography>
                  <Grid container spacing={2}>
                    {productsByCategory.map((category) => (
                      <Grid item xs={12} sm={6} md={4} key={category.name}>
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
                          }}
                          onClick={() => setSelectedCategory(category.name)}
                        >
                          <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <Avatar
                              sx={{
                                bgcolor: getCategoryColor(category.name),
                                width: 64,
                                height: 64,
                                mx: 'auto',
                                mb: 2,
                              }}
                            >
                              {React.cloneElement(getCategoryIcon(category.name), { sx: { fontSize: 32 } })}
                            </Avatar>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                              {category.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {category.products.length} products available
                            </Typography>
                            {category.itemsInBasket > 0 && (
                              <Chip
                                size="small"
                                label={`${category.itemsInBasket} in basket`}
                                color="success"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                // Show products when a specific category is selected
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Button
                      startIcon={<ExpandLessIcon />}
                      onClick={() => setSelectedCategory('All')}
                      sx={{ borderRadius: 2 }}
                    >
                      Back to Categories
                    </Button>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedCategory} Products
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {productsInSelectedCategory.map((product) => {
                        const basketItem = basketById.get(product.id);
                        return (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                            <Card
                              sx={{
                                borderRadius: 3,
                                transition: 'all 0.3s',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 4,
                                },
                                border: '1px solid',
                                borderColor: basketItem ? 'success.main' : 'grey.200',
                                position: 'relative',
                              }}
                            >
                              {basketItem && (
                                <Chip
                                  label={`${basketItem.quantity} in basket`}
                                  size="small"
                                  color="success"
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    zIndex: 1,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                              <CardContent sx={{ p: 2 }}>
                                <Tooltip title={product.name} placement="top">
                                  <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap>
                                    {product.name}
                                  </Typography>
                                </Tooltip>
                                <Typography variant="h6" color="primary.main" fontWeight={700} gutterBottom>
                                  {product.price.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Stock: {product.quantity}
                                </Typography>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddToBasket(product)}
                                  sx={{ 
                                    mt: 1,
                                    borderRadius: 2,
                                    fontWeight: 600
                                  }}
                                >
                                  Add to Basket
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                  </Grid>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right side - Modern Basket */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, position: 'sticky', top: 24 }}>
            {/* Basket Header */}
            <Box sx={{ 
              p: 3, 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ShoppingCartIcon sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Shopping Basket
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {basket.length} {basket.length === 1 ? 'item' : 'items'}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={800}>
                  {total.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                </Typography>
              </Box>
            </Box>

            {/* Basket Items */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {basket.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                  <ShoppingCartIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Your basket is empty
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Browse categories and add products to get started
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <BasketItemsList
                    basket={basket}
                    expandedItem={expandedItem}
                    setExpandedItem={setExpandedItem}
                    onRemoveItem={handleRemoveItem}
                    onUpdateQuantity={handleUpdateQuantity}
                    onDirectQuantityChange={handleDirectQuantityChange}
                    onPriceChange={handlePriceChange}
                  />
                </Box>
              )}
            </Box>

            {/* Checkout Section */}
            {basket.length > 0 && (
              <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  label="Customer Payment"
                  value={customerMoney}
                  onChange={e => setCustomerMoney(e.target.value.replace(/[^\d.]/g, ''))}
                  type="number"
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalOfferIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': { borderRadius: 3 }
                  }}
                />
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setBasket([]);
                      setCustomerMoney('');
                      setExpandedItem(null);
                      setSnackbar({ open: true, message: 'Basket cleared', severity: 'info' });
                    }}
                    sx={{ borderRadius: 3, py: 1.5 }}
                  >
                    Clear Basket
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleCheckout}
                    sx={{ 
                      borderRadius: 3, 
                      py: 2, 
                      fontWeight: 700,
                      fontSize: 16
                    }}
                  >
                    Process Payment
                  </Button>
                </Stack>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
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

      {/* Payment Summary Dialog */}
      <Dialog 
        open={showPaymentSummary} 
        onClose={() => setShowPaymentSummary(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 8,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }
        }}
      >
        {/* Gradient Header */}
        <Box sx={{
          p: 0,
          m: 0,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}>
          <ReceiptIcon sx={{ fontSize: 36, ml: 3, my: 2 }} />
          <Typography variant="h5" fontWeight={800} sx={{ py: 2 }}>
            Payment Summary
          </Typography>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ py: 3, px: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom color="primary.main">
              Items in Basket
            </Typography>
            <List dense sx={{ mb: 2 }}>
              {basket.map((item) => (
                <ListItem key={item.id} sx={{ py: 1, px: 0, borderRadius: 2, mb: 1, bgcolor: 'grey.50', boxShadow: 0, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={700} noWrap>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.category}
                    </Typography>
                  </Box>
                  <Chip
                    label={`x${item.quantity}`}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700, mx: 1 }}
                  />
                  <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ minWidth: 80, textAlign: 'right' }}>
                    ₱{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </Typography>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            {/* Summary Section */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              mb: 2,
              bgcolor: 'grey.100',
              borderRadius: 3,
              p: 2,
              boxShadow: 0
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Total Amount</Typography>
                <Chip label={`₱${paymentDetails?.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} color="secondary" sx={{ fontWeight: 700, fontSize: 16, px: 2 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Customer Money</Typography>
                <Chip label={`₱${paymentDetails?.customerMoney.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} color="info" sx={{ fontWeight: 700, fontSize: 16, px: 2 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">Change</Typography>
                <Chip label={`₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} color="success" sx={{ fontWeight: 700, fontSize: 16, px: 2 }} />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 3, pt: 0, gap: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button 
            variant="outlined" 
            onClick={() => setShowPaymentSummary(false)}
            sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.5 }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmPayment}
            sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.5, boxShadow: 2 }}
            color="primary"
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Confirmation Dialog */}
      <Dialog 
        open={showPrintDialog} 
        onClose={() => setShowPrintDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 8,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }
        }}
      >
        {/* Gradient Header */}
        <Box sx={{
          p: 0,
          m: 0,
          background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}>
          <PrintIcon sx={{ fontSize: 36, ml: 3, my: 2 }} />
          <Typography variant="h5" fontWeight={800} sx={{ py: 2 }}>
            Print Receipt?
          </Typography>
        </Box>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary">
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Change due: ₱{paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Would you like to print a receipt for this transaction?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 3, pt: 0, gap: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button 
            variant="outlined" 
            onClick={() => handlePrintConfirmation(false)}
            sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.5, flex: 1 }}
            color="inherit"
          >
            No, Don't Print
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handlePrintConfirmation(true)}
            sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.5, boxShadow: 2, flex: 1 }}
            color="primary"
            startIcon={<PrintIcon />}
          >
            Yes, Print Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Basket; 
