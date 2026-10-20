import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  FileDownloadOutlined as FileDownloadIcon,
  History as HistoryIcon,
  Inventory2Outlined as PurchaseIcon,
  PaymentsOutlined as CashIcon,
  PhoneAndroid as LoadIcon,
  PointOfSale as SalesIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { GrossSalesContext, ProductsContext, SaleRecord, SalesContext } from '../App';
import { saveAs } from 'file-saver';
import PredictField, { Highlight } from '../components/PredictField';
import ExcelJS from 'exceljs';

import { useNotify } from '../contexts/NotificationContext';
type ClearedSalesBatch = {
  id: string;
  clearedAt: string;
  reason: 'clear-all' | 'export-and-clear';
  sales: SaleRecord[];
};

type GeneralFilter = 'all' | 'checkout' | 'manual' | 'unlisted';
type StoreFilter = 'all' | 'cashier' | 'gcash';
type LoadFilter = 'all' | 'globe' | 'smart';

const CLEARED_SALES_HISTORY_KEY = 'pos_cleared_sales_history';
const UNLISTED_NAME = 'Unlisted Sales';
const PAGE_SIZE = 60;
// Each column only shows a handful of rows at once, so it starts smaller
const COLUMN_PAGE_SIZE = 40;
const QUICK_LOAD_AMOUNTS = [10, 20, 50, 100, 300];

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const pad = (value: number) => String(value).padStart(2, '0');
const dayKeyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dayLabel = (dayKey: string, short = false) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const full = short
    ? date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
    : date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (date.toDateString() === today.toDateString()) return short ? 'Today' : `Today · ${full}`;
  if (date.toDateString() === yesterday.toDateString()) return short ? 'Yesterday' : `Yesterday · ${full}`;
  return full;
};

const loadNetworkOf = (sale: SaleRecord): 'Globe' | 'Smart' | null => {
  const name = (sale.items[0]?.name ?? '').toLowerCase();
  if (name.includes('globe')) return 'Globe';
  if (name.includes('smart')) return 'Smart';
  return null;
};

const isUnlisted = (sale: SaleRecord) => sale.items.length === 1 && sale.items[0].name === UNLISTED_NAME;

const describeSale = (sale: SaleRecord) => {
  const items = sale.items;
  if (items.length <= 1) return items[0]?.name ?? '—';
  const shown = items.slice(0, 3).map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name));
  return items.length > 3 ? `${shown.join(', ')} +${items.length - 3} more` : shown.join(', ');
};

// Basket checkouts save a receipt with the same id as the sale, which is how they're told
// apart from sales typed in by hand.
const typeLabel = (sale: SaleRecord, checkoutIds?: Set<string>) => {
  if (sale.type === 'store') return sale.paymentMethod === 'gcash' ? 'Purchase · GCash' : 'Purchase · Cashier';
  if (sale.type === 'load') return `Load · ${loadNetworkOf(sale) ?? 'Other'}`;
  if (isUnlisted(sale)) return 'Unlisted sale';
  const count = sale.items.length;
  if (checkoutIds?.has(sale.id)) return `Checkout · ${count} item${count !== 1 ? 's' : ''}`;
  return count > 1 ? `Sale · ${count} items` : 'Sale';
};

// The same figures the old page showed: "Net cash" is general sales minus purchases
// paid from the cashier, which is what the General Sales table used to total.
const summarize = (sales: SaleRecord[]) => {
  const s = { general: 0, generalCount: 0, cashier: 0, gcash: 0, purchaseCount: 0, globe: 0, smart: 0, load: 0, loadCount: 0 };
  for (const sale of sales) {
    if (sale.type === 'general') {
      s.general += sale.total;
      s.generalCount += 1;
    } else if (sale.type === 'store') {
      s.purchaseCount += 1;
      if (sale.paymentMethod === 'cashier') s.cashier += sale.total;
      else if (sale.paymentMethod === 'gcash') s.gcash += sale.total;
    } else if (sale.type === 'load') {
      s.load += sale.total;
      s.loadCount += 1;
      const network = loadNetworkOf(sale);
      if (network === 'Globe') s.globe += sale.total;
      else if (network === 'Smart') s.smart += sale.total;
    }
  }
  return { ...s, purchases: s.cashier + s.gcash, netCash: s.general - s.cashier };
};

type Summary = ReturnType<typeof summarize>;

const sortNewestFirst = (sales: SaleRecord[]) =>
  [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));

const newSale = (fields: Omit<SaleRecord, 'id' | 'date'>): SaleRecord => ({ id: Date.now().toString(), date: new Date(), ...fields });

const tint = (t: any) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1);

const StatTile: React.FC<{ icon: React.ReactElement; label: string; value: number; caption: string; negative?: boolean }> = ({
  icon,
  label,
  value,
  caption,
  negative,
}) => (
  <Card sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
    <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: tint }}>
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" color={negative ? 'error.main' : 'text.primary'} sx={{ lineHeight: 1.3 }}>
        {formatPeso(value)}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" noWrap title={caption}>
        {caption}
      </Typography>
    </Box>
  </Card>
);

const SummaryTiles: React.FC<{ summary: Summary }> = ({ summary }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
    <StatTile icon={<SalesIcon />} label="Sales" value={summary.general} caption={`${summary.generalCount} transaction${summary.generalCount !== 1 ? 's' : ''}`} />
    <StatTile
      icon={<PurchaseIcon />}
      label="Store purchases"
      value={summary.purchases}
      caption={`Cashier ${formatPeso(summary.cashier)} · GCash ${formatPeso(summary.gcash)}`}
    />
    <StatTile icon={<CashIcon />} label="Net cash" value={summary.netCash} negative={summary.netCash < 0} caption="Sales minus cashier-paid purchases" />
    <StatTile icon={<LoadIcon />} label="Load sales" value={summary.load} caption={`Globe ${formatPeso(summary.globe)} · Smart ${formatPeso(summary.smart)}`} />
  </Box>
);

// ---------- Rows ----------

// Plain elements styled by one shared class, so long lists stay light.
const RowRoot = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto 34px',
  alignItems: 'center',
  columnGap: theme.spacing(1),
  padding: theme.spacing(0.75, 0.5, 0.75, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:hover': { backgroundColor: theme.palette.action.hover },
  '& .row-time': { ...theme.typography.body2, color: theme.palette.text.secondary, display: 'none' },
  '& .row-main': { minWidth: 0 },
  '& .row-title, & .row-meta': { margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  '& .row-title': { ...theme.typography.body2, fontWeight: 600 },
  '& .row-meta': { ...theme.typography.caption, color: theme.palette.text.secondary },
  '& .row-amount': { ...theme.typography.body2, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' },
  '& .row-amount[data-out="true"]': { color: theme.palette.text.secondary },
  '& .row-delete': {
    display: 'grid',
    placeItems: 'center',
    width: 32,
    height: 32,
    padding: 0,
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: theme.palette.action.active,
    cursor: 'pointer',
    opacity: 0.6,
    '&:hover': { backgroundColor: theme.palette.action.hover, color: theme.palette.error.main, opacity: 1 },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, opacity: 1 },
  },
  '&:hover .row-delete': { opacity: 1 },
  [theme.breakpoints.up('md')]: {
    '&[data-wide="true"]': {
      gridTemplateColumns: '76px minmax(0, 1fr) auto 34px',
      '& .row-time': { display: 'block' },
      '& .row-time-inline': { display: 'none' },
    },
  },
}));

type SaleRowProps = { sale: SaleRecord; wide?: boolean; checkoutIds?: Set<string>; onDelete?: (sale: SaleRecord) => void };

const SaleRow = React.memo(function SaleRow({ sale, wide, checkoutIds, onDelete }: SaleRowProps) {
  const time = new Date(sale.date).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const isPurchase = sale.type === 'store';
  return (
    <RowRoot data-wide={Boolean(wide)}>
      <span className="row-time">{time}</span>
      <div className="row-main">
        <p className="row-title" title={sale.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}>
          {describeSale(sale)}
        </p>
        <p className="row-meta">
          <span className="row-time-inline">{time} · </span>
          {typeLabel(sale, checkoutIds)}
        </p>
      </div>
      <span className="row-amount" data-out={isPurchase}>
        {isPurchase ? `−${formatPeso(sale.total)}` : formatPeso(sale.total)}
      </span>
      {onDelete ? (
        <button type="button" className="row-delete" title="Delete" aria-label={`Delete ${describeSale(sale)}`} onClick={() => onDelete(sale)}>
          <DeleteIcon fontSize="small" />
        </button>
      ) : (
        <span />
      )}
    </RowRoot>
  );
});

const DayHeader: React.FC<{ label: string; detail: React.ReactNode; stickyTop?: number }> = ({ label, detail, stickyTop }) => (
  <Box
    sx={{
      position: stickyTop === undefined ? 'static' : 'sticky',
      top: stickyTop,
      zIndex: 1,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 1,
      px: 2,
      py: 0.75,
      bgcolor: 'background.default',
      borderBottom: 1,
      borderColor: 'divider',
    }}
  >
    <Typography variant="subtitle2" noWrap>
      {label}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
      {detail}
    </Typography>
  </Box>
);

// Newest-first rows with a header wherever the day changes; renders `limit` rows.
const SalesList: React.FC<{
  sales: SaleRecord[];
  limit: number;
  wide?: boolean;
  shortDays?: boolean;
  stickyTop?: number;
  checkoutIds?: Set<string>;
  onDelete?: (sale: SaleRecord) => void;
  // what the day header totals; history shows sales only, a column shows everything in it
  dayTotalOf?: (sale: SaleRecord) => number;
}> = ({ sales, limit, wide, shortDays, stickyTop, checkoutIds, onDelete, dayTotalOf = (s) => (s.type === 'general' ? s.total : 0) }) => {
  const dayTotals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const sale of sales) {
      const key = dayKeyOf(new Date(sale.date));
      const entry = map.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += dayTotalOf(sale);
      map.set(key, entry);
    }
    return map;
  }, [sales, dayTotalOf]);

  const rows: React.ReactNode[] = [];
  let currentDay = '';
  for (const sale of sales.slice(0, limit)) {
    const key = dayKeyOf(new Date(sale.date));
    if (key !== currentDay) {
      currentDay = key;
      const totals = dayTotals.get(key) ?? { count: 0, total: 0 };
      rows.push(
        <DayHeader
          key={`day-${key}`}
          label={dayLabel(key, shortDays)}
          stickyTop={stickyTop}
          detail={
            <>
              {totals.count} · <strong>{formatPeso(totals.total)}</strong>
            </>
          }
        />
      );
    }
    rows.push(<SaleRow key={sale.id} sale={sale} wide={wide} checkoutIds={checkoutIds} onDelete={onDelete} />);
  }
  return <>{rows}</>;
};

// ---------- Columns ----------

const sumAll = (sale: SaleRecord) => sale.total;

const ColumnList: React.FC<{
  sales: SaleRecord[];
  resetKey: string;
  checkoutIds?: Set<string>;
  onDelete: (sale: SaleRecord) => void;
  emptyText: string;
}> = ({ sales, resetKey, checkoutIds, onDelete, emptyText }) => {
  const [limit, setLimit] = useState(COLUMN_PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = limit < sales.length;

  useEffect(() => {
    setLimit(COLUMN_PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  // Load the next batch as the end of this column scrolls into view
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((value) => value + COLUMN_PAGE_SIZE);
      },
      { root: scrollRef.current, rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, limit]);

  return (
    <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: { xs: 480, lg: 'none' } }}>
      {sales.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 5, px: 2 }}>
          {emptyText}
        </Typography>
      ) : (
        <>
          <SalesList sales={sales} limit={limit} shortDays stickyTop={0} checkoutIds={checkoutIds} onDelete={onDelete} dayTotalOf={sumAll} />
          {hasMore && (
            <Box ref={sentinelRef} sx={{ textAlign: 'center', py: 1 }}>
              <Button size="small" onClick={() => setLimit((value) => value + COLUMN_PAGE_SIZE)}>
                Show more ({(sales.length - limit).toLocaleString()} remaining)
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

type FilterOption = { value: string; label: string; count: number };

const SalesColumn: React.FC<{
  title: string;
  icon: React.ReactElement;
  total: number;
  caption: React.ReactNode;
  form: React.ReactNode;
  filters: FilterOption[];
  filter: string;
  onFilter: (value: string) => void;
  children: React.ReactNode;
}> = ({ title, icon, total, caption, form, filters, filter, onFilter, children }) => (
  <Card sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: { lg: 'calc(100vh - 232px)' }, minHeight: { lg: 560 } }}>
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2, pb: 1.5 }}>
      <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: tint }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="h5" component="p" sx={{ lineHeight: 1.25 }}>
          {formatPeso(total)}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {caption}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.default', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>{form}</Box>
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
      {filters.map((option) => (
        <Chip
          key={option.value}
          size="small"
          label={`${option.label} · ${option.count}`}
          color={filter === option.value ? 'primary' : 'default'}
          variant={filter === option.value ? 'filled' : 'outlined'}
          onClick={() => onFilter(option.value)}
        />
      ))}
    </Box>
    {children}
  </Card>
);

const AmountField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}> = ({ value, onChange, error, inputRef }) => (
  <TextField
    size="small"
    label="Amount"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    type="number"
    error={Boolean(error)}
    inputRef={inputRef}
    inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
    InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
    sx={{ flex: 1, minWidth: 0 }}
  />
);

const parseAmount = (value: string) => {
  const amount = Number(value);
  return value.trim() !== '' && Number.isFinite(amount) && amount > 0 ? amount : null;
};

const FormError: React.FC<{ message?: string; hint?: string }> = ({ message, hint }) =>
  message || hint ? (
    <Typography variant="caption" color={message ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mt: 0.75 }}>
      {message ?? hint}
    </Typography>
  ) : null;

type AddHandler = (sale: SaleRecord) => void;

type Suggestion = { name: string; price: number; source: 'recent' | 'product' };

const SUGGESTION_LIMIT = 8;

// Recent typed-in names come before product names in `list`; for a typed query, names
// that start with it rank above word starts, which rank above matches anywhere.
const rankSuggestions = (list: Suggestion[], query: string): Suggestion[] => {
  const q = query.trim().toLowerCase();
  if (!q) return list.filter((s) => s.source === 'recent').slice(0, 6);
  const scored: Array<{ s: Suggestion; score: number; index: number }> = [];
  list.forEach((s, index) => {
    const name = s.name.toLowerCase();
    if (name === q) return;
    const score = name.startsWith(q) ? 3 : name.split(/[\s\-()/,.]+/).some((w) => w.startsWith(q)) ? 2 : name.includes(q) ? 1 : 0;
    if (score > 0) scored.push({ s, score, index });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, SUGGESTION_LIMIT).map((x) => x.s);
};

const NameField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: Suggestion[];
  onPick: (suggestion: Suggestion) => void;
  priceLabel: string;
  error?: boolean;
  inputRef: React.Ref<HTMLInputElement>;
}> = ({ label, value, onChange, suggestions, onPick, priceLabel, error, inputRef }) => {
  const getOptions = useCallback((query: string) => rankSuggestions(suggestions, query), [suggestions]);
  return (
    <Box sx={{ mb: 1 }}>
      <PredictField<Suggestion>
        value={value}
        onChange={onChange}
        getOptions={getOptions}
        getKey={(s) => `${s.source}:${s.name}`}
        onPick={onPick}
        openWhenEmpty
        heading={(query) => (query.trim() ? 'Suggestions' : 'Recently used')}
        pickLabel="use"
        inputRef={inputRef}
        textFieldProps={{ size: 'small', fullWidth: true, label, error }}
        renderOption={(s, query) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                <Highlight text={s.name} query={query} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.source === 'product' ? 'Product' : 'Used before'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={700}>
                {formatPeso(s.price)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.source === 'product' ? 'price' : priceLabel}
              </Typography>
            </Box>
          </Box>
        )}
      />
    </Box>
  );
};

// Typing or picking a known name fills in its price when the amount is still empty,
// and picking moves on to the amount.
const useNameWithPrice = (suggestions: Suggestion[]) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const amountRef = useRef<HTMLInputElement | null>(null);
  const prices = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of suggestions) {
      const key = s.name.trim().toLowerCase();
      if (!map.has(key)) map.set(key, s.price);
    }
    return map;
  }, [suggestions]);
  const changeName = (value: string) => {
    setName(value);
    const known = prices.get(value.trim().toLowerCase());
    if (known !== undefined && amount.trim() === '') setAmount(String(known));
  };
  const pick = (s: Suggestion) => {
    setName(s.name);
    if (amount.trim() === '') setAmount(String(s.price));
    amountRef.current?.focus();
  };
  return { name, amount, setName, setAmount, changeName, pick, amountRef };
};

const GeneralForm: React.FC<{ onAdd: AddHandler; suggestions: Suggestion[] }> = ({ onAdd, suggestions }) => {
  const { name, amount, setName, setAmount, changeName, pick, amountRef } = useNameWithPrice(suggestions);
  const [error, setError] = useState<string>();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const unlisted = name.trim() === '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseAmount(amount);
    if (price === null) return setError('Enter an amount above zero');
    onAdd(newSale({ items: [{ name: unlisted ? UNLISTED_NAME : name.trim(), quantity: 1, price }], total: price, type: 'general' }));
    setName('');
    setAmount('');
    setError(undefined);
    nameRef.current?.focus();
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <NameField
        label="Item name"
        value={name}
        onChange={changeName}
        suggestions={suggestions}
        onPick={pick}
        priceLabel="last sold for"
        inputRef={nameRef}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <AmountField
          value={amount}
          error={error}
          inputRef={amountRef}
          onChange={(value) => {
            setAmount(value);
            setError(undefined);
          }}
        />
        <Button type="submit" variant="contained" sx={{ flexShrink: 0, minWidth: 116 }}>
          {unlisted ? 'Add unlisted' : 'Add sale'}
        </Button>
      </Box>
      <FormError message={error} hint={unlisted ? `No name? It's saved as “${UNLISTED_NAME}”.` : undefined} />
    </Box>
  );
};

const StoreForm: React.FC<{ onAdd: AddHandler; suggestions: Suggestion[] }> = ({ onAdd, suggestions }) => {
  const { name, amount, setName, setAmount, changeName, pick, amountRef } = useNameWithPrice(suggestions);
  const [payment, setPayment] = useState<'cashier' | 'gcash'>('cashier');
  const [error, setError] = useState<string>();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseAmount(amount);
    if (!name.trim()) return setError('Enter what was bought');
    if (price === null) return setError('Enter an amount above zero');
    onAdd(newSale({ items: [{ name: name.trim(), quantity: 1, price }], total: price, type: 'store', paymentMethod: payment }));
    setName('');
    setAmount('');
    setError(undefined);
    nameRef.current?.focus();
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <NameField
        label="What was bought"
        value={name}
        onChange={(value) => {
          changeName(value);
          setError(undefined);
        }}
        suggestions={suggestions}
        onPick={(s) => {
          pick(s);
          setError(undefined);
        }}
        priceLabel="last paid"
        error={error === 'Enter what was bought'}
        inputRef={nameRef}
      />
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <AmountField
          value={amount}
          error={error === 'Enter an amount above zero' ? error : undefined}
          inputRef={amountRef}
          onChange={(value) => {
            setAmount(value);
            setError(undefined);
          }}
        />
        <Button type="submit" variant="contained" sx={{ flexShrink: 0, minWidth: 116 }}>
          Add purchase
        </Button>
      </Box>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        color="primary"
        value={payment}
        onChange={(_, value) => value && setPayment(value)}
        sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, py: 0.5 } }}
      >
        <ToggleButton value="cashier">Paid from cashier</ToggleButton>
        <ToggleButton value="gcash">Paid by GCash</ToggleButton>
      </ToggleButtonGroup>
      <FormError message={error} hint={payment === 'cashier' ? 'Cashier purchases come out of Net cash.' : 'GCash purchases don’t affect Net cash.'} />
    </Box>
  );
};

const LoadForm: React.FC<{ onAdd: AddHandler }> = ({ onAdd }) => {
  const [network, setNetwork] = useState<'Globe' | 'Smart'>('Globe');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string>();
  const amountRef = useRef<HTMLInputElement | null>(null);

  const add = (price: number) =>
    onAdd(newSale({ items: [{ name: `Load (${network})`, quantity: 1, price }], total: price, type: 'load' }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseAmount(amount);
    if (price === null) return setError('Enter an amount above zero');
    add(price);
    setAmount('');
    setError(undefined);
    amountRef.current?.focus();
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        color="primary"
        value={network}
        onChange={(_, value) => {
          if (!value) return;
          setNetwork(value);
          amountRef.current?.focus();
        }}
        sx={{ mb: 1, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, py: 0.5 } }}
      >
        <ToggleButton value="Globe">Globe</ToggleButton>
        <ToggleButton value="Smart">Smart</ToggleButton>
      </ToggleButtonGroup>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <AmountField
          value={amount}
          error={error}
          inputRef={amountRef}
          onChange={(value) => {
            setAmount(value);
            setError(undefined);
          }}
        />
        <Button type="submit" variant="contained" sx={{ flexShrink: 0, minWidth: 116 }}>
          Add load
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
          Quick add {network}:
        </Typography>
        {QUICK_LOAD_AMOUNTS.map((value) => (
          <Chip key={value} size="small" variant="outlined" label={`+₱${value}`} onClick={() => add(value)} sx={{ bgcolor: 'background.paper' }} />
        ))}
      </Box>
      <FormError message={error} />
    </Box>
  );
};

// ---------- History ----------

const HistoryBatch: React.FC<{
  batch: ClearedSalesBatch;
  selected: boolean;
  onToggle: (id: string) => void;
  onDelete: (batch: ClearedSalesBatch) => void;
}> = ({ batch, selected, onToggle, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const summary = useMemo(() => summarize(batch.sales), [batch.sales]);
  const sorted = useMemo(() => (open ? sortNewestFirst(batch.sales) : []), [open, batch.sales]);
  const clearedAt = new Date(batch.clearedAt);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '40px minmax(0, 1fr) auto', sm: '40px minmax(0, 1fr) auto auto' },
          alignItems: 'center',
          columnGap: 1.5,
          px: 1,
          py: 1,
          cursor: 'pointer',
          bgcolor: selected ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.07) : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setOpen((value) => !value)}
      >
        <Checkbox
          size="small"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggle(batch.id)}
          inputProps={{ 'aria-label': `Select record from ${clearedAt.toLocaleString()}` }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {clearedAt.toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="p">
            {batch.reason === 'clear-all' ? 'Cleared' : 'Exported & cleared'} · {batch.sales.length} entr{batch.sales.length !== 1 ? 'ies' : 'y'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
          <Typography fontWeight={700}>{formatPeso(summary.general)}</Typography>
          <Typography variant="caption" color="text.secondary">
            sales
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="small"
            aria-label="Delete this record"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(batch);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
          <ExpandMoreIcon sx={{ color: 'action.active', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </Box>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2, pt: 1, bgcolor: 'background.default' }}>
          <SummaryTiles summary={summary} />
          <Card sx={{ mt: 1.5 }}>
            {sorted.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                No entries in this record.
              </Typography>
            ) : (
              <>
                <SalesList sales={sorted} limit={limit} wide />
                {limit < sorted.length && (
                  <Box sx={{ textAlign: 'center', py: 1 }}>
                    <Button onClick={() => setLimit((value) => value + PAGE_SIZE)}>Show more ({sorted.length - limit} remaining)</Button>
                  </Box>
                )}
              </>
            )}
          </Card>
        </Box>
      </Collapse>
    </Box>
  );
};

// ---------- Page ----------

const SalesRecord: React.FC = () => {
  const salesContext = useContext(SalesContext);
  const grossSalesContext = useContext(GrossSalesContext);
  const { products } = useContext(ProductsContext);
  const sales = salesContext.sales;
  const notify = useNotify();;
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [generalFilter, setGeneralFilter] = useState<GeneralFilter>('all');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [loadFilter, setLoadFilter] = useState<LoadFilter>('all');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [clearAfterExport, setClearAfterExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string[] | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

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

  // "/" jumps to the search box, Escape clears it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing && activeTab === 0) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab]);

  const persistSales = useCallback(
    (next: SaleRecord[]) => {
      salesContext.setSales(next);
      localStorage.setItem('pos_sales', JSON.stringify(next));
    },
    [salesContext]
  );

  const checkoutIds = useMemo(() => new Set(salesContext.receipts.map((r) => r.id)), [salesContext.receipts]);
  const summary = useMemo(() => summarize(sales), [sales]);
  const sortedSales = useMemo(() => sortNewestFirst(sales), [sales]);
  const oldestSaleDate = sortedSales.length ? new Date(sortedSales[sortedSales.length - 1].date) : null;

  const deferredSearch = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const searched = useMemo(
    () => (normalizedSearch ? sortedSales.filter((sale) => sale.items.some((item) => item.name.toLowerCase().includes(normalizedSearch))) : sortedSales),
    [normalizedSearch, sortedSales]
  );

  const columns = useMemo(() => {
    const general: SaleRecord[] = [];
    const store: SaleRecord[] = [];
    const load: SaleRecord[] = [];
    const counts = {
      general: { all: 0, checkout: 0, manual: 0, unlisted: 0 },
      store: { all: 0, cashier: 0, gcash: 0 },
      load: { all: 0, globe: 0, smart: 0 },
    };
    for (const sale of searched) {
      if (sale.type === 'general') {
        const kind: GeneralFilter = checkoutIds.has(sale.id) ? 'checkout' : isUnlisted(sale) ? 'unlisted' : 'manual';
        counts.general.all += 1;
        counts.general[kind] += 1;
        if (generalFilter === 'all' || generalFilter === kind) general.push(sale);
      } else if (sale.type === 'store') {
        const kind: StoreFilter = sale.paymentMethod === 'gcash' ? 'gcash' : 'cashier';
        counts.store.all += 1;
        counts.store[kind] += 1;
        if (storeFilter === 'all' || storeFilter === kind) store.push(sale);
      } else if (sale.type === 'load') {
        const network = loadNetworkOf(sale);
        counts.load.all += 1;
        if (network === 'Globe') counts.load.globe += 1;
        if (network === 'Smart') counts.load.smart += 1;
        if (loadFilter === 'all' || (loadFilter === 'globe' && network === 'Globe') || (loadFilter === 'smart' && network === 'Smart')) load.push(sale);
      }
    }
    return { general, store, load, counts };
  }, [checkoutIds, generalFilter, loadFilter, searched, storeFilter]);

  // Name suggestions: recent typed-in entries first, then product names
  const { generalSuggestions, storeSuggestions } = useMemo(() => {
    const recent = sortNewestFirst([...sales, ...clearedSalesHistory.flatMap((h) => h.sales)]);
    const general = new Map<string, Suggestion>();
    const store = new Map<string, Suggestion>();
    for (const sale of recent) {
      if (sale.items.length !== 1 || checkoutIds.has(sale.id)) continue;
      const name = sale.items[0].name;
      const key = name.trim().toLowerCase();
      if (sale.type === 'general' && !isUnlisted(sale) && !name.endsWith('-Paid') && general.size < 40 && !general.has(key)) {
        general.set(key, { name, price: sale.total, source: 'recent' });
      } else if (sale.type === 'store' && store.size < 40 && !store.has(key)) {
        store.set(key, { name, price: sale.total, source: 'recent' });
      }
    }
    for (const product of products) {
      const key = product.name.trim().toLowerCase();
      if (!general.has(key)) general.set(key, { name: product.name, price: product.price, source: 'product' });
    }
    return { generalSuggestions: Array.from(general.values()), storeSuggestions: Array.from(store.values()) };
  }, [checkoutIds, clearedSalesHistory, products, sales]);

  const handleAdd = useCallback(
    (sale: SaleRecord) => {
      salesContext.addSale(sale);
      const undo = () => {
        const current: SaleRecord[] = JSON.parse(localStorage.getItem('pos_sales') || '[]');
        persistSales(current.filter((s) => s.id !== sale.id));
      };
      notify(`Added ${describeSale(sale)} · ${formatPeso(sale.total)}`, { severity: 'success', action: { label: 'Undo', onClick: undo } });
    },
    [notify, persistSales, salesContext]
  );

  const handleDeleteSale = useCallback(
    (sale: SaleRecord) => {
      const index = sales.findIndex((s) => s.id === sale.id);
      if (index < 0) return;
      persistSales(sales.filter((s) => s.id !== sale.id));
      const undo = () => {
        const restored: SaleRecord[] = JSON.parse(localStorage.getItem('pos_sales') || '[]');
        restored.splice(Math.min(index, restored.length), 0, sale);
        persistSales(restored);
      };
      notify(`Deleted ${describeSale(sale)}`, { severity: 'info', action: { label: 'Undo', onClick: undo } });
    },
    [notify, persistSales, sales]
  );

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

  const clearCurrentSales = (reason: ClearedSalesBatch['reason']) => {
    addToClearedHistory(sales, reason);
    salesContext.setSales([]);
    localStorage.removeItem('pos_sales');
  };

  const handleClearAllSales = () => {
    clearCurrentSales('clear-all');
    setClearDialogOpen(false);
    notify('Sales cleared. You can find them under History.', 'success');
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
    
    notify('Report exported and totals recorded in Gross Sales.', 'success');
  };

  const handleConfirmExport = async () => {
    setExporting(true);
    try {
      await handleExportSales();
      if (clearAfterExport) {
        clearCurrentSales('export-and-clear');
        notify('Report exported, recorded in Gross Sales, and sales moved to History.', 'success');
      }
      setExportDialogOpen(false);
      setClearAfterExport(false);
    } catch (error) {
      console.error('Export failed:', error);
      notify('Export failed. Nothing was recorded or cleared.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const confirmDeleteHistory = () => {
    if (!historyToDelete) return;
    const ids = new Set(historyToDelete);
    setClearedSalesHistory((prev) => prev.filter((h) => !ids.has(h.id)));
    setSelectedHistoryIds((prev) => prev.filter((id) => !ids.has(id)));
    notify(`Deleted ${ids.size} record${ids.size !== 1 ? 's' : ''} from History.`, 'success');
    setHistoryToDelete(null);
  };

  const sortedHistory = useMemo(
    () => [...clearedSalesHistory].sort((a, b) => new Date(b.clearedAt).getTime() - new Date(a.clearedAt).getTime()),
    [clearedSalesHistory]
  );

  const toggleHistorySelection = useCallback((id: string) => {
    setSelectedHistoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const requestDeleteOneHistory = useCallback((batch: ClearedSalesBatch) => setHistoryToDelete([batch.id]), []);

  const historyMonthHeader = (batch: ClearedSalesBatch, index: number) => {
    const label = new Date(batch.clearedAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    const prev = sortedHistory[index - 1];
    const prevLabel = prev ? new Date(prev.clearedAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) : null;
    if (label === prevLabel) return null;
    return (
      <Box key={`month-${label}`} sx={{ px: 2, py: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2">{label}</Typography>
      </Box>
    );
  };

  const allHistorySelected = sortedHistory.length > 0 && selectedHistoryIds.length === sortedHistory.length;
  const { counts } = columns;
  const searching = normalizedSearch !== '';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
        <Box>
          <Typography variant="h5">Sales Record</Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 0
              ? oldestSaleDate
                ? `Current period since ${oldestSaleDate.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${sales.length} entr${sales.length !== 1 ? 'ies' : 'y'}`
                : 'No entries in the current period yet'
              : 'Sales that were cleared or exported, kept for reference'}
          </Typography>
        </Box>
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search all columns  ( / )"
              value={searchQuery}
              inputRef={searchRef}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              sx={{ width: { xs: '100%', sm: 260 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <Button color="error" variant="outlined" onClick={() => setClearDialogOpen(true)} disabled={sales.length === 0}>
              Clear sales
            </Button>
            <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={() => setExportDialogOpen(true)} disabled={sales.length === 0}>
              Export report
            </Button>
          </Box>
        )}
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => {
          setActiveTab(value);
          setSelectedHistoryIds([]);
        }}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Current" />
        <Tab label={`History${clearedSalesHistory.length ? ` · ${clearedSalesHistory.length}` : ''}`} icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      {activeTab === 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
          <SalesColumn
            title="General Sales"
            icon={<SalesIcon />}
            total={summary.general}
            caption={
              <>
                {summary.generalCount} transaction{summary.generalCount !== 1 ? 's' : ''} · Net cash{' '}
                <Box component="strong" sx={{ color: summary.netCash < 0 ? 'error.main' : 'text.primary' }}>
                  {formatPeso(summary.netCash)}
                </Box>{' '}
                after cashier purchases
              </>
            }
            form={<GeneralForm onAdd={handleAdd} suggestions={generalSuggestions} />}
            filter={generalFilter}
            onFilter={(value) => setGeneralFilter(value as GeneralFilter)}
            filters={[
              { value: 'all', label: 'All', count: counts.general.all },
              { value: 'checkout', label: 'Checkouts', count: counts.general.checkout },
              { value: 'manual', label: 'Manual', count: counts.general.manual },
              { value: 'unlisted', label: 'Unlisted', count: counts.general.unlisted },
            ]}
          >
            <ColumnList
              sales={columns.general}
              resetKey={`${generalFilter}|${normalizedSearch}`}
              checkoutIds={checkoutIds}
              onDelete={handleDeleteSale}
              emptyText={searching ? 'No sales match your search.' : 'Basket checkouts and sales you add here show up in this list.'}
            />
          </SalesColumn>

          <SalesColumn
            title="Store Purchases"
            icon={<PurchaseIcon />}
            total={summary.purchases}
            caption={`Cashier ${formatPeso(summary.cashier)} · GCash ${formatPeso(summary.gcash)}`}
            form={<StoreForm onAdd={handleAdd} suggestions={storeSuggestions} />}
            filter={storeFilter}
            onFilter={(value) => setStoreFilter(value as StoreFilter)}
            filters={[
              { value: 'all', label: 'All', count: counts.store.all },
              { value: 'cashier', label: 'Cashier', count: counts.store.cashier },
              { value: 'gcash', label: 'GCash', count: counts.store.gcash },
            ]}
          >
            <ColumnList
              sales={columns.store}
              resetKey={`${storeFilter}|${normalizedSearch}`}
              onDelete={handleDeleteSale}
              emptyText={searching ? 'No purchases match your search.' : 'Restocks and other things bought for the store go here.'}
            />
          </SalesColumn>

          <SalesColumn
            title="Load Sales"
            icon={<LoadIcon />}
            total={summary.load}
            caption={`Globe ${formatPeso(summary.globe)} · Smart ${formatPeso(summary.smart)}`}
            form={<LoadForm onAdd={handleAdd} />}
            filter={loadFilter}
            onFilter={(value) => setLoadFilter(value as LoadFilter)}
            filters={[
              { value: 'all', label: 'All', count: counts.load.all },
              { value: 'globe', label: 'Globe', count: counts.load.globe },
              { value: 'smart', label: 'Smart', count: counts.load.smart },
            ]}
          >
            <ColumnList
              sales={columns.load}
              resetKey={`${loadFilter}|${normalizedSearch}`}
              onDelete={handleDeleteSale}
              emptyText={searching ? 'No load sales match your search.' : 'Globe and Smart load sales go here.'}
            />
          </SalesColumn>
        </Box>
      ) : (
        <Card>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1, minHeight: 56, borderBottom: 1, borderColor: 'divider' }}>
            <Checkbox
              size="small"
              checked={allHistorySelected}
              indeterminate={selectedHistoryIds.length > 0 && !allHistorySelected}
              disabled={sortedHistory.length === 0}
              onChange={(e) => setSelectedHistoryIds(e.target.checked ? sortedHistory.map((h) => h.id) : [])}
              inputProps={{ 'aria-label': 'Select all history records' }}
            />
            <Typography fontWeight={600} sx={{ flex: 1 }}>
              {selectedHistoryIds.length > 0 ? `${selectedHistoryIds.length} selected` : `${sortedHistory.length} record${sortedHistory.length !== 1 ? 's' : ''}`}
            </Typography>
            {selectedHistoryIds.length > 0 && (
              <Button color="error" variant="contained" startIcon={<DeleteIcon />} onClick={() => setHistoryToDelete(selectedHistoryIds)}>
                Delete selected
              </Button>
            )}
          </Box>
          {sortedHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 7, px: 3 }}>
              <HistoryIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
              <Typography fontWeight={600}>No history yet</Typography>
              <Typography variant="body2" color="text.secondary">
                When you clear or export-and-clear sales, they’re kept here.
              </Typography>
            </Box>
          ) : (
            sortedHistory.map((batch, index) => (
              <React.Fragment key={batch.id}>
                {historyMonthHeader(batch, index)}
                <HistoryBatch batch={batch} selected={selectedHistoryIds.includes(batch.id)} onToggle={toggleHistorySelection} onDelete={requestDeleteOneHistory} />
              </React.Fragment>
            ))
          )}
        </Card>
      )}

      {/* Clear dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Clear current sales?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {sales.length} entr{sales.length !== 1 ? 'ies' : 'y'} ({formatPeso(summary.general)} in sales) will be moved to History and the current period
            starts fresh. Export first if you need a report.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setClearDialogOpen(false)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleClearAllSales}>
            Clear sales
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export dialog */}
      <Dialog open={exportDialogOpen} onClose={() => !exporting && setExportDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Export sales report</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Saves an Excel report of the {sales.length} current entr{sales.length !== 1 ? 'ies' : 'y'} and <strong>adds these totals to Gross Sales</strong>.
            Exporting the same period twice records it twice.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.5, mb: 2 }}>
            <Typography variant="body2">General sales</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
              {formatPeso(summary.general)}
            </Typography>
            <Typography variant="body2">Store purchases</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
              {formatPeso(summary.purchases)}
            </Typography>
            <Typography variant="body2">Load sales</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
              {formatPeso(summary.load)}
            </Typography>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={clearAfterExport} onChange={(e) => setClearAfterExport(e.target.checked)} />}
            label="Clear current sales after exporting (kept in History)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={handleConfirmExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete history dialog */}
      <Dialog open={historyToDelete !== null} onClose={() => setHistoryToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {historyToDelete?.length === 1 ? 'this record' : `${historyToDelete?.length ?? 0} records`} from History?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            The cleared sales in {historyToDelete?.length === 1 ? 'it' : 'them'} will be permanently deleted. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setHistoryToDelete(null)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDeleteHistory}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SalesRecord;
