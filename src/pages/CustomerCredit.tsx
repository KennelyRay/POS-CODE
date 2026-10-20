import React, { useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircleRounded as SettledIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  FileDownloadOutlined as ExportIcon,
  FileUploadOutlined as ImportIcon,
  HourglassBottom as OldestIcon,
  KeyboardArrowDown as ArrowDownIcon,
  PaymentsOutlined as CollectedIcon,
  PeopleOutline as PeopleIcon,
  PersonRemoveOutlined as RemoveCustomerIcon,
  ReceiptLongOutlined as OutstandingIcon,
  Search as SearchIcon,
  TableChartOutlined as CsvIcon,
  DataObject as BackupIcon,
} from '@mui/icons-material';
import { SaleRecord, SalesContext } from '../App';
import { saveAs } from 'file-saver';
import { useNotify } from '../contexts/NotificationContext';

interface CreditRecord {
  id: string;
  date: Date;
  amount: number;
  description: string;
  status: 'paid' | 'unpaid';
}

type Credits = { [customer: string]: CreditRecord[] };
type CustomerFilter = 'all' | 'owing' | 'settled';
type CustomerSort = 'balance' | 'name' | 'recent';
type RecordTab = 'unpaid' | 'paid' | 'all';

const STORAGE_KEY = 'customerCredits';
const DAY_MS = 24 * 60 * 60 * 1000;
const AVATAR_COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be185d', '#1d4ed8', '#15803d', '#c2410c', '#0e7490'];

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const formatDate = (date: Date) => date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const daysSince = (date: Date) => Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
const agoLabel = (days: number) => (days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('') || '?';

const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const parseAmount = (value: string) => {
  const amount = Number(value);
  return value.trim() !== '' && Number.isFinite(amount) && amount > 0 ? amount : null;
};

const reviveCredits = (raw: any): Credits => {
  const converted: Credits = {};
  Object.keys(raw).forEach((customer) => {
    converted[customer] = raw[customer].map((credit: any) => ({ ...credit, date: new Date(credit.date) }));
  });
  return converted;
};

const summarizeCustomer = (records: CreditRecord[]) => {
  let balance = 0;
  let unpaidCount = 0;
  let oldestUnpaid: Date | null = null;
  let lastActivity: Date | null = null;
  for (const credit of records) {
    if (credit.status === 'unpaid') {
      balance += credit.amount;
      unpaidCount += 1;
      if (!oldestUnpaid || credit.date < oldestUnpaid) oldestUnpaid = credit.date;
    }
    if (!lastActivity || credit.date > lastActivity) lastActivity = credit.date;
  }
  return { balance, unpaidCount, oldestUnpaid, lastActivity, count: records.length };
};

type CustomerSummary = ReturnType<typeof summarizeCustomer> & { name: string };

// Sales logged by payments are removed again when a payment is undone
const removeSaleById = (salesContext: React.ContextType<typeof SalesContext>, saleId: string) => {
  const current: SaleRecord[] = JSON.parse(localStorage.getItem('pos_sales') || '[]');
  const next = current.filter((sale) => sale.id !== saleId);
  salesContext.setSales(next);
  localStorage.setItem('pos_sales', JSON.stringify(next));
};

const CustomerAvatar: React.FC<{ name: string; size?: number }> = ({ name, size = 40 }) => (
  <Box
    aria-hidden
    sx={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      bgcolor: avatarColor(name),
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.38,
      letterSpacing: '0.02em',
    }}
  >
    {initials(name)}
  </Box>
);

const StatTile: React.FC<{ icon: React.ReactElement; label: string; value: string; caption: string; tone?: 'error' | 'success' | 'default' }> = ({
  icon,
  label,
  value,
  caption,
  tone = 'default',
}) => (
  <Card sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '10px',
        display: { xs: 'none', sm: 'grid' },
        placeItems: 'center',
        color: tone === 'default' ? 'primary.main' : `${tone}.main`,
        bgcolor: (t) => alpha(tone === 'default' ? t.palette.primary.main : t.palette[tone].main, t.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" color={tone === 'error' ? 'error.main' : 'text.primary'} sx={{ lineHeight: 1.3, fontSize: { xs: '1.125rem', sm: '1.375rem' }, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.4 }}>
        {caption}
      </Typography>
    </Box>
  </Card>
);

const CustomerCredit: React.FC = () => {
  const salesContext = useContext(SalesContext);
  const notify = useNotify();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));

  const [credits, setCredits] = useState<Credits>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>('all');
  const [sort, setSort] = useState<CustomerSort>('balance');
  const [recordTab, setRecordTab] = useState<RecordTab>('unpaid');
  const [exportMenu, setExportMenu] = useState<HTMLElement | null>(null);

  // quick add on the customer panel
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickError, setQuickError] = useState<string>();
  const quickAmountRef = useRef<HTMLInputElement | null>(null);

  // dialogs
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAmount, setNewCustomerAmount] = useState('');
  const [newCustomerDescription, setNewCustomerDescription] = useState('');
  const [addCustomerError, setAddCustomerError] = useState<string>();
  const [editing, setEditing] = useState<{ customer: string; credit: CreditRecord } | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [collectFor, setCollectFor] = useState<string | null>(null);
  const [removeCustomer, setRemoveCustomer] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ credits: Credits; exportDate?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setCredits(reviveCredits(JSON.parse(saved)));
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  }, []);

  const saveCredits = (next: Credits) => {
    setCredits(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  // ---------- derived data ----------

  const summaries = useMemo<CustomerSummary[]>(
    () => Object.keys(credits).map((name) => ({ name, ...summarizeCustomer(credits[name]) })),
    [credits]
  );

  const stats = useMemo(() => {
    let outstanding = 0;
    let collected = 0;
    let unpaidRecords = 0;
    let paidRecords = 0;
    let oldest: { name: string; date: Date } | null = null;
    for (const s of summaries) {
      outstanding += s.balance;
      unpaidRecords += s.unpaidCount;
      if (s.oldestUnpaid && (!oldest || s.oldestUnpaid < oldest.date)) oldest = { name: s.name, date: s.oldestUnpaid };
    }
    for (const records of Object.values(credits)) {
      for (const credit of records) {
        if (credit.status === 'paid') {
          collected += credit.amount;
          paidRecords += 1;
        }
      }
    }
    const owing = summaries.filter((s) => s.balance > 0).length;
    return { outstanding, collected, unpaidRecords, paidRecords, owing, oldest };
  }, [credits, summaries]);

  const deferredSearch = useDeferredValue(searchQuery);
  const query = deferredSearch.trim().toLowerCase();

  const counts = useMemo(
    () => ({
      all: summaries.length,
      owing: summaries.filter((s) => s.balance > 0).length,
      settled: summaries.filter((s) => s.balance === 0).length,
    }),
    [summaries]
  );

  const visibleCustomers = useMemo(() => {
    const list = summaries.filter((s) => {
      if (customerFilter === 'owing' && s.balance <= 0) return false;
      if (customerFilter === 'settled' && s.balance > 0) return false;
      if (!query) return true;
      return s.name.toLowerCase().includes(query) || credits[s.name].some((c) => c.description.toLowerCase().includes(query));
    });
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'recent') return (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0);
      return b.balance - a.balance || a.name.localeCompare(b.name);
    });
    return list;
  }, [credits, customerFilter, query, sort, summaries]);

  // Keep a customer selected on wide screens; drop the selection if it was removed
  useEffect(() => {
    if (selected && !credits[selected]) setSelected(null);
    else if (!selected && wide && visibleCustomers.length > 0) setSelected(visibleCustomers[0].name);
  }, [credits, selected, visibleCustomers, wide]);

  const selectedSummary = summaries.find((s) => s.name === selected) ?? null;
  const selectedRecords = useMemo(() => {
    if (!selected || !credits[selected]) return [];
    return [...credits[selected]]
      .filter((c) => recordTab === 'all' || c.status === recordTab)
      .sort((a, b) => (a.status === b.status ? b.date.getTime() - a.date.getTime() : a.status === 'unpaid' ? -1 : 1));
  }, [credits, recordTab, selected]);

  const selectCustomer = (name: string) => {
    setSelected(name);
    setRecordTab(summarizeCustomer(credits[name]).unpaidCount > 0 ? 'unpaid' : 'all');
    setQuickAmount('');
    setQuickDescription('');
    setQuickError(undefined);
  };

  // ---------- actions ----------

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustomerName.trim();
    if (!name) return setAddCustomerError('Enter the customer’s name');
    const existing = Object.keys(credits).find((n) => n.toLowerCase() === name.toLowerCase());
    if (existing) return setAddCustomerError(`“${existing}” is already on the list`);
    const firstAmount = newCustomerAmount.trim() === '' ? null : parseAmount(newCustomerAmount);
    if (newCustomerAmount.trim() !== '' && firstAmount === null) return setAddCustomerError('The first credit amount must be above zero');

    const records: CreditRecord[] = firstAmount
      ? [{ id: Date.now().toString(), date: new Date(), amount: firstAmount, description: newCustomerDescription.trim() || 'Credit purchase', status: 'unpaid' }]
      : [];
    saveCredits({ ...credits, [name]: records });
    setAddCustomerOpen(false);
    setNewCustomerName('');
    setNewCustomerAmount('');
    setNewCustomerDescription('');
    setAddCustomerError(undefined);
    setSelected(name);
    setRecordTab(firstAmount ? 'unpaid' : 'all');
    notify(firstAmount ? `Added ${name} with ${formatPeso(firstAmount)} on credit` : `Added ${name}`, 'success');
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amount = parseAmount(quickAmount);
    if (amount === null) return setQuickError('Enter an amount above zero');
    const credit: CreditRecord = {
      id: Date.now().toString(),
      date: new Date(),
      amount,
      description: quickDescription.trim() || 'Credit purchase',
      status: 'unpaid',
    };
    saveCredits({ ...credits, [selected]: [...credits[selected], credit] });
    setQuickAmount('');
    setQuickDescription('');
    setQuickError(undefined);
    setRecordTab('unpaid');
    quickAmountRef.current?.focus();
    notify(`${formatPeso(amount)} added to ${selected}’s credit`, 'success');
  };

  const openEdit = (customer: string, credit: CreditRecord) => {
    setEditing({ customer, credit });
    setEditAmount(String(credit.amount));
    setEditDescription(credit.description);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const amount = parseAmount(editAmount);
    if (amount === null) return;
    const { customer, credit } = editing;
    saveCredits({
      ...credits,
      [customer]: credits[customer].map((c) => (c.id === credit.id ? { ...c, amount, description: editDescription.trim() || 'Credit purchase' } : c)),
    });
    setEditing(null);
    notify('Credit updated', 'success');
  };

  // Deleting the last record keeps the customer; removing a customer is its own action.
  const handleDeleteCredit = (customer: string, credit: CreditRecord) => {
    const index = credits[customer].findIndex((c) => c.id === credit.id);
    saveCredits({ ...credits, [customer]: credits[customer].filter((c) => c.id !== credit.id) });
    const undo = () => {
      setCredits((current) => {
        const list = [...(current[customer] ?? [])];
        list.splice(Math.min(index, list.length), 0, credit);
        const next = { ...current, [customer]: list };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    };
    notify(`Deleted “${credit.description}” (${formatPeso(credit.amount)})`, { severity: 'info', action: { label: 'Undo', onClick: undo } });
  };

  // Marks credits paid and logs them as a General sale; Undo reverses both.
  const recordPayment = (customer: string, paid: CreditRecord[], sale: SaleRecord, message: string) => {
    const paidIds = new Set(paid.map((c) => c.id));
    saveCredits({ ...credits, [customer]: credits[customer].map((c) => (paidIds.has(c.id) ? { ...c, status: 'paid' } : c)) });
    salesContext.addSale(sale);
    const undo = () => {
      setCredits((current) => {
        const next = {
          ...current,
          [customer]: (current[customer] ?? []).map((c) => (paidIds.has(c.id) ? { ...c, status: 'unpaid' as const } : c)),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      removeSaleById(salesContext, sale.id);
    };
    notify(message, { severity: 'success', action: { label: 'Undo', onClick: undo } });
  };

  // The sale is dated today, when the money comes in, however old the credit is
  const handleMarkPaid = (customer: string, credit: CreditRecord) => {
    recordPayment(
      customer,
      [credit],
      {
        id: Date.now().toString(),
        date: new Date(),
        items: [{ name: `${customer}-Paid`, quantity: 1, price: credit.amount }],
        total: credit.amount,
        type: 'general',
      },
      `${formatPeso(credit.amount)} from ${customer} recorded as a sale`
    );
  };

  const confirmCollectAll = () => {
    if (!collectFor) return;
    const customer = collectFor;
    const unpaid = credits[customer].filter((c) => c.status === 'unpaid');
    const total = unpaid.reduce((sum, c) => sum + c.amount, 0);
    recordPayment(
      customer,
      unpaid,
      {
        id: Date.now().toString(),
        date: new Date(),
        items: unpaid.map((c) => ({ name: `${customer}-${c.description}`, quantity: 1, price: c.amount })),
        total,
        type: 'general',
      },
      `Collected ${formatPeso(total)} from ${customer}`
    );
    setCollectFor(null);
    setRecordTab('all');
  };

  const confirmRemoveCustomer = () => {
    if (!removeCustomer) return;
    const { [removeCustomer]: removed, ...rest } = credits;
    saveCredits(rest);
    const name = removeCustomer;
    setRemoveCustomer(null);
    const undo = () => {
      setCredits((current) => {
        const next = { ...current, [name]: removed };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setSelected(name);
    };
    notify(`Removed ${name}`, { severity: 'info', action: { label: 'Undo', onClick: undo } });
  };

  // ---------- import / export ----------

  const handleExportCredits = () => {
    setExportMenu(null);
    const exportData: string[] = [];
    Object.keys(credits).forEach((customer) => {
      credits[customer].forEach((credit) => {
        const formattedDate = new Date(credit.date).toISOString().split('T')[0];
        exportData.push(`"${customer}","${credit.description}",${credit.amount},${formattedDate},${credit.status}`);
      });
    });
    if (exportData.length === 0) {
      notify('No credit records to export yet', 'warning');
      return;
    }
    const csvContent = ['Customer,Product,Amount,Date,Status', ...exportData].join('\n');
    saveAs(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `customer_credits_${new Date().toISOString().split('T')[0]}.csv`);
    notify('Credit records exported as CSV', 'success');
  };

  const handleExportFullBackup = () => {
    setExportMenu(null);
    const backupData = { credits, exportDate: new Date().toISOString(), version: '1.0' };
    const dataBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    saveAs(dataBlob, `customer_credits_backup_${new Date().toISOString().split('T')[0]}.json`);
    notify('Full backup saved', 'success');
  };

  const handleImportCredits = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'json') {
      // A backup replaces everything, so it's confirmed first
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.credits) setPendingRestore({ credits: reviveCredits(data.credits), exportDate: data.exportDate });
          else notify('That file isn’t a credit backup', 'error');
        } catch (error) {
          notify('Couldn’t read the backup file', 'error');
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n').map((line) => line.trim()).filter((line) => line);
          if (lines.length === 0) {
            notify('The CSV file is empty', 'error');
            return;
          }
          const hasHeader =
            lines[0].toLowerCase().includes('customer') && lines[0].toLowerCase().includes('product') && lines[0].toLowerCase().includes('amount');
          const dataLines = hasHeader ? lines.slice(1) : lines;
          const importedCredits: Credits = {};
          let importedCount = 0;
          dataLines.forEach((line) => {
            const parts = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
            if (parts.length >= 5) {
              const [customer, product, amountText, dateStr, status] = parts;
              const amount = Number(amountText) || 0;
              if (customer && product && amount > 0 && dateStr) {
                const credit: CreditRecord = {
                  id: Date.now().toString() + Math.random(),
                  date: new Date(dateStr),
                  amount,
                  description: product,
                  status: status === 'paid' || status === 'unpaid' ? status : 'unpaid',
                };
                if (!importedCredits[customer]) importedCredits[customer] = [];
                importedCredits[customer].push(credit);
                importedCount++;
              }
            }
          });
          if (importedCount > 0) {
            const mergedCredits = { ...credits };
            Object.keys(importedCredits).forEach((customer) => {
              mergedCredits[customer] = mergedCredits[customer] ? [...mergedCredits[customer], ...importedCredits[customer]] : importedCredits[customer];
            });
            saveCredits(mergedCredits);
            notify(`Imported ${importedCount} credit record${importedCount !== 1 ? 's' : ''} from CSV`, 'success');
          } else {
            notify('No valid credit records found in that CSV', 'warning');
          }
        } catch (error) {
          notify('Couldn’t import that CSV. Check the file format.', 'error');
        }
      };
      reader.readAsText(file);
    } else {
      notify('Choose a CSV (.csv) or backup (.json) file', 'error');
    }
    if (event.target) event.target.value = '';
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    saveCredits(pendingRestore.credits);
    setSelected(null);
    setPendingRestore(null);
    notify('Backup restored', 'success');
  };

  // ---------- render ----------

  const showList = wide || !selected;
  const showDetail = wide || Boolean(selected);
  const collectRecords = collectFor ? credits[collectFor]?.filter((c) => c.status === 'unpaid') ?? [] : [];
  const collectTotal = collectRecords.reduce((sum, c) => sum + c.amount, 0);
  const restoreCount = pendingRestore ? Object.keys(pendingRestore.credits).length : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h5">Customer Credit</Typography>
          <Typography variant="body2" color="text.secondary">
            Track what customers owe and record their payments.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
          <input ref={fileInputRef} type="file" accept=".csv,.json" hidden onChange={handleImportCredits} />
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => fileInputRef.current?.click()}>
            Import
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} endIcon={<ArrowDownIcon />} onClick={(e) => setExportMenu(e.currentTarget)}>
            Export
          </Button>
          <Menu anchorEl={exportMenu} open={Boolean(exportMenu)} onClose={() => setExportMenu(null)}>
            <MenuItem onClick={handleExportCredits}>
              <ListItemIcon>
                <CsvIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="CSV for spreadsheets" secondary="Every credit record" />
            </MenuItem>
            <MenuItem onClick={handleExportFullBackup}>
              <ListItemIcon>
                <BackupIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Full backup (.json)" secondary="Restore it later with Import" />
            </MenuItem>
          </Menu>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddCustomerOpen(true)}>
            Add customer
          </Button>
        </Box>
      </Box>

      {/* Summary; on a phone it steps aside while a customer's account is open */}
      <Box
        sx={{
          display: showList ? 'grid' : 'none',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
          mb: 2,
        }}
      >
        <StatTile
          icon={<OutstandingIcon />}
          label="Outstanding"
          value={formatPeso(stats.outstanding)}
          caption={`${stats.unpaidRecords} unpaid record${stats.unpaidRecords !== 1 ? 's' : ''}`}
          tone={stats.outstanding > 0 ? 'error' : 'default'}
        />
        <StatTile icon={<PeopleIcon />} label="Customers owing" value={String(stats.owing)} caption={`of ${summaries.length} customer${summaries.length !== 1 ? 's' : ''}`} />
        <StatTile
          icon={<CollectedIcon />}
          label="Collected"
          value={formatPeso(stats.collected)}
          caption={`${stats.paidRecords} paid record${stats.paidRecords !== 1 ? 's' : ''}`}
          tone="success"
        />
        <StatTile
          icon={<OldestIcon />}
          label="Oldest unpaid"
          value={stats.oldest ? (daysSince(stats.oldest.date) === 0 ? 'Today' : `${daysSince(stats.oldest.date)} days`) : '—'}
          caption={stats.oldest ? `${stats.oldest.name} · since ${formatDate(stats.oldest.date)}` : 'Nobody owes anything'}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '380px minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
        {/* Customer list */}
        {showList && (
          <Card sx={{ display: 'flex', flexDirection: 'column', height: { lg: 'calc(100vh - 290px)' }, minHeight: { lg: 480 } }}>
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'grid', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search customers or items"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                {(
                  [
                    ['all', 'All'],
                    ['owing', 'Owing'],
                    ['settled', 'Settled'],
                  ] as const
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    size="small"
                    label={`${label} · ${counts[value]}`}
                    color={customerFilter === value ? 'primary' : 'default'}
                    variant={customerFilter === value ? 'filled' : 'outlined'}
                    onClick={() => setCustomerFilter(value)}
                  />
                ))}
                <TextField
                  select
                  size="small"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as CustomerSort)}
                  aria-label="Sort customers"
                  sx={{ ml: 'auto', '& .MuiSelect-select': { py: 0.5, fontSize: '0.8125rem' } }}
                >
                  <MenuItem value="balance">Highest balance</MenuItem>
                  <MenuItem value="recent">Most recent</MenuItem>
                  <MenuItem value="name">Name A–Z</MenuItem>
                </TextField>
              </Box>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: { xs: 520, lg: 'none' } }} role="listbox" aria-label="Customers">
              {visibleCustomers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography fontWeight={600}>{summaries.length === 0 ? 'No customers yet' : 'Nobody matches'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {summaries.length === 0 ? 'Add a customer to start tracking credit.' : 'Try another search or filter.'}
                  </Typography>
                  {summaries.length === 0 && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddCustomerOpen(true)}>
                      Add customer
                    </Button>
                  )}
                </Box>
              ) : (
                visibleCustomers.map((s) => {
                  const isSelected = s.name === selected;
                  return (
                    <Box
                      key={s.name}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => selectCustomer(s.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectCustomer(s.name);
                        }
                      }}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.25,
                        cursor: 'pointer',
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: isSelected ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.07) : 'transparent',
                        '&:hover': { bgcolor: isSelected ? undefined : 'action.hover' },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 3,
                          bgcolor: isSelected ? 'primary.main' : 'transparent',
                        },
                        '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main', outlineOffset: -2 },
                      }}
                    >
                      <CustomerAvatar name={s.name} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={600} noWrap>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="p">
                          {s.unpaidCount > 0
                            ? `${s.unpaidCount} unpaid · oldest ${agoLabel(daysSince(s.oldestUnpaid!))}`
                            : s.count > 0
                              ? `All paid · ${s.count} record${s.count !== 1 ? 's' : ''}`
                              : 'No credit yet'}
                        </Typography>
                      </Box>
                      {s.balance > 0 ? (
                        <Typography fontWeight={700} color="error.main" sx={{ whiteSpace: 'nowrap' }}>
                          {formatPeso(s.balance)}
                        </Typography>
                      ) : (
                        <Chip size="small" icon={<SettledIcon />} label="Settled" color="success" variant="outlined" />
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          </Card>
        )}

        {/* Customer account */}
        {showDetail && (
          <Card sx={{ minWidth: 0 }}>
            {!selectedSummary ? (
              <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
                <PeopleIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                <Typography fontWeight={600}>Pick a customer</Typography>
                <Typography variant="body2" color="text.secondary">
                  Their credit and payments show up here.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
                  {!wide && (
                    <IconButton aria-label="Back to customers" onClick={() => setSelected(null)} edge="start">
                      <ArrowBackIcon />
                    </IconButton>
                  )}
                  <CustomerAvatar name={selectedSummary.name} size={52} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
                      {selectedSummary.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSummary.count} record{selectedSummary.count !== 1 ? 's' : ''}
                      {selectedSummary.lastActivity && ` · last activity ${formatDate(selectedSummary.lastActivity)}`}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, width: { xs: '100%', sm: 'auto' } }}>
                    <Typography variant="overline" color="text.secondary" component="p" sx={{ lineHeight: 1.5 }}>
                      Balance
                    </Typography>
                    <Typography variant="h4" component="p" color={selectedSummary.balance > 0 ? 'error.main' : 'success.main'}>
                      {formatPeso(selectedSummary.balance)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ px: 2.5, py: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={selectedSummary.balance <= 0}
                    onClick={() => setCollectFor(selectedSummary.name)}
                  >
                    {selectedSummary.balance > 0 ? `Collect ${formatPeso(selectedSummary.balance)}` : 'Nothing to collect'}
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Remove customer">
                    <IconButton aria-label={`Remove ${selectedSummary.name}`} onClick={() => setRemoveCustomer(selectedSummary.name)}>
                      <RemoveCustomerIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Quick add */}
                <Box
                  component="form"
                  onSubmit={handleQuickAdd}
                  noValidate
                  sx={{ px: 2.5, py: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Add credit
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr) auto' }, gap: 1 }}>
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={quickAmount}
                      inputRef={quickAmountRef}
                      error={Boolean(quickError)}
                      onChange={(e) => {
                        setQuickAmount(e.target.value);
                        setQuickError(undefined);
                      }}
                      inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
                      InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                    />
                    <TextField
                      size="small"
                      label="What was taken (optional)"
                      value={quickDescription}
                      onChange={(e) => setQuickDescription(e.target.value)}
                    />
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                      Add
                    </Button>
                  </Box>
                  {quickError && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.75 }}>
                      {quickError}
                    </Typography>
                  )}
                </Box>

                {/* Records */}
                <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={recordTab}
                    onChange={(_, value: RecordTab | null) => value && setRecordTab(value)}
                    sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, px: 1.5, py: 0.5 } }}
                  >
                    <ToggleButton value="unpaid">Unpaid · {selectedSummary.unpaidCount}</ToggleButton>
                    <ToggleButton value="paid">Paid · {selectedSummary.count - selectedSummary.unpaidCount}</ToggleButton>
                    <ToggleButton value="all">All · {selectedSummary.count}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box>
                  {selectedRecords.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 5, px: 2 }}>
                      {recordTab === 'unpaid' ? 'Nothing unpaid. All settled.' : recordTab === 'paid' ? 'No payments yet.' : 'No credit records yet.'}
                    </Typography>
                  ) : (
                    selectedRecords.map((credit) => {
                      const unpaid = credit.status === 'unpaid';
                      const days = daysSince(credit.date);
                      return (
                        <Box
                          key={credit.id}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'minmax(0, 1fr) auto auto' },
                            alignItems: 'center',
                            columnGap: 1.5,
                            rowGap: 1,
                            px: 2.5,
                            py: 1.25,
                            borderTop: 1,
                            borderColor: 'divider',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600} noWrap title={credit.description}>
                              {credit.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="p">
                              {formatDate(credit.date)}
                              {unpaid ? (
                                <Box component="span" sx={{ color: days >= 30 ? 'error.main' : days >= 7 ? 'warning.main' : 'text.secondary', fontWeight: days >= 7 ? 700 : 400 }}>
                                  {' · '}unpaid {agoLabel(days)}
                                </Box>
                              ) : (
                                ' · paid'
                              )}
                            </Typography>
                          </Box>
                          <Typography fontWeight={700} color={unpaid ? 'error.main' : 'text.secondary'} sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {formatPeso(credit.amount)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                            {unpaid ? (
                              <Button size="small" variant="outlined" color="success" onClick={() => handleMarkPaid(selectedSummary.name, credit)}>
                                Mark paid
                              </Button>
                            ) : (
                              <Chip size="small" icon={<SettledIcon />} label="Paid" color="success" variant="outlined" />
                            )}
                            <Tooltip title="Edit">
                              <IconButton size="small" aria-label={`Edit ${credit.description}`} onClick={() => openEdit(selectedSummary.name, credit)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" aria-label={`Delete ${credit.description}`} onClick={() => handleDeleteCredit(selectedSummary.name, credit)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </>
            )}
          </Card>
        )}
      </Box>

      {/* Add customer */}
      <Dialog open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleAddCustomer} noValidate>
          <DialogTitle>Add customer</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
            <TextField
              autoFocus
              label="Customer name"
              value={newCustomerName}
              onChange={(e) => {
                setNewCustomerName(e.target.value);
                setAddCustomerError(undefined);
              }}
              error={Boolean(addCustomerError)}
              helperText={addCustomerError}
            />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: -1 }}>
              First credit (optional)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: 1 }}>
              <TextField
                label="Amount"
                type="number"
                value={newCustomerAmount}
                onChange={(e) => {
                  setNewCustomerAmount(e.target.value);
                  setAddCustomerError(undefined);
                }}
                inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
                InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
              />
              <TextField label="What was taken" value={newCustomerDescription} onChange={(e) => setNewCustomerDescription(e.target.value)} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={() => setAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Add customer
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit credit */}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSaveEdit} noValidate>
          <DialogTitle>Edit credit</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
            <TextField
              autoFocus
              label="Amount"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              error={editAmount !== '' && parseAmount(editAmount) === null}
              helperText={editAmount !== '' && parseAmount(editAmount) === null ? 'Enter an amount above zero' : undefined}
              inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
              InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
            />
            <TextField label="What was taken" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={parseAmount(editAmount) === null}>
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Collect all */}
      <Dialog open={collectFor !== null} onClose={() => setCollectFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Collect {formatPeso(collectTotal)} from {collectFor}?
        </DialogTitle>
        <DialogContent>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', maxHeight: 220, overflowY: 'auto', mb: 2 }}>
            {collectRecords.map((c) => (
              <Box key={c.id} sx={{ display: 'flex', gap: 1, px: 1.5, py: 1, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {c.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(c.date)}
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 84, textAlign: 'right' }}>
                  {formatPeso(c.amount)}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary">
            All {collectRecords.length} unpaid record{collectRecords.length !== 1 ? 's' : ''} will be marked paid and recorded as one General sale in Sales
            Record.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setCollectFor(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="success" onClick={confirmCollectAll}>
            Collect {formatPeso(collectTotal)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove customer */}
      <Dialog open={removeCustomer !== null} onClose={() => setRemoveCustomer(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove {removeCustomer}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {removeCustomer && credits[removeCustomer]
              ? (() => {
                  const s = summarizeCustomer(credits[removeCustomer]);
                  return s.balance > 0
                    ? `They still owe ${formatPeso(s.balance)}. Removing them deletes all ${s.count} of their credit records.`
                    : `This deletes their ${s.count} credit record${s.count !== 1 ? 's' : ''}. Sales already recorded aren’t affected.`;
                })()
              : null}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setRemoveCustomer(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmRemoveCustomer}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore backup */}
      <Dialog open={pendingRestore !== null} onClose={() => setPendingRestore(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Restore this backup?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            The backup{pendingRestore?.exportDate ? ` from ${formatDate(new Date(pendingRestore.exportDate))}` : ''} has {restoreCount} customer
            {restoreCount !== 1 ? 's' : ''}. It <strong>replaces all {summaries.length} current customer{summaries.length !== 1 ? 's' : ''}</strong> and their
            records. Export a backup first if you might need the current data.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setPendingRestore(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmRestore}>
            Replace with backup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerCredit;
