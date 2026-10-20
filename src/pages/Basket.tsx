import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardActionArea,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  DeleteOutline as DeleteIcon,
  ShoppingCartOutlined as ShoppingCartIcon,
  Inventory2 as InventoryIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  EditOutlined as EditIcon,
  CheckCircle as CheckCircleIcon,
  QrCodeScanner as ScannerIcon,
} from '@mui/icons-material';
import { SalesContext } from '../App';
import { ProductsContext, Product } from '../App';
import { StoreSettingsContext } from '../App';
import { GrossSalesContext } from '../App';
import { usePrinter } from '../contexts/PrinterContext';
import { BasketItem, useBasket } from '../contexts/BasketContext';
import PredictField, { Highlight } from '../components/PredictField';
import { categoryIcon } from '../utils/categoryIcons';

import { useNotify } from '../contexts/NotificationContext';
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

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const PREDICTION_LIMIT = 8;

const editDistance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
};

// Smallest number of typos between `token` and the start of any word, or null when it's
// too far off. Comparing against word starts lets a half-typed word with a typo match.
const typoDistance = (token: string, words: string[]) => {
  const allowed = token.length >= 6 ? 2 : token.length >= 3 ? 1 : 0;
  if (allowed === 0) return null;
  let best = Infinity;
  for (const word of words) {
    for (const length of [token.length - 1, token.length, token.length + 1]) {
      if (length > 0 && length <= word.length) best = Math.min(best, editDistance(token, word.slice(0, length)));
    }
  }
  return best <= allowed ? best : null;
};

// Match tiers for the search predictions; higher wins. Popularity only reorders within
// a tier (its bonus is capped below the smallest gap between tiers).
const matchScore = (product: Product, query: string, tokens: string[]) => {
  const name = product.name.toLowerCase();
  const barcodes = product.barcodes ?? [];
  if (barcodes.some((b) => b.toLowerCase() === query)) return 1000;
  if (name.startsWith(query)) return 800;
  const words = name.split(/[\s\-()/,.]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(query))) return 650;
  if (name.includes(query)) return 500;
  if (tokens.length > 1 && tokens.every((token) => name.includes(token))) return 450;
  if (barcodes.some((b) => b.toLowerCase().includes(query))) return 300;
  // Typo tolerance: every typed word must be within a typo or two of some word
  let typos = 0;
  for (const token of tokens) {
    const distance = typoDistance(token, words);
    if (distance === null) return -1;
    typos += distance;
  }
  return 200 - typos * 40;
};

// Totals are floating point sums, so allow half a centavo when comparing cash to the total.
const MONEY_TOLERANCE = 0.005;
const CASH_DENOMINATIONS = [20, 50, 100, 200, 500, 1000];

const productGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
  gap: 1.5,
} as const;

type ProductTileProps = {
  product: Product;
  quantityInBasket: number;
  onAdd: (product: Product) => void;
};

const ProductTile = React.memo(function ProductTile({ product, quantityInBasket, onAdd }: ProductTileProps) {
  const inBasket = quantityInBasket > 0;
  return (
    <Card
      sx={{
        borderColor: inBasket ? 'primary.main' : 'divider',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardActionArea
        onClick={() => onAdd(product)}
        sx={{ height: '100%', p: 1.75, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1.5 }}
      >
        <Typography
          fontWeight={600}
          title={product.name}
          sx={{
            lineHeight: 1.3,
            minHeight: '2.6em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, mt: 'auto' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" color="primary.main" sx={{ lineHeight: 1.2 }}>
              {formatPeso(product.price)}
            </Typography>
            <Typography variant="caption" color={product.quantity <= 0 ? 'error.main' : 'text.secondary'}>
              Stock: {product.quantity}
            </Typography>
          </Box>
          {inBasket ? (
            <Chip size="small" color="primary" label={`×${quantityInBasket}`} />
          ) : (
            <AddIcon color="action" />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
});

type CartLineProps = {
  item: BasketItem;
  isEditingPrice: boolean;
  setExpandedItem: React.Dispatch<React.SetStateAction<string | null>>;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, change: number) => void;
  onDirectQuantityChange: (id: string, newQuantity: number) => void;
  onPriceChange: (id: string, newPrice: number) => void;
};

const CartLine = React.memo(function CartLine({
  item,
  isEditingPrice,
  setExpandedItem,
  onRemoveItem,
  onUpdateQuantity,
  onDirectQuantityChange,
  onPriceChange,
}: CartLineProps) {
  // Drafts let the cashier clear a field while typing without it snapping back.
  const [quantityDraft, setQuantityDraft] = useState(String(item.quantity));
  const [priceDraft, setPriceDraft] = useState(String(item.price));

  useEffect(() => setQuantityDraft(String(item.quantity)), [item.quantity]);
  useEffect(() => setPriceDraft(String(item.price)), [item.price]);

  return (
    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={600} noWrap title={item.name}>
            {item.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPeso(item.price)} each
          </Typography>
        </Box>
        <Typography fontWeight={700}>{formatPeso(item.price * item.quantity)}</Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: '10px',
          }}
        >
          <IconButton
            size="small"
            aria-label={`Decrease ${item.name}`}
            onClick={() => onUpdateQuantity(item.id, -1)}
            disabled={item.quantity <= 1}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Box
            component="input"
            type="number"
            min={1}
            aria-label={`Quantity of ${item.name}`}
            value={quantityDraft}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setQuantityDraft(e.target.value);
              const next = parseInt(e.target.value, 10);
              if (next >= 1) onDirectQuantityChange(item.id, next);
            }}
            onBlur={() => setQuantityDraft(String(item.quantity))}
            sx={{
              width: 44,
              border: 0,
              outline: 0,
              bgcolor: 'transparent',
              color: 'text.primary',
              font: 'inherit',
              fontWeight: 700,
              textAlign: 'center',
              MozAppearance: 'textfield',
              '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 },
            }}
          />
          <IconButton size="small" aria-label={`Increase ${item.name}`} onClick={() => onUpdateQuantity(item.id, 1)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box>
          <Tooltip title={isEditingPrice ? 'Close price editor' : 'Edit price'}>
            <IconButton
              size="small"
              aria-label={`Edit price of ${item.name}`}
              color={isEditingPrice ? 'primary' : 'default'}
              onClick={() => setExpandedItem((current) => (current === item.id ? null : item.id))}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton size="small" aria-label={`Remove ${item.name}`} onClick={() => onRemoveItem(item.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Collapse in={isEditingPrice} unmountOnExit>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.5 }}>
          <TextField
            label="Unit price"
            size="small"
            type="number"
            fullWidth
            value={priceDraft}
            onChange={(e) => {
              setPriceDraft(e.target.value);
              const next = parseFloat(e.target.value);
              if (!isNaN(next) && next >= 0) onPriceChange(item.id, next);
            }}
            onBlur={() => setPriceDraft(String(item.price))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setExpandedItem(null);
            }}
            InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Button variant="outlined" onClick={() => setExpandedItem(null)}>
            Done
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
});

const Basket: React.FC = () => {
  const { products, categories } = useContext(ProductsContext);
  const storeSettings = useContext(StoreSettingsContext);
  const { recordGrossSales } = useContext(GrossSalesContext);
  const { selectedPrinter, printReceipt, testPrint, openCashDrawer } = usePrinter();
  const { basket, setBasket } = useBasket();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const notify = useNotify();;
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

  // Basket line whose price editor is open
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
  }, [setBasket]);

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

  const getCategoryIcon = (categoryName: string) => categoryIcon(categoryName, categories);

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
  const itemCount = useMemo(() => basket.reduce((sum, item) => sum + item.quantity, 0), [basket]);
  const quickCashAmounts = useMemo(
    () => CASH_DENOMINATIONS.filter((amount) => amount > total + MONEY_TOLERANCE).slice(0, 4),
    [total]
  );
  const parsedCustomerMoney = customerMoney.trim() === '' ? Number.NaN : Number(customerMoney);
  const hasValidCustomerMoney = Number.isFinite(parsedCustomerMoney) && parsedCustomerMoney >= 0;
  const isCustomerMoneyEnough = hasValidCustomerMoney && parsedCustomerMoney >= total - MONEY_TOLERANCE;
  const currentChange = isCustomerMoneyEnough ? Math.max(0, parsedCustomerMoney - total) : 0;

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
        notify('Increased quantity in basket', 'info');
        return prevBasket.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      notify('Added to basket', 'success');
      return [...prevBasket, { ...product, quantity: 1 }];
    });
  }, [setBasket, notify]);

  // Units sold per product name across all receipts, so predictions favour what sells
  const unitsSold = useMemo(() => {
    const map = new Map<string, number>();
    for (const receipt of salesContext.receipts) {
      for (const item of receipt.items) map.set(item.name, (map.get(item.name) ?? 0) + item.quantity);
    }
    return map;
  }, [salesContext.receipts]);

  const getPredictions = useCallback(
    (query: string): Product[] => {
      const q = query.trim().toLowerCase();
      if (!q) {
        return products
          .filter((product) => (unitsSold.get(product.name) ?? 0) > 0)
          .sort((a, b) => (unitsSold.get(b.name) ?? 0) - (unitsSold.get(a.name) ?? 0))
          .slice(0, PREDICTION_LIMIT);
      }
      const tokens = q.split(/\s+/).filter(Boolean);
      const scored: Array<{ product: Product; score: number }> = [];
      for (const product of products) {
        const base = matchScore(product, q, tokens);
        if (base < 0) continue;
        const popularity = Math.min(40, Math.log2(1 + (unitsSold.get(product.name) ?? 0)) * 8);
        scored.push({ product, score: base + popularity + (product.quantity > 0 ? 5 : 0) });
      }
      scored.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
      return scored.slice(0, PREDICTION_LIMIT).map((entry) => entry.product);
    },
    [products, unitsSold]
  );

  const renderPrediction = (product: Product, query: string) => {
    const sold = unitsSold.get(product.name) ?? 0;
    const inBasket = basketById.get(product.id)?.quantity ?? 0;
    const q = query.trim().toLowerCase();
    const barcodeHit = q !== '' && (product.barcodes ?? []).some((b) => b.toLowerCase() === q);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: '9px',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
          }}
        >
          {React.cloneElement(getCategoryIcon(product.category), { fontSize: 'small' })}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={600} noWrap>
            <Highlight text={product.name} query={query} />
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="p">
            {product.category}
            {barcodeHit && ' · Barcode match'}
            {sold > 0 && ` · Sold ${sold.toLocaleString()}×`}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography fontWeight={700}>{formatPeso(product.price)}</Typography>
          <Typography variant="caption" color={inBasket ? 'primary.main' : product.quantity <= 0 ? 'error.main' : 'text.secondary'} fontWeight={inBasket ? 700 : 400}>
            {inBasket ? `×${inBasket} in basket` : `Stock: ${product.quantity}`}
          </Typography>
        </Box>
      </Box>
    );
  };

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
      notify(
        `Added ${addedCount} item${addedCount === 1 ? '' : 's'}. ${notFoundCount} barcode${notFoundCount === 1 ? '' : 's'} not found.`,
        'warning'
      );
      return;
    }

    if (addedCount > 1) {
      notify(`Added ${addedCount} items to basket`, 'success');
      return;
    }

    if (addedCount === 1 && firstAddedName) {
      notify(`Added ${firstAddedName} to basket`, 'success');
      return;
    }

    notify('Product not found', 'error');
  }, [setBasket, notify]);

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
  }, [setBasket]);

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
  }, [setBasket]);

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
  }, [setBasket]);

  const handleRemoveItem = useCallback((id: string) => {
    setBasket((prevBasket) => prevBasket.filter((item) => item.id !== id));
    notify('Removed from basket', 'info');
  }, [setBasket, notify]);

  const handleCheckout = () => {
    if (basket.length === 0) return;
    setPaymentDetails(null);
    setShowPaymentSummary(true);
  };

  const handleConfirmPayment = async () => {
    if (!hasValidCustomerMoney) {
      notify('Please enter customer money.', 'warning');
      return;
    }
    if (!isCustomerMoneyEnough) {
      notify('Customer money must be exact or more.', 'warning');
      return;
    }

    const currentPaymentDetails = {
      total,
      customerMoney: parsedCustomerMoney,
      change: currentChange,
    };
    setPaymentDetails(currentPaymentDetails);
    
    const sale = {
      id: Date.now().toString(),
      date: new Date(),
      items: basket.map(({ name, quantity, price }) => ({ name, quantity, price })),
      total: currentPaymentDetails.total,
      type: 'general' as 'general',
    };
    const qrData = createReceiptQrData(sale.id);
    salesContext.addSale(sale);
    
    // Create receipt with customer money and change information
    const receipt = {
      ...sale,
      customerMoney: currentPaymentDetails.customerMoney,
      change: currentPaymentDetails.change,
      qrData,
    };
    salesContext.addReceipt(receipt);

    // Record gross sales
    recordGrossSales(currentPaymentDetails.total);

    // Automatically open cash drawer
    try {
      const drawerOpened = await openCashDrawer();
      if (drawerOpened) {
        console.log('Cash drawer opened successfully');
        notify('Cash drawer opened successfully', 'success');
      } else {
        console.warn('Failed to open cash drawer - check printer connection');
        notify('Cash drawer failed to open - check printer connection', 'warning');
      }
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      notify('Error opening cash drawer - please check thermal printer', 'error');
    }

    // Prepare receipt data for printing
    const preparedReceiptData = {
      id: sale.id,
      date: sale.date.toISOString(),
      items: sale.items,
      total: currentPaymentDetails.total,
      customerMoney: currentPaymentDetails.customerMoney,
      change: currentPaymentDetails.change,
      storeName: storeSettings.storeName,
      storeAddress: storeSettings.storeAddress,
      birNumber: storeSettings.birNumber,
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
          notify(
            `Payment processed & receipt printed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            'success'
          );
        } else {
          notify(
            `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (Print failed)`,
            'warning'
          );
        }
      } catch (error) {
        console.error('Print error:', error);
        notify(
          `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (Print error)`,
          'warning'
        );
      }
    } else {
      // No printing - just show success message
      const message = shouldPrint && !selectedPrinter 
        ? `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (No printer selected)`
        : `Payment processed! Change due: ₱${paymentDetails?.change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      
      notify(message, 'success');
    }
    
    // Clear basket and payment details
    setBasket([]);
    setCustomerMoney('');
    setPaymentDetails(null);
    setReceiptData(null);
  };

  const handlePrintTestReceipt = async () => {
    if (!selectedPrinter) {
      notify('No printer selected', 'error');
      return;
    }

    try {
      const success = await testPrint();
      if (success) {
        notify('Test receipt printed successfully!', 'success');
      } else {
        notify('Failed to print test receipt', 'error');
      }
    } catch (error) {
      console.error('Test print error:', error);
      notify('Test print failed', 'error');
    }
  };

  const clearBasket = () => {
    setBasket([]);
    setCustomerMoney('');
    setExpandedItem(null);
    setPaymentDetails(null);
    setShowPaymentSummary(false);
    setShowPrintDialog(false);
    notify('Basket cleared', 'info');
  };

  const renderProductGrid = (list: Product[]) => (
    <Box sx={productGridSx}>
      {list.map((product) => (
        <ProductTile
          key={product.id}
          product={product}
          quantityInBasket={basketById.get(product.id)?.quantity ?? 0}
          onAdd={handleAddToBasket}
        />
      ))}
    </Box>
  );

  const categoryChip = (name: string, label: string, icon: React.ReactElement, basketCount: number) => {
    const selected = !searchQuery.trim() && selectedCategory === name;
    return (
      <Chip
        key={name}
        icon={React.cloneElement(icon, { sx: { fontSize: 18 } })}
        label={basketCount > 0 ? `${label} · ${basketCount}` : label}
        color={selected ? 'primary' : 'default'}
        variant={selected ? 'filled' : 'outlined'}
        onClick={() => {
          setSearchQuery('');
          setSelectedCategory(name);
        }}
        sx={{ flexShrink: 0, height: 36, px: 0.5, bgcolor: selected ? undefined : 'background.paper' }}
      />
    );
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 400px' },
        gap: 2.5,
        alignItems: 'start',
      }}
    >
      {/* Product picker */}
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h5">New sale</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ScannerIcon sx={{ fontSize: 18 }} />
              Scan a barcode anytime, or tap a product to add it.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintTestReceipt}
            disabled={!selectedPrinter}
            sx={{ flexShrink: 0 }}
          >
            Test print
          </Button>
        </Box>

        <PredictField<Product>
          value={searchQuery}
          onChange={setSearchQuery}
          getOptions={getPredictions}
          getKey={(product) => product.id}
          renderOption={renderPrediction}
          onPick={(product) => {
            handleAddToBasket(product);
            setSearchQuery('');
          }}
          heading={(query) => (query.trim() ? 'Best matches' : 'Frequently sold')}
          openWhenEmpty
          pickLabel="add to basket"
          textFieldProps={{
            fullWidth: true,
            placeholder: 'Search by product name or barcode',
            onKeyDown: (e) => {
              if (e.key === 'Escape') setSearchQuery('');
            },
            InputProps: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            py: 1.5,
            mb: 0.5,
          }}
        >
          {categoryChip('All', 'All categories', <InventoryIcon />, 0)}
          {categories.map((category) =>
            categoryChip(
              category.name,
              category.name,
              getCategoryIcon(category.name),
              basketCountByCategory.get(category.name) ?? 0
            )
          )}
        </Box>

        {searchQuery.trim() ? (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for “{searchQuery.trim()}”
            </Typography>
            {searchResults.length === 0 ? (
              <Card sx={{ textAlign: 'center', py: 6, px: 3 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography fontWeight={600}>No products match your search</Typography>
                <Typography variant="body2" color="text.secondary">
                  Check the spelling, or pick a category above.
                </Typography>
              </Card>
            ) : (
              renderProductGrid(searchResults)
            )}
          </Box>
        ) : selectedCategory === 'All' ? (
          productsByCategory.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography fontWeight={600}>No products yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Add products under Manage › Products to start selling.
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1.5 }}>
              {productsByCategory.map((category) => (
                <Card key={category.name}>
                  <CardActionArea
                    onClick={() => setSelectedCategory(category.name)}
                    sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }}
                  >
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main',
                          bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
                        }}
                      >
                        {getCategoryIcon(category.name)}
                      </Box>
                      {category.itemsInBasket > 0 && (
                        <Chip size="small" color="primary" label={`${category.itemsInBasket} in basket`} />
                      )}
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>{category.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {category.products.length} product{category.products.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <IconButton aria-label="Back to categories" onClick={() => setSelectedCategory('All')} size="small">
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6">{selectedCategory}</Typography>
              <Typography variant="body2" color="text.secondary">
                {productsInSelectedCategory.length} product{productsInSelectedCategory.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            {renderProductGrid(productsInSelectedCategory)}
          </Box>
        )}
      </Box>

      {/* Current sale */}
      <Card
        sx={{
          position: { lg: 'sticky' },
          top: { lg: 84 },
          display: 'flex',
          flexDirection: 'column',
          maxHeight: { lg: 'calc(100vh - 104px)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Current sale</Typography>
            {itemCount > 0 && <Chip size="small" label={`${itemCount} item${itemCount !== 1 ? 's' : ''}`} />}
          </Box>
          {basket.length > 0 && (
            <Button color="error" size="small" onClick={clearBasket}>
              Clear
            </Button>
          )}
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {basket.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 7, px: 3 }}>
              <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography fontWeight={600}>Basket is empty</Typography>
              <Typography variant="body2" color="text.secondary">
                Scanned and tapped items appear here.
              </Typography>
            </Box>
          ) : (
            basket.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                isEditingPrice={expandedItem === item.id}
                setExpandedItem={setExpandedItem}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
                onDirectQuantityChange={handleDirectQuantityChange}
                onPriceChange={handlePriceChange}
              />
            ))
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography color="text.secondary" fontWeight={600}>
              Total
            </Typography>
            <Typography variant="h4" component="p">
              {formatPeso(total)}
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleCheckout}
            disabled={basket.length === 0}
            sx={{ py: 1.5, fontSize: '1.0625rem' }}
          >
            Take payment
          </Button>
        </Box>
      </Card>


      {/* Payment Dialog */}
      <Dialog open={showPaymentSummary} onClose={() => setShowPaymentSummary(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
          Take payment
          <IconButton aria-label="Close" onClick={() => setShowPaymentSummary(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              textAlign: 'center',
              borderRadius: '12px',
              py: 2,
              mb: 2.5,
              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.08),
            }}
          >
            <Typography variant="overline" color="text.secondary">
              Amount due
            </Typography>
            <Typography variant="h3" component="p" color="primary.main" sx={{ lineHeight: 1.1 }}>
              {formatPeso(total)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <TextField
            fullWidth
            autoFocus
            label="Cash received"
            value={customerMoney}
            onChange={(e) => setCustomerMoney(e.target.value.replace(/[^\d.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isCustomerMoneyEnough) {
                void handleConfirmPayment();
              }
            }}
            type="number"
            placeholder="0.00"
            error={customerMoney.trim() !== '' && !isCustomerMoneyEnough}
            InputProps={{
              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
              sx: { fontSize: '1.375rem', fontWeight: 700 },
            }}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            <Chip
              label="Exact"
              variant="outlined"
              onClick={() => setCustomerMoney((Math.round(total * 100) / 100).toString())}
            />
            {quickCashAmounts.map((amount) => (
              <Chip
                key={amount}
                label={formatPeso(amount).replace('.00', '')}
                variant="outlined"
                onClick={() => setCustomerMoney(amount.toString())}
              />
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              mt: 2.5,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Typography fontWeight={600} color="text.secondary">
              {hasValidCustomerMoney && !isCustomerMoneyEnough ? 'Short by' : 'Change'}
            </Typography>
            <Typography
              variant="h4"
              component="p"
              color={hasValidCustomerMoney && !isCustomerMoneyEnough ? 'error.main' : 'success.main'}
            >
              {formatPeso(hasValidCustomerMoney && !isCustomerMoneyEnough ? total - parsedCustomerMoney : currentChange)}
            </Typography>
          </Box>

          <Box sx={{ mt: 2, maxHeight: 180, overflowY: 'auto', borderRadius: '10px', border: 1, borderColor: 'divider' }}>
            {basket.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
                }}
              >
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ×{item.quantity}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 84, textAlign: 'right' }}>
                  {formatPeso(item.price * item.quantity)}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setShowPaymentSummary(false)}>
            Cancel
          </Button>
          <Button variant="contained" size="large" onClick={handleConfirmPayment} disabled={!isCustomerMoneyEnough}>
            Confirm payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Confirmation Dialog. The sale is already recorded here, so any way of
          closing it must finish the sale and clear the basket. */}
      <Dialog open={showPrintDialog} onClose={() => handlePrintConfirmation(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6">Payment complete</Typography>
          <Typography variant="overline" color="text.secondary" component="p" sx={{ mt: 2 }}>
            Change due
          </Typography>
          <Typography variant="h3" component="p" color="success.main" sx={{ lineHeight: 1.1 }}>
            {formatPeso(paymentDetails?.change ?? 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Print a receipt for this sale?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={() => handlePrintConfirmation(false)} sx={{ flex: 1 }}>
            Skip
          </Button>
          <Button
            variant="contained"
            onClick={() => handlePrintConfirmation(true)}
            startIcon={<PrintIcon />}
            sx={{ flex: 1 }}
          >
            Print receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Basket;
