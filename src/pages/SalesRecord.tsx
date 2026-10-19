import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
  Snackbar,
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
import { GrossSalesContext, SaleRecord, SalesContext } from '../App';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

type ClearedSalesBatch = {
  id: string;
  clearedAt: string;
  reason: 'clear-all' | 'export-and-clear';
  sales: SaleRecord[];
};

type EntryKind = 'sale' | 'unlisted' | 'purchase' | 'load';
type Filter = 'all' | 'general' | 'store' | 'load';

const CLEARED_SALES_HISTORY_KEY = 'pos_cleared_sales_history';
const UNLISTED_NAME = 'Unlisted Sales';
const PAGE_SIZE = 60;

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const pad = (value: number) => String(value).padStart(2, '0');
const dayKeyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dayLabel = (dayKey: string) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const full = date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (date.toDateString() === today.toDateString()) return `Today · ${full}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${full}`;
  return full;
};

const loadNetworkOf = (sale: SaleRecord): 'Globe' | 'Smart' | null => {
  const name = (sale.items[0]?.name ?? '').toLowerCase();
  if (name.includes('globe')) return 'Globe';
  if (name.includes('smart')) return 'Smart';
  return null;
};

const describeSale = (sale: SaleRecord) => {
  const items = sale.items;
  if (items.length <= 1) return items[0]?.name ?? '—';
  const shown = items.slice(0, 3).map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name));
  return items.length > 3 ? `${shown.join(', ')} +${items.length - 3} more` : shown.join(', ');
};

const typeLabel = (sale: SaleRecord) => {
  if (sale.type === 'store') return sale.paymentMethod === 'gcash' ? 'Purchase · GCash' : 'Purchase · Cashier';
  if (sale.type === 'load') return `Load · ${loadNetworkOf(sale) ?? 'Other'}`;
  if (sale.items.length === 1 && sale.items[0].name === UNLISTED_NAME) return 'Unlisted sale';
  if (sale.items.length > 1) return `Checkout · ${sale.items.length} items`;
  return 'Sale';
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

const StatTile: React.FC<{ icon: React.ReactElement; label: string; value: number; caption: string; negative?: boolean }> = ({
  icon,
  label,
  value,
  caption,
  negative,
}) => (
  <Card sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '10px',
        display: 'grid',
        placeItems: 'center',
        color: 'primary.main',
        bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
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
    <StatTile
      icon={<SalesIcon />}
      label="Sales"
      value={summary.general}
      caption={`${summary.generalCount} transaction${summary.generalCount !== 1 ? 's' : ''}`}
    />
    <StatTile
      icon={<PurchaseIcon />}
      label="Store purchases"
      value={summary.purchases}
      caption={`Cashier ${formatPeso(summary.cashier)} · GCash ${formatPeso(summary.gcash)}`}
    />
    <StatTile
      icon={<CashIcon />}
      label="Net cash"
      value={summary.netCash}
      negative={summary.netCash < 0}
      caption="Sales minus cashier-paid purchases"
    />
    <StatTile
      icon={<LoadIcon />}
      label="Load sales"
      value={summary.load}
      caption={`Globe ${formatPeso(summary.globe)} · Smart ${formatPeso(summary.smart)}`}
    />
  </Box>
);

const entryButtonLabel: Record<EntryKind, string> = {
  sale: 'Add sale',
  unlisted: 'Add unlisted sale',
  purchase: 'Add purchase',
  load: 'Add load sale',
};

const EntryForm: React.FC<{ onAdd: (sale: SaleRecord, label: string) => void }> = ({ onAdd }) => {
  const [kind, setKind] = useState<EntryKind>('sale');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState<'cashier' | 'gcash'>('cashier');
  const [network, setNetwork] = useState<'globe' | 'smart'>('globe');
  const [error, setError] = useState<{ name?: string; amount?: string }>({});
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const needsName = kind === 'sale' || kind === 'purchase';

  useEffect(() => {
    setError({});
    firstFieldRef.current?.focus();
  }, [kind]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(amount);
    const nextError: typeof error = {};
    if (needsName && !name.trim()) nextError.name = 'Enter a description';
    if (!amount || !Number.isFinite(price) || price <= 0) nextError.amount = 'Enter an amount above zero';
    setError(nextError);
    if (nextError.name || nextError.amount) return;

    const base = { id: Date.now().toString(), date: new Date(), total: price };
    let sale: SaleRecord;
    if (kind === 'sale') {
      sale = { ...base, items: [{ name: name.trim(), quantity: 1, price }], type: 'general' };
    } else if (kind === 'unlisted') {
      sale = { ...base, items: [{ name: UNLISTED_NAME, quantity: 1, price }], type: 'general' };
    } else if (kind === 'purchase') {
      sale = { ...base, items: [{ name: name.trim(), quantity: 1, price }], type: 'store', paymentMethod: payment };
    } else {
      const label = network === 'globe' ? 'Globe' : 'Smart';
      sale = { ...base, items: [{ name: `Load (${label})`, quantity: 1, price }], type: 'load' };
    }
    onAdd(sale, `${typeLabel(sale)} · ${formatPeso(price)}`);
    setName('');
    setAmount('');
    firstFieldRef.current?.focus();
  };

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Add entry
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        color="primary"
        value={kind}
        onChange={(_, value: EntryKind | null) => value && setKind(value)}
        sx={{ mb: 2, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, py: 0.75 } }}
      >
        <ToggleButton value="sale">Sale</ToggleButton>
        <ToggleButton value="unlisted">Unlisted</ToggleButton>
        <ToggleButton value="purchase">Purchase</ToggleButton>
        <ToggleButton value="load">Load</ToggleButton>
      </ToggleButtonGroup>

      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 1.5 }}>
        {kind === 'load' && (
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value={network}
            onChange={(_, value) => value && setNetwork(value)}
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <ToggleButton value="globe">Globe</ToggleButton>
            <ToggleButton value="smart">Smart</ToggleButton>
          </ToggleButtonGroup>
        )}
        {needsName && (
          <TextField
            inputRef={firstFieldRef}
            label={kind === 'purchase' ? 'What was bought' : 'Item or description'}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError((prev) => ({ ...prev, name: undefined }));
            }}
            error={Boolean(error.name)}
            helperText={error.name}
            autoComplete="off"
          />
        )}
        <TextField
          inputRef={needsName ? undefined : firstFieldRef}
          label="Amount"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError((prev) => ({ ...prev, amount: undefined }));
          }}
          type="number"
          error={Boolean(error.amount)}
          helperText={error.amount ?? (kind === 'unlisted' ? `Recorded as “${UNLISTED_NAME}”` : undefined)}
          inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
          InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
        />
        {kind === 'purchase' && (
          <Box>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              color="primary"
              value={payment}
              onChange={(_, value) => value && setPayment(value)}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600 } }}
            >
              <ToggleButton value="cashier">Paid from cashier</ToggleButton>
              <ToggleButton value="gcash">Paid by GCash</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              {payment === 'cashier' ? 'Cashier purchases are subtracted from Net cash.' : 'GCash purchases don’t affect Net cash.'}
            </Typography>
          </Box>
        )}
        <Button type="submit" variant="contained" size="large">
          {entryButtonLabel[kind]}
        </Button>
      </Box>
    </Card>
  );
};

// Plain elements styled by one shared class, so long lists stay light.
const RowRoot = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto 36px',
  alignItems: 'center',
  columnGap: theme.spacing(1.5),
  padding: theme.spacing(1, 1, 1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:hover': { backgroundColor: theme.palette.action.hover },
  '& .row-time': { ...theme.typography.body2, color: theme.palette.text.secondary, display: 'none' },
  '& .row-main': { minWidth: 0 },
  '& .row-title, & .row-meta': { margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  '& .row-title': { ...theme.typography.body2, fontWeight: 600 },
  '& .row-meta': { ...theme.typography.caption, color: theme.palette.text.secondary },
  '& .row-amount': { ...theme.typography.body1, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' },
  '& .row-amount[data-out="true"]': { color: theme.palette.text.secondary },
  '& .row-delete': {
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    padding: 0,
    border: 0,
    borderRadius: 10,
    background: 'transparent',
    color: theme.palette.action.active,
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.palette.action.hover, color: theme.palette.error.main },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}` },
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: '76px minmax(0, 1fr) auto 36px',
    '& .row-time': { display: 'block' },
    '& .row-time-inline': { display: 'none' },
  },
}));

const SaleRow = React.memo(function SaleRow({ sale, onDelete }: { sale: SaleRecord; onDelete?: (sale: SaleRecord) => void }) {
  const time = new Date(sale.date).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const isPurchase = sale.type === 'store';
  return (
    <RowRoot>
      <span className="row-time">{time}</span>
      <div className="row-main">
        <p className="row-title" title={sale.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}>
          {describeSale(sale)}
        </p>
        <p className="row-meta">
          <span className="row-time-inline">{time} · </span>
          {typeLabel(sale)}
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

const DayHeader: React.FC<{ dayKey: string; count: number; total: number; sticky?: boolean }> = ({ dayKey, count, total, sticky }) => (
  <Box
    sx={{
      position: sticky ? 'sticky' : 'static',
      top: 64,
      zIndex: 1,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 2,
      px: 2,
      py: 1,
      bgcolor: 'background.default',
      borderBottom: 1,
      borderColor: 'divider',
    }}
  >
    <Typography variant="subtitle2">{dayLabel(dayKey)}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
      {count} entr{count !== 1 ? 'ies' : 'y'} · sales <strong>{formatPeso(total)}</strong>
    </Typography>
  </Box>
);

// Newest first with a header wherever the day changes; renders `limit` rows.
const SalesList: React.FC<{
  sales: SaleRecord[];
  limit: number;
  onDelete?: (sale: SaleRecord) => void;
  stickyHeaders?: boolean;
}> = ({ sales, limit, onDelete, stickyHeaders }) => {
  const dayTotals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const sale of sales) {
      const key = dayKeyOf(new Date(sale.date));
      const entry = map.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      if (sale.type === 'general') entry.total += sale.total;
      map.set(key, entry);
    }
    return map;
  }, [sales]);

  const rows: React.ReactNode[] = [];
  let currentDay = '';
  for (const sale of sales.slice(0, limit)) {
    const key = dayKeyOf(new Date(sale.date));
    if (key !== currentDay) {
      currentDay = key;
      const totals = dayTotals.get(key) ?? { count: 0, total: 0 };
      rows.push(<DayHeader key={`day-${key}`} dayKey={key} count={totals.count} total={totals.total} sticky={stickyHeaders} />);
    }
    rows.push(<SaleRow key={sale.id} sale={sale} onDelete={onDelete} />);
  }
  return <>{rows}</>;
};

const sortNewestFirst = (sales: SaleRecord[]) =>
  [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));

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
                <SalesList sales={sorted} limit={limit} />
                {limit < sorted.length && (
                  <Box sx={{ textAlign: 'center', py: 1 }}>
                    <Button onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                      Show more ({sorted.length - limit} remaining)
                    </Button>
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

type Toast = { open: boolean; message: string; severity: 'success' | 'info' | 'error'; undo?: () => void };

const SalesRecord: React.FC = () => {
  const salesContext = useContext(SalesContext);
  const grossSalesContext = useContext(GrossSalesContext);
  const sales = salesContext.sales;
  const [snackbar, setSnackbar] = useState<Toast>({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [clearAfterExport, setClearAfterExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string[] | null>(null);

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

  const persistSales = useCallback(
    (next: SaleRecord[]) => {
      salesContext.setSales(next);
      localStorage.setItem('pos_sales', JSON.stringify(next));
    },
    [salesContext]
  );

  const summary = useMemo(() => summarize(sales), [sales]);
  const sortedSales = useMemo(() => sortNewestFirst(sales), [sales]);

  const counts = useMemo(() => {
    const c = { all: sales.length, general: 0, store: 0, load: 0 };
    for (const sale of sales) c[sale.type] += 1;
    return c;
  }, [sales]);

  const deferredSearch = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredSales = useMemo(
    () =>
      sortedSales.filter(
        (sale) =>
          (filter === 'all' || sale.type === filter) &&
          (!normalizedSearch || sale.items.some((item) => item.name.toLowerCase().includes(normalizedSearch)))
      ),
    [filter, normalizedSearch, sortedSales]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, normalizedSearch]);

  const hasMore = visibleCount < filteredSales.length;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisibleCount((count) => count + PAGE_SIZE);
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const oldestSaleDate = sortedSales.length ? new Date(sortedSales[sortedSales.length - 1].date) : null;

  const handleAdd = useCallback(
    (sale: SaleRecord, label: string) => {
      salesContext.addSale(sale);
      setSnackbar({
        open: true,
        message: `Added ${label}`,
        severity: 'success',
        undo: () => persistSales(JSON.parse(localStorage.getItem('pos_sales') || '[]').filter((s: SaleRecord) => s.id !== sale.id)),
      });
    },
    [persistSales, salesContext]
  );

  const handleDeleteSale = useCallback(
    (sale: SaleRecord) => {
      const index = sales.findIndex((s) => s.id === sale.id);
      if (index < 0) return;
      persistSales(sales.filter((s) => s.id !== sale.id));
      setSnackbar({
        open: true,
        message: `Deleted ${describeSale(sale)}`,
        severity: 'info',
        undo: () => {
          const current: SaleRecord[] = JSON.parse(localStorage.getItem('pos_sales') || '[]');
          const restored = [...current];
          restored.splice(Math.min(index, restored.length), 0, sale);
          persistSales(restored);
        },
      });
    },
    [persistSales, sales]
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
    setSnackbar({ open: true, message: 'Sales cleared. You can find them under History.', severity: 'success' });
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
      message: 'Report exported and totals recorded in Gross Sales.',
      severity: 'success',
    });
  };

  const handleConfirmExport = async () => {
    setExporting(true);
    try {
      await handleExportSales();
      if (clearAfterExport) {
        clearCurrentSales('export-and-clear');
        setSnackbar({ open: true, message: 'Report exported, recorded in Gross Sales, and sales moved to History.', severity: 'success' });
      }
      setExportDialogOpen(false);
      setClearAfterExport(false);
    } catch (error) {
      console.error('Export failed:', error);
      setSnackbar({ open: true, message: 'Export failed. Nothing was recorded or cleared.', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const confirmDeleteHistory = () => {
    if (!historyToDelete) return;
    const ids = new Set(historyToDelete);
    setClearedSalesHistory((prev) => prev.filter((h) => !ids.has(h.id)));
    setSelectedHistoryIds((prev) => prev.filter((id) => !ids.has(id)));
    setSnackbar({ open: true, message: `Deleted ${ids.size} record${ids.size !== 1 ? 's' : ''} from History.`, severity: 'success' });
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

  const filterChip = (value: Filter, label: string) => (
    <Chip
      key={value}
      label={`${label} · ${counts[value]}`}
      color={filter === value ? 'primary' : 'default'}
      variant={filter === value ? 'filled' : 'outlined'}
      onClick={() => setFilter(value)}
      sx={{ bgcolor: filter === value ? undefined : 'background.paper' }}
    />
  );

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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 1 }}>
        <Box>
          <Typography variant="h5">Sales Record</Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 0
              ? oldestSaleDate
                ? `Current period since ${oldestSaleDate.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                : 'No entries in the current period yet'
              : 'Sales that were cleared or exported, kept for reference'}
          </Typography>
        </Box>
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
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
        <>
          <SummaryTiles summary={summary} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '340px minmax(0, 1fr)' },
              gap: 2,
              mt: 2,
              alignItems: 'start',
            }}
          >
            <Box sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
              <EntryForm onAdd={handleAdd} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
                {filterChip('all', 'All')}
                {filterChip('general', 'Sales')}
                {filterChip('store', 'Purchases')}
                {filterChip('load', 'Load')}
                <TextField
                  size="small"
                  placeholder="Search items"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ ml: { sm: 'auto' }, width: { xs: '100%', sm: 240 } }}
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
              </Box>

              <Card sx={{ overflow: 'visible' }}>
                {filteredSales.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 7, px: 3 }}>
                    <SalesIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                    <Typography fontWeight={600}>{sales.length === 0 ? 'No entries yet' : 'Nothing matches'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sales.length === 0
                        ? 'Checkouts from the Basket appear here automatically. Use Add entry for anything else.'
                        : 'Try another filter or search term.'}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <SalesList sales={filteredSales} limit={visibleCount} onDelete={handleDeleteSale} stickyHeaders />
                    {hasMore && (
                      <Box ref={sentinelRef} sx={{ textAlign: 'center', py: 1.5 }}>
                        <Button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                          Show more ({(filteredSales.length - visibleCount).toLocaleString()} remaining)
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Card>
            </Box>
          </Box>
        </>
      ) : (
        <Card>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 1,
              minHeight: 56,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Checkbox
              size="small"
              checked={allHistorySelected}
              indeterminate={selectedHistoryIds.length > 0 && !allHistorySelected}
              disabled={sortedHistory.length === 0}
              onChange={(e) => setSelectedHistoryIds(e.target.checked ? sortedHistory.map((h) => h.id) : [])}
              inputProps={{ 'aria-label': 'Select all history records' }}
            />
            <Typography fontWeight={600} sx={{ flex: 1 }}>
              {selectedHistoryIds.length > 0
                ? `${selectedHistoryIds.length} selected`
                : `${sortedHistory.length} record${sortedHistory.length !== 1 ? 's' : ''}`}
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
                <HistoryBatch
                  batch={batch}
                  selected={selectedHistoryIds.includes(batch.id)}
                  onToggle={toggleHistorySelection}
                  onDelete={requestDeleteOneHistory}
                />
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
            {sales.length} entr{sales.length !== 1 ? 'ies' : 'y'} ({formatPeso(summary.general)} in sales) will be moved to History and the
            current period starts fresh. Export first if you need a report.
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
            Saves an Excel report of the {sales.length} current entr{sales.length !== 1 ? 'ies' : 'y'} and{' '}
            <strong>adds these totals to Gross Sales</strong>. Exporting the same period twice records it twice.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.5, mb: 2 }}>
            <Typography variant="body2">Sales</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{formatPeso(summary.general)}</Typography>
            <Typography variant="body2">Store purchases</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{formatPeso(summary.purchases)}</Typography>
            <Typography variant="body2">Load sales</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{formatPeso(summary.load)}</Typography>
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
        <DialogTitle>
          Delete {historyToDelete?.length === 1 ? 'this record' : `${historyToDelete?.length ?? 0} records`} from History?
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">The cleared sales in {historyToDelete?.length === 1 ? 'it' : 'them'} will be permanently deleted. This cannot be undone.</Typography>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.undo ? 5000 : 3000}
        onClose={(_, reason) => reason !== 'clickaway' && setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', alignItems: 'center' }}
          action={
            snackbar.undo ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  snackbar.undo?.();
                  setSnackbar((s) => ({ ...s, open: false, undo: undefined }));
                }}
              >
                Undo
              </Button>
            ) : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesRecord;
