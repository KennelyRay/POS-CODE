import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Close as CloseIcon,
  ContentCopyOutlined as DuplicateIcon,
  DeleteOutline as DeleteIcon,
  DeleteForeverOutlined as DeleteAllIcon,
  DriveFileMoveOutlined as MoveIcon,
  EditOutlined as EditIcon,
  FileDownloadOutlined as ExportIcon,
  FileUploadOutlined as ImportIcon,
  Inventory2Outlined as ProductsIcon,
  KeyboardArrowDown as ArrowDownIcon,
  PaymentsOutlined as ValueIcon,
  Print as PrintIcon,
  QrCodeScanner as ScanIcon,
  RemoveShoppingCartOutlined as OutIcon,
  Search as SearchIcon,
  WarningAmberRounded as LowIcon,
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { Product, ProductsContext, StoreSettingsContext } from '../App';
import { useNotify } from '../contexts/NotificationContext';
import { buildPriceListPages, PriceListCategoryGroup, PriceListPrintContent } from '../components/PriceList';
import { categoryIcon } from '../utils/categoryIcons';
import { getLowStockThreshold } from '../utils/preferences';
import { stockState, tracksStock } from '../utils/stock';

const PAGE_SIZE = 80;
const UNCATEGORIZED = '__uncategorized__';

type StockFilter = 'all' | 'low' | 'out' | 'nobarcode';
type SortKey = 'name' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'recent';
type Draft = { id: string; name: string; category: string; price: string; quantity: string; trackStock: boolean; barcodes: string[] };

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const productsInStorage = (): Product[] => JSON.parse(localStorage.getItem('pos_products') || '[]');

// RFC 4180-style parsing: quoted fields may hold commas, line breaks and doubled quotes
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};


// ---------- list row ----------

const RowRoot = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: theme.spacing(1.5),
  padding: theme.spacing(0.75, 1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  '&:hover': { backgroundColor: theme.palette.action.hover },
  '&[data-selected="true"]': { backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07) },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
  '& .row-check': { justifySelf: 'center', width: 18, height: 18, margin: 0, cursor: 'pointer', accentColor: theme.palette.primary.main },
  '& .row-icon': {
    display: 'none',
    width: 34,
    height: 34,
    borderRadius: 9,
    placeItems: 'center',
    color: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
    '& svg': { fontSize: 18 },
  },
  '& .row-main': { minWidth: 0 },
  '& .row-name, & .row-meta': { margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  '& .row-name': { ...theme.typography.body2, fontWeight: 600 },
  '& .row-meta': { ...theme.typography.caption, color: theme.palette.text.secondary },
  '& .row-category, & .row-stock, & .row-actions': { display: 'none' },
  '& .row-category': { ...theme.typography.body2, color: theme.palette.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  '& .row-price': {
    ...theme.typography.body2,
    fontWeight: 700,
    textAlign: 'right',
    border: 0,
    background: 'transparent',
    color: theme.palette.text.primary,
    font: 'inherit',
    padding: '4px 6px',
    borderRadius: 6,
    cursor: 'text',
    '&:hover': { backgroundColor: theme.palette.action.selected },
  },
  '& .row-price-input': {
    width: 96,
    font: 'inherit',
    fontWeight: 700,
    textAlign: 'right',
    padding: '4px 6px',
    borderRadius: 6,
    border: `1px solid ${theme.palette.primary.main}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    outline: 'none',
  },
  '& .row-stock': { alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  '& .row-qty': { minWidth: 44, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  '& .row-qty[data-state="low"]': { color: theme.palette.warning.main },
  '& .row-qty[data-state="out"]': { color: theme.palette.error.main },
  '& .row-actions': { justifyContent: 'flex-end' },
  '& .row-unlimited': {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: 0,
    borderRadius: 8,
    padding: '4px 8px',
    marginRight: 30,
    background: 'transparent',
    color: theme.palette.text.secondary,
    font: 'inherit',
    cursor: 'pointer',
    '& span:first-of-type': { fontSize: '1.25rem', lineHeight: 1, fontWeight: 700 },
    '&:hover': { backgroundColor: theme.palette.action.hover, color: theme.palette.text.primary },
  },
  '& .row-unlimited-label': { ...theme.typography.caption, fontWeight: 600 },
  '& .icon-btn': {
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    padding: 0,
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: theme.palette.action.active,
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.palette.action.hover },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}` },
    '& svg': { fontSize: 18 },
  },
  '& .icon-btn.stepper': { border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 },
  '& .icon-btn.danger:hover': { color: theme.palette.error.main },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: '40px 34px minmax(0, 1fr) 150px 112px 132px 100px',
    '& .row-icon': { display: 'grid' },
    '& .row-category': { display: 'block' },
    '& .row-stock, & .row-actions': { display: 'flex' },
    '& .row-meta-category': { display: 'none' },
  },
}));

type RowProps = {
  product: Product;
  lowStock: number;
  icon: React.ReactElement;
  selected: boolean;
  editingPrice: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onOpen: (product: Product) => void;
  onStartPrice: (id: string | null) => void;
  onSavePrice: (product: Product, value: string) => void;
  onStep: (product: Product, by: number) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (product: Product) => void;
};

const ProductRow = React.memo(function ProductRow({
  product,
  lowStock,
  icon,
  selected,
  editingPrice,
  onToggle,
  onOpen,
  onStartPrice,
  onSavePrice,
  onStep,
  onDuplicate,
  onDelete,
}: RowProps) {
  const state = stockState(product, lowStock);
  const barcodes = product.barcodes.filter(Boolean);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  // Blur is the one place a price is saved; Escape marks the edit as cancelled first
  const cancelPrice = useRef(false);
  return (
    <RowRoot
      role="button"
      tabIndex={0}
      data-selected={selected}
      onClick={() => onOpen(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(product);
      }}
    >
      <input
        type="checkbox"
        className="row-check"
        checked={selected}
        onClick={stop}
        onChange={(e) => onToggle(product.id, e.target.checked)}
        aria-label={`Select ${product.name}`}
      />
      <span className="row-icon" aria-hidden>
        {icon}
      </span>
      <div className="row-main">
        <p className="row-name" title={product.name}>
          {product.name || 'Unnamed product'}
        </p>
        <p className="row-meta">
          <span className="row-meta-category">{product.category || 'Uncategorized'} · {state === 'untracked' ? 'Unlimited stock' : `Stock ${product.quantity}`} · </span>
          {barcodes.length ? barcodes.join(', ') : 'No barcode'}
        </p>
      </div>
      <span className="row-category" title={product.category}>
        {product.category || 'Uncategorized'}
      </span>
      <span onClick={stop} style={{ textAlign: 'right' }}>
        {editingPrice ? (
          <input
            className="row-price-input"
            type="number"
            min={0}
            step={0.01}
            autoFocus
            defaultValue={product.price}
            aria-label={`Price of ${product.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                cancelPrice.current = true;
                onStartPrice(null);
              }
            }}
            onBlur={(e) => {
              if (cancelPrice.current) {
                cancelPrice.current = false;
                return;
              }
              onSavePrice(product, e.target.value);
            }}
          />
        ) : (
          <button type="button" className="row-price" title="Click to change the price" onClick={() => onStartPrice(product.id)}>
            {formatPeso(product.price)}
          </button>
        )}
      </span>
      <span className="row-stock" onClick={stop}>
        {state === 'untracked' ? (
          // Unlimited stock: no counter to step; opening the product lets you start tracking
          <button type="button" className="row-unlimited" title="Unlimited stock. Click to track stock for this product." onClick={() => onOpen(product)}>
            <span aria-hidden>∞</span>
            <span className="row-unlimited-label">Unlimited</span>
          </button>
        ) : (
          <>
            <button type="button" className="icon-btn stepper" aria-label={`One less ${product.name}`} onClick={() => onStep(product, -1)}>
              −
            </button>
            <span className="row-qty" data-state={state} title={state === 'out' ? 'Out of stock' : state === 'low' ? 'Low stock' : undefined}>
              {product.quantity}
              {state !== 'ok' && <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, lineHeight: 1 }}>{state === 'out' ? 'OUT' : 'LOW'}</span>}
            </span>
            <button type="button" className="icon-btn stepper" aria-label={`One more ${product.name}`} onClick={() => onStep(product, 1)}>
              +
            </button>
          </>
        )}
      </span>
      <span className="row-actions" onClick={stop}>
        <button type="button" className="icon-btn" title="Duplicate" aria-label={`Duplicate ${product.name}`} onClick={() => onDuplicate(product)}>
          <DuplicateIcon />
        </button>
        <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${product.name}`} onClick={() => onOpen(product)}>
          <EditIcon />
        </button>
        <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)}>
          <DeleteIcon />
        </button>
      </span>
    </RowRoot>
  );
});

const StatTile: React.FC<{ icon: React.ReactElement; label: string; value: string; caption: string; active?: boolean; onClick?: () => void; tone?: 'warning' | 'error' }> = ({
  icon,
  label,
  value,
  caption,
  active,
  onClick,
  tone,
}) => (
  <Card
    component={onClick ? 'button' : 'div'}
    onClick={onClick}
    aria-pressed={onClick ? Boolean(active) : undefined}
    sx={{
      p: 2,
      display: 'flex',
      gap: 1.5,
      alignItems: 'flex-start',
      minWidth: 0,
      textAlign: 'left',
      font: 'inherit',
      color: 'inherit',
      cursor: onClick ? 'pointer' : 'default',
      borderColor: active ? 'primary.main' : 'divider',
      boxShadow: active ? (t) => `0 0 0 1px ${t.palette.primary.main}` : undefined,
      '&:hover': onClick ? { borderColor: 'primary.main' } : undefined,
      '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' },
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '10px',
        display: { xs: 'none', sm: 'grid' },
        placeItems: 'center',
        color: tone ? `${tone}.main` : 'primary.main',
        bgcolor: (t) => alpha(tone ? t.palette[tone].main : t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" sx={{ lineHeight: 1.3, fontSize: { xs: '1.125rem', sm: '1.375rem' }, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.4 }}>
        {caption}
      </Typography>
    </Box>
  </Card>
);

// ---------- page ----------

const ManageProducts: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, exportProducts, importProducts } = useContext(ProductsContext);
  const storeSettings = useContext(StoreSettingsContext);
  const notify = useNotify();
  // Set in Settings › Inventory
  const [lowStock] = useState(getLowStockThreshold);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [priceEditing, setPriceEditing] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const nameRef = useRef<HTMLInputElement | null>(null);
  const stockRef = useRef<HTMLInputElement | null>(null);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ fileName: string; rows: Product[]; skipped: number } | null>(null);
  const [priceListOpen, setPriceListOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const priceListPrintRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // ---------- derived ----------

  const iconFor = useCallback((name: string) => categoryIcon(name, categories), [categories]);

  // Every category a product uses shows up, even ones no longer in Settings, plus Uncategorized
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key = p.category || UNCATEGORIZED;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const names = new Set<string>(categories.map((c) => c.name));
    counts.forEach((_, key) => key !== UNCATEGORIZED && names.add(key));
    const list = Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ key: name, label: name, count: counts.get(name) ?? 0 }));
    if (counts.has(UNCATEGORIZED)) list.push({ key: UNCATEGORIZED, label: 'Uncategorized', count: counts.get(UNCATEGORIZED)! });
    return list;
  }, [categories, products]);

  const stats = useMemo(() => {
    let value = 0;
    let low = 0;
    let out = 0;
    let noBarcode = 0;
    let tracked = 0;
    for (const p of products) {
      const state = stockState(p, lowStock);
      if (state !== 'untracked') {
        tracked += 1;
        value += p.price * Math.max(0, p.quantity);
      }
      if (state === 'low') low += 1;
      if (state === 'out') out += 1;
      if (!p.barcodes.some((b) => b.trim())) noBarcode += 1;
    }
    return { value, low, out, noBarcode, tracked };
  }, [lowStock, products]);

  const deferredSearch = useDeferredValue(search);
  const query = deferredSearch.trim().toLowerCase();

  const visibleProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (categoryFilter !== 'all' && (p.category || UNCATEGORIZED) !== categoryFilter) return false;
      const state = stockState(p, lowStock);
      if (stockFilter === 'low' && state !== 'low') return false;
      if (stockFilter === 'out' && state !== 'out') return false;
      if (stockFilter === 'nobarcode' && p.barcodes.some((b) => b.trim())) return false;
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || p.barcodes.some((b) => b.toLowerCase().includes(query));
    });
    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);
    const byStockThen = (a: Product, b: Product, direction: 1 | -1) => {
      const untracked = Number(!tracksStock(a)) - Number(!tracksStock(b));
      if (untracked || !tracksStock(a)) return untracked;
      return direction * (a.quantity - b.quantity);
    };
    const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
      name: byName,
      'price-asc': (a, b) => a.price - b.price || byName(a, b),
      'price-desc': (a, b) => b.price - a.price || byName(a, b),
      // Unlimited-stock products sort after every tracked one, whichever way, by name among themselves
      'stock-asc': (a, b) => byStockThen(a, b, 1) || byName(a, b),
      'stock-desc': (a, b) => byStockThen(a, b, -1) || byName(a, b),
      recent: (a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }),
    };
    return list.sort(sorters[sort]);
  }, [categoryFilter, lowStock, products, query, sort, stockFilter]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [categoryFilter, query, sort, stockFilter]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < visibleProducts.length;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisibleCount((n) => n + PAGE_SIZE), {
      rootMargin: '600px 0px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  // Drop selections for products that no longer exist
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(products.map((p) => p.id));
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  const selectedInView = visibleProducts.reduce((n, p) => n + (selected.has(p.id) ? 1 : 0), 0);
  const allInViewSelected = visibleProducts.length > 0 && selectedInView === visibleProducts.length;

  // ---------- editor ----------

  const openEditor = useCallback((product?: Product, presetBarcode?: string) => {
    setDraft(
      product
        ? {
            id: product.id,
            name: product.name,
            category: product.category,
            price: String(product.price),
            quantity: String(product.quantity),
            trackStock: tracksStock(product),
            barcodes: product.barcodes.filter(Boolean),
          }
        : { id: '', name: '', category: '', price: '', quantity: '', trackStock: false, barcodes: presetBarcode ? [presetBarcode] : [] }
    );
    setBarcodeInput('');
    setBarcodeError('');
    setNameError('');
    setPriceError('');
  }, []);

  const barcodeOwner = (code: string, exceptId: string) => products.find((p) => p.id !== exceptId && p.barcodes.some((b) => b.trim() === code));

  const addBarcodeChip = () => {
    if (!draft) return;
    const code = barcodeInput.trim();
    if (!code) return;
    if (draft.barcodes.includes(code)) {
      setBarcodeError('Already added');
      return;
    }
    const owner = barcodeOwner(code, draft.id);
    if (owner) {
      setBarcodeError(`Already used by “${owner.name}”`);
      return;
    }
    setDraft({ ...draft, barcodes: [...draft.barcodes, code] });
    setBarcodeInput('');
    setBarcodeError('');
  };

  const duplicateName = draft
    ? products.find((p) => p.id !== draft.id && draft.name.trim() !== '' && p.name.trim().toLowerCase() === draft.name.trim().toLowerCase())
    : undefined;

  const saveDraft = (keepOpen: boolean) => {
    if (!draft) return;
    const name = draft.name.trim();
    const price = draft.price.trim() === '' ? 0 : Number(draft.price);
    const quantity = draft.quantity.trim() === '' ? 0 : Math.round(Number(draft.quantity));
    let invalid = false;
    if (!name) {
      setNameError('Give the product a name');
      invalid = true;
    }
    if (!Number.isFinite(price) || price < 0) {
      setPriceError('Enter a price of zero or more');
      invalid = true;
    }
    // A barcode still sitting in the input counts too
    const pending = barcodeInput.trim();
    const barcodes = pending && !draft.barcodes.includes(pending) ? [...draft.barcodes, pending] : draft.barcodes;
    const taken = barcodes.map((b) => ({ b, owner: barcodeOwner(b, draft.id) })).find((x) => x.owner);
    if (taken) {
      setBarcodeError(`${taken.b} is already used by “${taken.owner!.name}”`);
      invalid = true;
    }
    if (invalid) return;

    // A new category typed here is added to the list
    const typed = draft.category.trim();
    const existing = categories.find((c) => c.name.toLowerCase() === typed.toLowerCase());
    const category = existing ? existing.name : typed;
    if (typed && !existing) addCategory({ id: newId(), name: typed });

    // With tracking off the last counted quantity is kept, so switching it back on resumes from there
    const previous = products.find((p) => p.id === draft.id);
    const product: Product = {
      id: draft.id || newId(),
      name,
      category,
      price,
      quantity: draft.trackStock ? (Number.isFinite(quantity) ? quantity : 0) : previous?.quantity ?? 0,
      trackStock: draft.trackStock,
      barcodes,
    };
    if (draft.id) {
      updateProduct(product);
      notify(`Saved ${name}`, 'success');
    } else {
      addProduct(product);
      notify(`Added ${name}`, 'success');
    }
    if (keepOpen) {
      // Next product starts in the same category, the usual way stock gets entered
      setDraft({ id: '', name: '', category, price: '', quantity: '', trackStock: draft.trackStock, barcodes: [] });
      setBarcodeInput('');
      setBarcodeError('');
      setNameError('');
      setPriceError('');
      window.setTimeout(() => nameRef.current?.focus(), 0);
    } else {
      setDraft(null);
    }
  };

  // ---------- row actions ----------

  const toggleSelected = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const savePrice = useCallback(
    (product: Product, value: string) => {
      setPriceEditing(null);
      const price = Number(value);
      if (value.trim() === '' || !Number.isFinite(price) || price < 0 || price === product.price) return;
      updateProduct({ ...product, price });
      // Undo puts back only the price, keeping any stock change made since
      const undo = () => {
        const current = productsInStorage().find((p) => p.id === product.id);
        if (current) updateProduct({ ...current, price: product.price });
      };
      notify(`${product.name}: ${formatPeso(product.price)} → ${formatPeso(price)}`, { severity: 'success', action: { label: 'Undo', onClick: undo } });
    },
    [notify, updateProduct]
  );

  const stepStock = useCallback(
    (product: Product, by: number) => {
      updateProduct({ ...product, quantity: Math.max(0, product.quantity + by) });
    },
    [updateProduct]
  );

  const duplicate = useCallback(
    (product: Product) => {
      // Barcodes identify one product, so the copy starts without them
      openEditor({ ...product, id: '', name: `${product.name} (copy)`, barcodes: [] });
    },
    [openEditor]
  );

  const deleteOne = useCallback(
    (product: Product) => {
      deleteProduct(product.id);
      notify(`Deleted ${product.name}`, { severity: 'info', action: { label: 'Undo', onClick: () => addProduct(product) } });
    },
    [addProduct, deleteProduct, notify]
  );

  // ---------- bulk actions (one write each, undoable) ----------

  const replaceAll = (next: Product[]) => importProducts(next);

  const confirmMove = () => {
    const target = moveTarget.trim();
    const existing = categories.find((c) => c.name.toLowerCase() === target.toLowerCase());
    const category = existing ? existing.name : target;
    const createdId = target && !existing ? newId() : null;
    if (createdId) addCategory({ id: createdId, name: target });
    const before = products.filter((p) => selected.has(p.id)).map((p) => ({ id: p.id, category: p.category }));
    replaceAll(products.map((p) => (selected.has(p.id) ? { ...p, category } : p)));
    setMoveOpen(false);
    setSelected(new Set());
    const undo = () => {
      const old = new Map(before.map((b) => [b.id, b.category]));
      const restored = productsInStorage().map((p) => (old.has(p.id) ? { ...p, category: old.get(p.id)! } : p));
      replaceAll(restored);
      // A category this move created goes too, unless something has been put in it since
      if (createdId && !restored.some((p) => p.category === category)) deleteCategory(createdId);
    };
    notify(`Moved ${before.length} product${before.length !== 1 ? 's' : ''} to ${category || 'Uncategorized'}`, {
      severity: 'success',
      action: { label: 'Undo', onClick: undo },
    });
  };

  const confirmBulkDelete = () => {
    const removed = products.filter((p) => selected.has(p.id));
    replaceAll(products.filter((p) => !selected.has(p.id)));
    setBulkDeleteOpen(false);
    setSelected(new Set());
    notify(`Deleted ${removed.length} product${removed.length !== 1 ? 's' : ''}`, {
      severity: 'info',
      action: { label: 'Undo', onClick: () => replaceAll([...productsInStorage(), ...removed]) },
    });
  };

  const confirmDeleteAll = () => {
    const snapshot = products;
    replaceAll([]);
    setDeleteAllOpen(false);
    setSelected(new Set());
    notify(`Deleted all ${snapshot.length} products`, { severity: 'info', action: { label: 'Undo', onClick: () => replaceAll(snapshot) } });
  };

  // ---------- import / export ----------

  const handleExport = () => {
    setMenuAnchor(null);
    if (products.length === 0) {
      notify('No products to export yet', 'warning');
      return;
    }
    exportProducts(products, 'products.csv');
    notify(`Exported ${products.length} products`, 'success');
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCsv(String(e.target?.result ?? ''));
        if (rows.length < 2) {
          notify('That CSV has no product rows', 'warning');
          return;
        }
        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const col = (name: string) => headers.indexOf(name);
        if (col('name') < 0) {
          notify('That CSV has no “name” column. Export products first to see the expected format.', 'error');
          return;
        }
        let skipped = 0;
        const stamp = Date.now();
        const parsed: Product[] = [];
        rows.slice(1).forEach((cells, i) => {
          const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? '').trim() : '');
          const name = get('name');
          if (!name) {
            skipped += 1;
            return;
          }
          parsed.push({
            id: get('id') || `${stamp}-${i}`,
            name,
            category: get('category'),
            price: parseFloat(get('price')) || 0,
            quantity: parseInt(get('quantity'), 10) || 0,
            trackStock: col('trackstock') >= 0 ? get('trackstock').toLowerCase() === 'true' : undefined,
            barcodes: get('barcodes')
              .split(';')
              .map((b) => b.trim())
              .filter(Boolean),
          });
        });
        if (parsed.length === 0) notify('No products with a name were found in that CSV', 'warning');
        else setImportPreview({ fileName: file.name, rows: parsed, skipped });
      } catch (error) {
        console.error('Import error:', error);
        notify('Couldn’t read that CSV file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Merge: update products matched by id, then barcode, then name; add the rest
  const mergePlan = useMemo(() => {
    if (!importPreview) return null;
    const byId = new Map(products.map((p) => [p.id, p]));
    const byBarcode = new Map<string, Product>();
    const byName = new Map<string, Product>();
    for (const p of products) {
      p.barcodes.forEach((b) => b.trim() && byBarcode.set(b.trim(), p));
      byName.set(p.name.trim().toLowerCase(), p);
    }
    const updates = new Map<string, Product>();
    const additions: Product[] = [];
    for (const row of importPreview.rows) {
      const match = byId.get(row.id) ?? row.barcodes.map((b) => byBarcode.get(b)).find(Boolean) ?? byName.get(row.name.toLowerCase());
      if (match && !updates.has(match.id)) updates.set(match.id, { ...row, id: match.id, trackStock: row.trackStock ?? match.trackStock });
      else additions.push(byId.has(row.id) ? { ...row, id: newId() + additions.length } : row);
    }
    return { updates, additions };
  }, [importPreview, products]);

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!importPreview || !mergePlan) return;
    const snapshot = products;
    if (mode === 'replace') {
      replaceAll(importPreview.rows);
      notify(`Replaced the catalogue with ${importPreview.rows.length} products`, { severity: 'success', action: { label: 'Undo', onClick: () => replaceAll(snapshot) } });
    } else {
      replaceAll([...products.map((p) => mergePlan.updates.get(p.id) ?? p), ...mergePlan.additions]);
      notify(`Updated ${mergePlan.updates.size} and added ${mergePlan.additions.length} products`, {
        severity: 'success',
        action: { label: 'Undo', onClick: () => replaceAll(snapshot) },
      });
    }
    setImportPreview(null);
  };

  // ---------- scanning a barcode on this page opens that product ----------

  const scanRef = useRef<{ buffer: string; last: number; fast: number }>({ buffer: '', last: 0, fast: 0 });
  const dialogOpen = Boolean(draft || moveOpen || bulkDeleteOpen || deleteAllOpen || importPreview || priceListOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (dialogOpen || typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = scanRef.current;
      const now = Date.now();
      if (e.key === '/' && !s.buffer) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Enter') {
        const code = s.buffer.trim();
        // A scanner types the whole code in a quick burst
        if (code.length >= 4 && s.fast >= code.length - 2) {
          e.preventDefault();
          const found = products.find((p) => p.barcodes.some((b) => b.trim() === code));
          if (found) openEditor(found);
          else {
            openEditor(undefined, code);
            notify(`New barcode ${code}: add it as a product`, 'info');
          }
        }
        scanRef.current = { buffer: '', last: 0, fast: 0 };
        return;
      }
      if (e.key.length !== 1) return;
      if (now - s.last > 100) scanRef.current = { buffer: e.key, last: now, fast: 0 };
      else scanRef.current = { buffer: s.buffer + e.key, last: now, fast: s.fast + (now - s.last <= 50 ? 1 : 0) };
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen, notify, openEditor, products]);

  // ---------- price list ----------

  const priceListPages = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    for (const p of products) {
      const name = p.category || 'Uncategorized';
      grouped.set(name, [...(grouped.get(name) ?? []), p]);
    }
    const groups: PriceListCategoryGroup[] = Array.from(grouped, ([name, list]) => ({ name, products: [...list].sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return buildPriceListPages(groups);
  }, [products]);

  const printPriceList = useReactToPrint({
    content: () => priceListPrintRef.current,
    documentTitle: `${storeSettings.storeName || 'Store'} Price List`,
  });

  // ---------- render ----------

  const filtersActive = query !== '' || categoryFilter !== 'all' || stockFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStockFilter('all');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h5">Products</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {products.length.toLocaleString()} product{products.length !== 1 ? 's' : ''} in {categoryOptions.length} categor{categoryOptions.length !== 1 ? 'ies' : 'y'}
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline-flex' }, alignItems: 'center', gap: 0.5 }}>
              · <ScanIcon sx={{ fontSize: 16 }} /> scan a barcode to find a product
            </Box>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => (products.length ? setPriceListOpen(true) : notify('Add products before printing a price list', 'info'))}
          >
            Price list
          </Button>
          <Button variant="outlined" endIcon={<ArrowDownIcon />} onClick={(e) => setMenuAnchor(e.currentTarget)}>
            Import / Export
          </Button>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={handleExport}>
              <ListItemIcon>
                <ExportIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Export CSV" secondary="Every product, for spreadsheets or backup" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                fileInputRef.current?.click();
              }}
            >
              <ListItemIcon>
                <ImportIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Import CSV…" secondary="Preview first, then merge or replace" />
            </MenuItem>
            <Divider />
            <MenuItem
              disabled={products.length === 0}
              onClick={() => {
                setMenuAnchor(null);
                setDeleteAllOpen(true);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <DeleteAllIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Delete all products…" />
            </MenuItem>
          </Menu>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEditor()}>
            Add product
          </Button>
        </Box>
      </Box>

      {/* Summary; low and out of stock double as filters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
        <StatTile
          icon={<ProductsIcon />}
          label="Products"
          value={products.length.toLocaleString()}
          caption={stats.noBarcode ? `${stats.noBarcode} without a barcode` : 'All have barcodes'}
          active={stockFilter === 'nobarcode'}
          onClick={stats.noBarcode ? () => setStockFilter(stockFilter === 'nobarcode' ? 'all' : 'nobarcode') : undefined}
        />
        <StatTile
          icon={<ValueIcon />}
          label="Inventory value"
          value={formatPeso(stats.value)}
          caption={stats.tracked === products.length ? 'Price × stock on hand' : `${stats.tracked} of ${products.length} products track stock`}
        />
        <StatTile
          icon={<LowIcon />}
          label="Low stock"
          value={String(stats.low)}
          caption={`${lowStock} or fewer left · tap to show`}
          tone="warning"
          active={stockFilter === 'low'}
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
        />
        <StatTile
          icon={<OutIcon />}
          label="Out of stock"
          value={String(stats.out)}
          caption="Tap to show"
          tone="error"
          active={stockFilter === 'out'}
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
        />
      </Box>

      <Card sx={{ overflow: 'visible' }}>
        {/* Search, categories, sort */}
        <Box sx={{ p: 1.5, display: 'grid', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search by name or barcode  ( / )"
              value={search}
              inputRef={searchRef}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Clear search" onClick={() => setSearch('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <TextField select size="small" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort products" sx={{ minWidth: 170 }}>
              <MenuItem value="name">Name A–Z</MenuItem>
              <MenuItem value="recent">Recently added</MenuItem>
              <MenuItem value="price-asc">Price: low to high</MenuItem>
              <MenuItem value="price-desc">Price: high to low</MenuItem>
              <MenuItem value="stock-asc">Stock: lowest first</MenuItem>
              <MenuItem value="stock-desc">Stock: highest first</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5 }}>
            <Chip
              label={`All · ${products.length}`}
              color={categoryFilter === 'all' ? 'primary' : 'default'}
              variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
              onClick={() => setCategoryFilter('all')}
              sx={{ flexShrink: 0 }}
            />
            {categoryOptions.map((c) => (
              <Chip
                key={c.key}
                icon={c.key === UNCATEGORIZED ? undefined : React.cloneElement(iconFor(c.label), { sx: { fontSize: 16 } })}
                label={`${c.label} · ${c.count}`}
                color={categoryFilter === c.key ? 'primary' : 'default'}
                variant={categoryFilter === c.key ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(c.key)}
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Box>
        </Box>

        {/* Selection bar / list header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1,
            py: 0.75,
            minHeight: 52,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: selected.size > 0 ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.06) : 'background.default',
            position: 'sticky',
            top: 64,
            zIndex: 2,
          }}
        >
          <Checkbox
            size="small"
            checked={allInViewSelected}
            indeterminate={selectedInView > 0 && !allInViewSelected}
            disabled={visibleProducts.length === 0}
            onChange={(e) =>
              setSelected((prev) => {
                const next = new Set(prev);
                visibleProducts.forEach((p) => (e.target.checked ? next.add(p.id) : next.delete(p.id)));
                return next;
              })
            }
            inputProps={{ 'aria-label': 'Select all products in view' }}
          />
          {selected.size > 0 ? (
            <>
              <Typography fontWeight={600} sx={{ flex: 1 }}>
                {selected.size} selected
              </Typography>
              <Button color="inherit" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button
                variant="outlined"
                startIcon={<MoveIcon />}
                onClick={() => {
                  setMoveTarget('');
                  setMoveOpen(true);
                }}
              >
                Move to category
              </Button>
              <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => setBulkDeleteOpen(true)}>
                Delete
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {visibleProducts.length.toLocaleString()} shown
                {filtersActive && (
                  <Button size="small" onClick={clearFilters} sx={{ ml: 1 }}>
                    Clear filters
                  </Button>
                )}
              </Typography>
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '150px 112px 132px 100px',
                  columnGap: 1.5,
                  pr: 1,
                  '& span': { typography: 'caption', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                }}
              >
                <span>Category</span>
                <span style={{ textAlign: 'right' }}>Price</span>
                <span style={{ textAlign: 'right', paddingRight: 30 }}>Stock</span>
                <span />
              </Box>
            </>
          )}
        </Box>

        {visibleProducts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <ProductsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            {products.length === 0 ? (
              <>
                <Typography fontWeight={600}>No products yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add them one by one, scan a barcode, or import a CSV.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEditor()}>
                    Add product
                  </Button>
                  <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => fileInputRef.current?.click()}>
                    Import CSV
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography fontWeight={600}>Nothing matches</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {query ? `No product is named or has a barcode like “${deferredSearch.trim()}”.` : 'No products fit these filters.'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button onClick={clearFilters}>Clear filters</Button>
                  {query && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const looksLikeBarcode = /^\d{4,}$/.test(deferredSearch.trim());
                        openEditor(undefined, looksLikeBarcode ? deferredSearch.trim() : undefined);
                        if (!looksLikeBarcode) setDraft((d) => (d ? { ...d, name: deferredSearch.trim() } : d));
                      }}
                    >
                      Add “{deferredSearch.trim()}”
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        ) : (
          <>
            {visibleProducts.slice(0, visibleCount).map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                lowStock={lowStock}
                icon={iconFor(product.category)}
                selected={selected.has(product.id)}
                editingPrice={priceEditing === product.id}
                onToggle={toggleSelected}
                onOpen={openEditor}
                onStartPrice={setPriceEditing}
                onSavePrice={savePrice}
                onStep={stepStock}
                onDuplicate={duplicate}
                onDelete={deleteOne}
              />
            ))}
            {hasMore && (
              <Box ref={sentinelRef} sx={{ textAlign: 'center', py: 1.5 }}>
                <Button onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>Show more ({(visibleProducts.length - visibleCount).toLocaleString()} remaining)</Button>
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Add / edit product */}
      <Dialog open={draft !== null} onClose={() => setDraft(null)} maxWidth="sm" fullWidth>
        {draft && (
          <Box
            component="form"
            noValidate
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              saveDraft(false);
            }}
          >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
              {draft.id ? 'Edit product' : 'Add product'}
              <IconButton aria-label="Close" onClick={() => setDraft(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
              <TextField
                label="Product name"
                value={draft.name}
                inputRef={nameRef}
                autoFocus={!draft.barcodes.length || Boolean(draft.id)}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                  setNameError('');
                }}
                error={Boolean(nameError)}
                helperText={nameError || (duplicateName ? `Heads up: “${duplicateName.name}” already exists` : ' ')}
                FormHelperTextProps={{ sx: { color: !nameError && duplicateName ? 'warning.main' : undefined } }}
              />
              <Autocomplete
                freeSolo
                options={categories.map((c) => c.name).sort((a, b) => a.localeCompare(b))}
                value={draft.category}
                onInputChange={(_, value) => setDraft((d) => (d ? { ...d, category: value } : d))}
                renderOption={(props, option) => (
                  <li {...props} key={option}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', '& svg': { fontSize: 18 } }}>{iconFor(option)}</Box>
                    <Box sx={{ ml: 1 }}>{option}</Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    helperText={
                      draft.category.trim() && !categories.some((c) => c.name.toLowerCase() === draft.category.trim().toLowerCase())
                        ? `“${draft.category.trim()}” will be added as a new category`
                        : ' '
                    }
                  />
                )}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Price"
                  type="number"
                  value={draft.price}
                  onChange={(e) => {
                    setDraft({ ...draft, price: e.target.value });
                    setPriceError('');
                  }}
                  error={Boolean(priceError)}
                  helperText={priceError || ' '}
                  inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                />
                {draft.trackStock ? (
                  <TextField
                    label="Stock on hand"
                    type="number"
                    value={draft.quantity}
                    onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                    helperText={draft.quantity !== '' && Number(draft.quantity) <= lowStock ? (Number(draft.quantity) <= 0 ? 'Out of stock' : 'Low stock') : ' '}
                    inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                    inputRef={stockRef}
                  />
                ) : (
                  <TextField label="Stock" value="∞ Unlimited" disabled helperText=" " />
                )}
              </Box>
              <FormControlLabel
                sx={{ mt: -1.5, alignItems: 'flex-start', '& .MuiFormControlLabel-label': { pt: 0.75 } }}
                control={
                  <Switch
                    checked={draft.trackStock}
                    onChange={(e) => {
                      const on = e.target.checked;
                      // An untouched new product starts counting from 0
                      setDraft({ ...draft, trackStock: on, quantity: on && draft.quantity === '' ? '0' : draft.quantity });
                      if (on) window.setTimeout(() => stockRef.current?.select(), 0);
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Track stock
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {draft.trackStock
                        ? 'Counted, with low- and out-of-stock warnings.'
                        : 'Off: this product never runs out. Turn on to count how many are left.'}
                    </Typography>
                  </Box>
                }
              />
              <Box>
                <TextField
                  fullWidth
                  label="Barcodes"
                  placeholder="Scan or type, then press Enter"
                  value={barcodeInput}
                  autoFocus={Boolean(draft.barcodes.length) && !draft.id}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setBarcodeError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addBarcodeChip();
                    }
                  }}
                  error={Boolean(barcodeError)}
                  helperText={barcodeError || 'A product can have several barcodes, e.g. single piece and pack.'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ScanIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: barcodeInput ? (
                      <InputAdornment position="end">
                        <Button size="small" onClick={addBarcodeChip}>
                          Add
                        </Button>
                      </InputAdornment>
                    ) : undefined,
                  }}
                />
                {draft.barcodes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                    {draft.barcodes.map((code) => (
                      <Chip
                        key={code}
                        label={code}
                        onDelete={() => setDraft({ ...draft, barcodes: draft.barcodes.filter((b) => b !== code) })}
                        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
              {draft.id && (
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    const product = products.find((p) => p.id === draft.id);
                    setDraft(null);
                    if (product) deleteOne(product);
                  }}
                  sx={{ mr: 'auto' }}
                >
                  Delete
                </Button>
              )}
              <Button color="inherit" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              {!draft.id && (
                <Button variant="outlined" onClick={() => saveDraft(true)}>
                  Save & add another
                </Button>
              )}
              <Button type="submit" variant="contained">
                Save
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* Move selected to a category */}
      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Move {selected.size} product{selected.size !== 1 ? 's' : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Autocomplete
            freeSolo
            options={categories.map((c) => c.name).sort((a, b) => a.localeCompare(b))}
            inputValue={moveTarget}
            onInputChange={(_, value) => setMoveTarget(value)}
            renderInput={(params) => <TextField {...params} autoFocus label="Category" helperText="Pick one, or type a new name. Leave empty for Uncategorized." />}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setMoveOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmMove}>
            Move
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete selected */}
      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Delete {selected.size} product{selected.size !== 1 ? 's' : ''}?
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">They’ll be removed from the catalogue. You can undo this right after.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setBulkDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmBulkDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete all */}
      <Dialog open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete all {products.length} products?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            The whole catalogue is removed. Export a CSV first if you might want it back later; Undo is only available for a few seconds.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setDeleteAllOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmDeleteAll}>
            Delete all
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import preview */}
      <Dialog open={importPreview !== null} onClose={() => setImportPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Import {importPreview?.fileName}</DialogTitle>
        <DialogContent>
          {importPreview && mergePlan && (
            <>
              <Typography sx={{ mb: 1.5 }}>
                Found <strong>{importPreview.rows.length}</strong> product{importPreview.rows.length !== 1 ? 's' : ''}
                {importPreview.skipped > 0 && ` (${importPreview.skipped} row${importPreview.skipped !== 1 ? 's' : ''} without a name skipped)`}.
              </Typography>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', maxHeight: 200, overflowY: 'auto', mb: 2 }}>
                {importPreview.rows.slice(0, 50).map((p) => (
                  <Box key={p.id} sx={{ display: 'flex', gap: 1, px: 1.5, py: 0.75, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                      {p.category || 'Uncategorized'}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80, textAlign: 'right' }}>
                      {formatPeso(p.price)}
                    </Typography>
                  </Box>
                ))}
                {importPreview.rows.length > 50 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 0.75 }}>
                    …and {importPreview.rows.length - 50} more
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Merge</strong> updates {mergePlan.updates.size} matching product{mergePlan.updates.size !== 1 ? 's' : ''} (by ID, barcode or name) and adds{' '}
                  {mergePlan.additions.length} new. Nothing else changes.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Replace all</strong> swaps your {products.length} current products for the {importPreview.rows.length} in this file.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button color="inherit" onClick={() => setImportPreview(null)} sx={{ mr: 'auto' }}>
            Cancel
          </Button>
          <Button color="error" variant="outlined" onClick={() => applyImport('replace')}>
            Replace all
          </Button>
          <Button variant="contained" onClick={() => applyImport('merge')}>
            Merge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Price list */}
      <Dialog open={priceListOpen} onClose={() => setPriceListOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
          Price list · {priceListPages.length} page{priceListPages.length !== 1 ? 's' : ''}
          <IconButton aria-label="Close" onClick={() => setPriceListOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
          <PriceListPrintContent
            ref={priceListPrintRef}
            storeName={storeSettings.storeName}
            storeAddress={storeSettings.storeAddress}
            pages={priceListPages}
            totalProducts={products.length}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            {products.length} products, grouped by category
          </Typography>
          <Button color="inherit" onClick={() => setPriceListOpen(false)}>
            Close
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => printPriceList()}>
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageProducts;
