import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { ReceiptRecord, SalesContext, StoreSettingsContext } from '../App';
import { usePrinter } from '../contexts/PrinterContext';

type Receipt = ReceiptRecord;

// Receipts sorted newest first, with the values the list filters and groups on
// computed once instead of on every render.
type IndexedReceipt = {
  receipt: Receipt;
  time: number;
  monthKey: string; // YYYY-MM
  dayKey: string; // YYYY-MM-DD
  searchText: string;
};

type PendingDelete = { ids: string[]; title: string; message: string };

const PAGE_SIZE = 60;
const ALL_MONTHS = 'all';

const pad = (value: number) => String(value).padStart(2, '0');

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const monthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
};

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

const itemsSummary = (items: Receipt['items']) => {
  const shown = items.slice(0, 3).map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name));
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ');
};

const shortId = (id: string) => id.slice(-6);

const getReceiptQrData = (receipt: Receipt) => receipt.qrData || `DISPLAY-${receipt.id}`;

const buildDisplayQrMatrix = (value: string, size = 21) => {
  const normalized = value || 'DISPLAY-QR';
  let seed = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    seed = (seed * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const currentRow: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const inFinderTopLeft = row < 7 && col < 7;
      const inFinderTopRight = row < 7 && col >= size - 7;
      const inFinderBottomLeft = row >= size - 7 && col < 7;

      if (inFinderTopLeft || inFinderTopRight || inFinderBottomLeft) {
        const finderRow = row < 7 ? row : row - (size - 7);
        const finderCol = col < 7 ? col : col - (size - 7);
        const isOuter = finderRow === 0 || finderRow === 6 || finderCol === 0 || finderCol === 6;
        const isInner = finderRow >= 2 && finderRow <= 4 && finderCol >= 2 && finderCol <= 4;
        currentRow.push(isOuter || isInner);
      } else {
        currentRow.push((seed & 1) === 1);
      }
    }
    matrix.push(currentRow);
  }

  return matrix;
};

const ReceiptQrPreview: React.FC<{ value: string }> = ({ value }) => {
  const matrix = useMemo(() => buildDisplayQrMatrix(value), [value]);
  const size = matrix.length;

  return (
    <Box sx={{ width: 168, height: 168, p: 1, mx: 'auto', bgcolor: '#fff', borderRadius: '10px', border: 1, borderColor: 'divider' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" shapeRendering="crispEdges" aria-label="Receipt QR code">
        {matrix.flatMap((row, y) => row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" /> : null)))}
      </svg>
    </Box>
  );
};

// Rows are plain elements styled by one shared class, so a long list doesn't pay
// for a dozen MUI components (ripples, tooltips, per-element styles) per receipt.
const RowRoot = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: theme.spacing(1.5),
  padding: theme.spacing(1, 1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  '&:hover': { backgroundColor: theme.palette.action.hover },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
  '&[data-selected="true"]': {
    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07),
  },
  '& .row-check': {
    justifySelf: 'center',
    width: 18,
    height: 18,
    margin: 0,
    cursor: 'pointer',
    accentColor: theme.palette.primary.main,
  },
  '& .row-time, & .row-type-cell': { display: 'none' },
  '& .row-time': { ...theme.typography.body2, color: theme.palette.text.secondary },
  '& .row-main': { minWidth: 0 },
  '& .row-summary, & .row-meta': { margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  '& .row-summary': { ...theme.typography.body2, fontWeight: 600 },
  '& .row-meta': { ...theme.typography.caption, color: theme.palette.text.secondary },
  '& .row-type': {
    ...theme.typography.caption,
    display: 'inline-block',
    fontWeight: 600,
    textTransform: 'capitalize',
    padding: '1px 8px',
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
  },
  '& .row-total': { ...theme.typography.body1, fontWeight: 700, textAlign: 'right' },
  '& .row-actions': { display: 'none', justifyContent: 'flex-end' },
  '& .row-actions button': {
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
    '&:hover': { backgroundColor: theme.palette.action.hover },
    '&:disabled': { color: theme.palette.action.disabled, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}` },
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: '40px 84px minmax(0, 1fr) auto 120px 76px',
    '& .row-time, & .row-type-cell': { display: 'block' },
    '& .row-time-inline': { display: 'none' },
    '& .row-actions': { display: 'flex' },
  },
}));

type ReceiptRowProps = {
  entry: IndexedReceipt;
  selected: boolean;
  printing: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onOpen: (receipt: Receipt) => void;
  onPrint: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
};

const ReceiptRow = React.memo(function ReceiptRow({ entry, selected, printing, onToggle, onOpen, onPrint, onDelete }: ReceiptRowProps) {
  const { receipt } = entry;
  const time = new Date(entry.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const label = shortId(receipt.id);

  return (
    <RowRoot
      role="button"
      tabIndex={0}
      data-selected={selected}
      onClick={() => onOpen(receipt)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(receipt);
      }}
    >
      <input
        type="checkbox"
        className="row-check"
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onToggle(receipt.id, e.target.checked)}
        aria-label={`Select receipt ${label}`}
      />
      <span className="row-time">{time}</span>
      <div className="row-main">
        <p className="row-summary" title={receipt.items.map((i) => i.name).join(', ')}>
          {itemsSummary(receipt.items) || 'No items'}
        </p>
        <p className="row-meta">
          <span className="row-time-inline">{time} · </span>#{label} · {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="row-type-cell">{receipt.type !== 'general' && <span className="row-type">{receipt.type}</span>}</div>
      <span className="row-total">{formatPeso(receipt.total)}</span>
      <div className="row-actions">
        <button
          type="button"
          title="Print"
          aria-label={`Print receipt ${label}`}
          disabled={printing}
          onClick={(e) => {
            e.stopPropagation();
            onPrint(receipt);
          }}
        >
          <PrintIcon fontSize="small" />
        </button>
        <button
          type="button"
          title="Delete"
          aria-label={`Delete receipt ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(receipt);
          }}
        >
          <DeleteIcon fontSize="small" />
        </button>
      </div>
    </RowRoot>
  );
});

const Receipts: React.FC = () => {
  const { receipts, deleteReceipts } = useContext(SalesContext);
  const storeSettings = useContext(StoreSettingsContext);
  const { printReceipt } = usePrinter();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | Receipt['type']>('all');
  // null = follow the newest month that has receipts
  const [period, setPeriod] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openReceipt, setOpenReceipt] = useState<Receipt | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const deferredSearch = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const indexed = useMemo<IndexedReceipt[]>(() => {
    const list = receipts.map((receipt) => {
      const date = new Date(receipt.date);
      const time = Number.isNaN(date.getTime()) ? 0 : date.getTime();
      const monthKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
      return {
        receipt,
        time,
        monthKey,
        dayKey: `${monthKey}-${pad(date.getDate())}`,
        searchText: `${receipt.id} ${receipt.items.map((item) => item.name).join(' ')}`.toLowerCase(),
      };
    });
    list.sort((a, b) => b.time - a.time || b.receipt.id.localeCompare(a.receipt.id));
    return list;
  }, [receipts]);

  const months = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of indexed) counts.set(entry.monthKey, (counts.get(entry.monthKey) ?? 0) + 1);
    return Array.from(counts, ([key, count]) => ({ key, count })); // already newest first
  }, [indexed]);

  const activePeriod =
    period === ALL_MONTHS || (period && months.some((m) => m.key === period)) ? period : months[0]?.key ?? ALL_MONTHS;

  const filtered = useMemo(
    () =>
      indexed.filter(
        (entry) =>
          (activePeriod === ALL_MONTHS || entry.monthKey === activePeriod) &&
          (filterType === 'all' || entry.receipt.type === filterType) &&
          (!normalizedSearch || entry.searchText.includes(normalizedSearch))
      ),
    [activePeriod, filterType, indexed, normalizedSearch]
  );

  const { filteredTotal, dayTotals } = useMemo(() => {
    const totals = new Map<string, { count: number; total: number }>();
    let sum = 0;
    for (const entry of filtered) {
      sum += entry.receipt.total;
      const day = totals.get(entry.dayKey);
      if (day) {
        day.count += 1;
        day.total += entry.receipt.total;
      } else {
        totals.set(entry.dayKey, { count: 1, total: entry.receipt.total });
      }
    }
    return { filteredTotal: sum, dayTotals: totals };
  }, [filtered]);

  // Start from the top whenever the filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activePeriod, filterType, normalizedSearch]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Load the next batch when the end of the list scrolls into view
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

  const selectedInView = useMemo(() => filtered.reduce((n, e) => n + (selectedIds.has(e.receipt.id) ? 1 : 0), 0), [filtered, selectedIds]);
  const allInViewSelected = filtered.length > 0 && selectedInView === filtered.length;

  const toggleSelected = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllInView = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const entry of filtered) {
        if (checked) next.add(entry.receipt.id);
        else next.delete(entry.receipt.id);
      }
      return next;
    });
  };

  const handlePrint = useCallback(
    async (receipt: Receipt) => {
      setPrintingId(receipt.id);
      try {
        const success = await printReceipt({
          ...receipt,
          storeName: storeSettings?.storeName || 'Ken-dal Store',
          storeAddress: storeSettings?.storeAddress || '123 Main Street, City',
          birNumber: storeSettings?.birNumber || '',
          qrData: getReceiptQrData(receipt),
        });
        setSnackbar(
          success
            ? { open: true, message: 'Receipt printed.', severity: 'success' }
            : { open: true, message: 'Failed to print receipt. Check the printer connection.', severity: 'error' }
        );
      } catch (error) {
        console.error('Error printing receipt:', error);
        setSnackbar({ open: true, message: 'Something went wrong while printing.', severity: 'error' });
      } finally {
        setPrintingId(null);
      }
    },
    [printReceipt, storeSettings]
  );

  const requestDeleteOne = useCallback((receipt: Receipt) => {
    setPendingDelete({
      ids: [receipt.id],
      title: 'Delete receipt?',
      message: `Receipt #${shortId(receipt.id)} (${formatPeso(receipt.total)}) will be permanently deleted.`,
    });
  }, []);

  const requestDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    setPendingDelete({
      ids,
      title: `Delete ${ids.length} selected receipt${ids.length !== 1 ? 's' : ''}?`,
      message: 'The selected receipts will be permanently deleted. This cannot be undone.',
    });
  };

  const requestDeleteMonth = () => {
    const ids = indexed.filter((e) => e.monthKey === activePeriod).map((e) => e.receipt.id);
    setPendingDelete({
      ids,
      title: `Delete all receipts from ${monthLabel(activePeriod)}?`,
      message: `All ${ids.length} receipt${ids.length !== 1 ? 's' : ''} from ${monthLabel(activePeriod)} will be permanently deleted. This cannot be undone.`,
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { ids } = pendingDelete;
    deleteReceipts(ids);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (openReceipt && ids.includes(openReceipt.id)) setOpenReceipt(null);
    setSnackbar({ open: true, message: `Deleted ${ids.length} receipt${ids.length !== 1 ? 's' : ''}.`, severity: 'success' });
    setPendingDelete(null);
  };

  const filtersActive = normalizedSearch !== '' || filterType !== 'all';
  const periodName = activePeriod === ALL_MONTHS ? 'all months' : monthLabel(activePeriod);

  // Day headers are inserted wherever the day changes in the (newest-first) list
  const rows: React.ReactNode[] = [];
  let currentDay = '';
  for (const entry of visible) {
    if (entry.dayKey !== currentDay) {
      currentDay = entry.dayKey;
      const totals = dayTotals.get(entry.dayKey);
      rows.push(
        <Box
          key={`day-${entry.dayKey}`}
          sx={{
            position: 'sticky',
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
          <Typography variant="subtitle2">{dayLabel(entry.dayKey)}</Typography>
          {totals && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {totals.count} receipt{totals.count !== 1 ? 's' : ''} · <strong>{formatPeso(totals.total)}</strong>
            </Typography>
          )}
        </Box>
      );
    }
    rows.push(
      <ReceiptRow
        key={entry.receipt.id}
        entry={entry}
        selected={selectedIds.has(entry.receipt.id)}
        printing={printingId === entry.receipt.id}
        onToggle={toggleSelected}
        onOpen={setOpenReceipt}
        onPrint={handlePrint}
        onDelete={requestDeleteOne}
      />
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5">Receipts</Typography>
          <Typography variant="body2" color="text.secondary">
            {receipts.length.toLocaleString()} receipt{receipts.length !== 1 ? 's' : ''} on record · newest first
          </Typography>
        </Box>
        {activePeriod !== ALL_MONTHS && !filtersActive && filtered.length > 0 && (
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={requestDeleteMonth}>
            Delete {monthLabel(activePeriod)}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 240px 170px' }, gap: 1.5, mb: 2 }}>
        <TextField
          placeholder="Search by receipt # or item name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
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
          }}
        />
        <FormControl>
          <InputLabel id="receipts-period">Month</InputLabel>
          <Select
            labelId="receipts-period"
            label="Month"
            value={activePeriod}
            onChange={(e) => setPeriod(e.target.value)}
            renderValue={(value) => (value === ALL_MONTHS ? 'All months' : monthLabel(value))}
            MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
          >
            <MenuItem value={ALL_MONTHS}>
              All months
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 'auto', pl: 2 }}>
                {indexed.length.toLocaleString()}
              </Typography>
            </MenuItem>
            {months.map((month) => (
              <MenuItem key={month.key} value={month.key}>
                {monthLabel(month.key)}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 'auto', pl: 2 }}>
                  {month.count.toLocaleString()}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <InputLabel id="receipts-type">Type</InputLabel>
          <Select
            labelId="receipts-type"
            label="Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          >
            <MenuItem value="all">All types</MenuItem>
            <MenuItem value="general">General</MenuItem>
            <MenuItem value="store">Store</MenuItem>
            <MenuItem value="load">Load</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card sx={{ overflow: 'visible' }}>
        {/* List header: selection and totals for everything matching the filters */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 56,
            bgcolor: selectedIds.size > 0 ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.06) : 'transparent',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        >
          <Checkbox
            size="small"
            checked={allInViewSelected}
            indeterminate={selectedInView > 0 && !allInViewSelected}
            disabled={filtered.length === 0}
            onChange={(e) => toggleAllInView(e.target.checked)}
            inputProps={{ 'aria-label': 'Select all receipts in view' }}
          />
          {selectedIds.size > 0 ? (
            <>
              <Typography fontWeight={600} sx={{ flex: 1 }}>
                {selectedIds.size.toLocaleString()} selected
              </Typography>
              <Button color="inherit" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button color="error" variant="contained" startIcon={<DeleteIcon />} onClick={requestDeleteSelected}>
                Delete selected
              </Button>
            </>
          ) : (
            <>
              <Typography fontWeight={600} sx={{ flex: 1 }}>
                {filtered.length.toLocaleString()} receipt{filtered.length !== 1 ? 's' : ''}
                <Typography component="span" color="text.secondary" fontWeight={400}>
                  {' '}in {periodName}
                </Typography>
              </Typography>
              <Typography fontWeight={700} sx={{ pr: 1 }}>
                {formatPeso(filteredTotal)}
              </Typography>
            </>
          )}
        </Box>

        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            {receipts.length === 0 ? (
              <>
                <Typography fontWeight={600}>No receipts yet</Typography>
                <Typography variant="body2" color="text.secondary">
                  Receipts appear here after each sale.
                </Typography>
              </>
            ) : (
              <>
                <Typography fontWeight={600}>No receipts match in {periodName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Try a different search, or look through every month.
                </Typography>
                {activePeriod !== ALL_MONTHS && (
                  <Button variant="outlined" onClick={() => setPeriod(ALL_MONTHS)}>
                    Search all months
                  </Button>
                )}
              </>
            )}
          </Box>
        ) : (
          <Box>
            {rows}
            {hasMore && (
              <Box ref={sentinelRef} sx={{ textAlign: 'center', py: 2 }}>
                <Button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                  Show more ({(filtered.length - visibleCount).toLocaleString()} remaining)
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* Receipt Detail Dialog */}
      <Dialog open={openReceipt !== null} onClose={() => setOpenReceipt(null)} maxWidth="md" fullWidth>
        {openReceipt && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pr: 1.5 }}>
              <Box>
                Receipt #{shortId(openReceipt.id)}
                <Typography variant="body2" color="text.secondary">
                  {new Date(openReceipt.date).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' })}
                </Typography>
              </Box>
              <IconButton aria-label="Close" onClick={() => setOpenReceipt(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 240px' }, gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {openReceipt.items.length} item{openReceipt.items.length !== 1 ? 's' : ''}
                  </Typography>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }}>
                    {openReceipt.items.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          gap: 2,
                          px: 2,
                          py: 1.25,
                          '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600}>{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.quantity} × {formatPeso(item.price)}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700}>{formatPeso(item.quantity * item.price)}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.75 }}>
                    <Typography color="text.secondary">Total</Typography>
                    <Typography variant="h6" sx={{ textAlign: 'right' }}>
                      {formatPeso(openReceipt.total)}
                    </Typography>
                    <Typography color="text.secondary">Cash received</Typography>
                    <Typography sx={{ textAlign: 'right' }}>{formatPeso(openReceipt.customerMoney ?? openReceipt.total)}</Typography>
                    <Typography color="text.secondary">Change</Typography>
                    <Typography sx={{ textAlign: 'right' }} color="success.main" fontWeight={700}>
                      {formatPeso(openReceipt.change ?? 0)}
                    </Typography>
                    <Typography color="text.secondary">Type</Typography>
                    <Typography sx={{ textAlign: 'right', textTransform: 'capitalize' }}>{openReceipt.type}</Typography>
                  </Box>
                </Box>
                <Box>
                  <ReceiptQrPreview value={getReceiptQrData(openReceipt)} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1, textAlign: 'center', fontFamily: 'monospace', wordBreak: 'break-all' }}
                  >
                    {getReceiptQrData(openReceipt)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button color="error" startIcon={<DeleteIcon />} onClick={() => requestDeleteOne(openReceipt)} sx={{ mr: 'auto' }}>
                Delete
              </Button>
              <Button color="inherit" onClick={() => setOpenReceipt(null)}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => handlePrint(openReceipt)}
                disabled={printingId !== null}
              >
                {printingId === openReceipt.id ? 'Printing…' : 'Print receipt'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{pendingDelete?.title}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{pendingDelete?.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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

export default Receipts;
