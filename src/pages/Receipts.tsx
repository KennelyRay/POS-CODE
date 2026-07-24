import React, { useState, useContext } from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  Avatar,
  Stack,
  InputAdornment,
  TextField,
  FormControl,
  InputLabel,
  List,
  ListItem,
  Divider,
  Checkbox,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarTodayIcon,
  ListAlt as ListAltIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  LocalOffer as LocalOfferIcon,
  AttachMoney as MoneyIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  DeleteSweep as DeleteSweepIcon,
  SelectAll as SelectAllIcon,
} from '@mui/icons-material';
import { SalesContext, StoreSettingsContext } from '../App';
import { usePrinter } from '../contexts/PrinterContext';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface Receipt {
  id: string;
  date: Date;
  items: ReceiptItem[];
  total: number;
  type: 'general' | 'store' | 'load';
  customerMoney?: number;
  change?: number;
  qrData?: string;
}

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
  const matrix = buildDisplayQrMatrix(value);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${matrix[0].length}, 1fr)`,
        gap: 0.25,
        p: 1,
        width: 200,
        height: 200,
        bgcolor: 'common.white',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.300',
        mx: 'auto',
      }}
    >
      {matrix.flatMap((row, rowIndex) =>
        row.map((isDark, colIndex) => (
          <Box
            key={`${rowIndex}-${colIndex}`}
            sx={{
              bgcolor: isDark ? 'common.black' : 'common.white',
              borderRadius: 0.2,
            }}
          />
        ))
      )}
    </Box>
  );
};

const Receipts: React.FC = () => {
  const { receipts, deleteReceipt } = useContext(SalesContext);
  const storeSettings = useContext(StoreSettingsContext);
  const { printReceipt } = usePrinter();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({ 
    open: false, message: '', severity: 'success' 
  });
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'general' | 'store' | 'load'>('all');
  const [isPrinting, setIsPrinting] = useState(false);
  
  // New state for bulk operations
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteMonthData, setBulkDeleteMonthData] = useState<{ month: string; count: number } | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  const getReceiptQrData = (receipt: Receipt) =>
    receipt.qrData || `DISPLAY-${receipt.id}`;

  // Filter receipts based on search and type
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.items.some(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || receipt.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || receipt.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Group receipts by month for better bulk operations
  const groupedReceiptsByMonth = filteredReceipts.reduce((groups: { [key: string]: Receipt[] }, receipt) => {
    const date = new Date(receipt.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(receipt);
    return groups;
  }, {});

  // Group receipts by date (existing functionality)
  const groupedReceipts = filteredReceipts.reduce((groups: { [key: string]: Receipt[] }, receipt) => {
    const date = new Date(receipt.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(receipt);
    return groups;
  }, {});

  // Bulk selection handlers
  const handleReceiptSelect = (receiptId: string, checked: boolean) => {
    const newSelected = new Set(selectedReceiptIds);
    if (checked) {
      newSelected.add(receiptId);
    } else {
      newSelected.delete(receiptId);
    }
    setSelectedReceiptIds(newSelected);
  };

  const handleSelectAllInMonth = (monthReceipts: Receipt[], checked: boolean) => {
    const newSelected = new Set(selectedReceiptIds);
    monthReceipts.forEach(receipt => {
      if (checked) {
        newSelected.add(receipt.id);
      } else {
        newSelected.delete(receipt.id);
      }
    });
    setSelectedReceiptIds(newSelected);
  };

  const handleBulkDeleteMonth = (monthKey: string, monthReceipts: Receipt[]) => {
    const date = new Date(monthKey + '-01');
    const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    setBulkDeleteMonthData({ month: monthName, count: monthReceipts.length });
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    if (bulkDeleteMonthData) {
      // Find the month key from the month name
      const monthKey = Object.keys(groupedReceiptsByMonth).find(key => {
        const date = new Date(key + '-01');
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        return monthName === bulkDeleteMonthData.month;
      });
      
      if (monthKey && groupedReceiptsByMonth[monthKey]) {
        // Delete all receipts in the month
        groupedReceiptsByMonth[monthKey].forEach(receipt => {
          deleteReceipt(receipt.id);
        });
        
        setSnackbar({ 
          open: true, 
          message: `Successfully deleted ${bulkDeleteMonthData.count} receipts from ${bulkDeleteMonthData.month}!`, 
          severity: 'success' 
        });
      }
    }
    setBulkDeleteDialogOpen(false);
    setBulkDeleteMonthData(null);
  };

  const handleBulkDeleteSelected = () => {
    selectedReceiptIds.forEach(id => {
      deleteReceipt(id);
    });
    setSnackbar({ 
      open: true, 
      message: `Successfully deleted ${selectedReceiptIds.size} selected receipts!`, 
      severity: 'success' 
    });
    setSelectedReceiptIds(new Set());
  };

  const isMonthFullySelected = (monthReceipts: Receipt[]) => {
    return monthReceipts.every(receipt => selectedReceiptIds.has(receipt.id));
  };

  const isMonthPartiallySelected = (monthReceipts: Receipt[]) => {
    return monthReceipts.some(receipt => selectedReceiptIds.has(receipt.id)) && 
           !isMonthFullySelected(monthReceipts);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setDialogOpen(true);
  };

  const handleDeleteClick = (receiptId: string) => {
    setReceiptToDelete(receiptId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (receiptToDelete) {
      deleteReceipt(receiptToDelete);
      setSnackbar({ open: true, message: 'Receipt deleted successfully!', severity: 'success' });
      setReceiptToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!selectedReceipt) return;
    
    setIsPrinting(true);
    try {
      // Transform receipt data to match the expected format
      const receiptData = {
        ...selectedReceipt,
        storeName: storeSettings?.storeName || 'Ken-dal Store',
        storeAddress: storeSettings?.storeAddress || '123 Main Street, City',
        qrData: getReceiptQrData(selectedReceipt),
      };
      
      const success = await printReceipt(receiptData);
      
      if (success) {
        setSnackbar({ 
          open: true, 
          message: 'Receipt printed successfully!', 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: 'Failed to print receipt. Please check your printer connection.', 
          severity: 'error' 
        });
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error occurred while printing receipt.', 
        severity: 'error' 
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintReceiptQuick = async (receipt: Receipt) => {
    setIsPrinting(true);
    try {
      // Transform receipt data to match the expected format
      const receiptData = {
        ...receipt,
        storeName: storeSettings?.storeName || 'Ken-dal Store',
        storeAddress: storeSettings?.storeAddress || '123 Main Street, City',
        qrData: getReceiptQrData(receipt),
      };
      
      const success = await printReceipt(receiptData);
      
      if (success) {
        setSnackbar({ 
          open: true, 
          message: 'Receipt printed successfully!', 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: 'Failed to print receipt. Please check your printer connection.', 
          severity: 'error' 
        });
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error occurred while printing receipt.', 
        severity: 'error' 
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general': return <ShoppingCartIcon />;
      case 'store': return <ListAltIcon />;
      case 'load': return <LocalOfferIcon />;
      default: return <ReceiptIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'primary';
      case 'store': return 'secondary';
      case 'load': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <ReceiptIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                Receipt Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage your transaction receipts
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip 
              icon={<ReceiptIcon />} 
              label={`${receipts.length} Total Receipts`} 
              color="primary" 
              variant="outlined"
              sx={{ borderRadius: 3, px: 2 }}
            />
            {selectedReceiptIds.size > 0 && (
              <Chip 
                icon={<SelectAllIcon />} 
                label={`${selectedReceiptIds.size} Selected`} 
                color="secondary" 
                variant="filled"
                sx={{ borderRadius: 3, px: 2 }}
              />
            )}
          </Stack>
        </Box>

        {/* Bulk Actions Bar */}
        {selectedReceiptIds.size > 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
                  <SelectAllIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={600}>
                  {selectedReceiptIds.size} receipt{selectedReceiptIds.size !== 1 ? 's' : ''} selected
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setSelectedReceiptIds(new Set())}
                  sx={{ borderRadius: 2 }}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDeleteSelected}
                  sx={{ borderRadius: 2 }}
                >
                  Delete Selected
                </Button>
              </Stack>
            </Box>
          </Card>
        )}
      </Box>

      {/* Search and Filter Section */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search receipts..."
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
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 3,
                    '&:hover fieldset': { borderColor: 'primary.main' },
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  label="Filter by Type"
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="store">Store</MenuItem>
                  <MenuItem value="load">Load</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>View Mode</InputLabel>
                <Select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'month' | 'day')}
                  label="View Mode"
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="month">Group by Month</MenuItem>
                  <MenuItem value="day">Group by Day</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  sx={{ 
                    bgcolor: 'primary.50', 
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'primary.100' }
                  }}
                >
                  <FilterListIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Receipts Display */}
      <Box>
        {filteredReceipts.length === 0 ? (
          <Card sx={{ borderRadius: 3, boxShadow: 3, textAlign: 'center', p: 6 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: 'grey.100', width: 120, height: 120, mx: 'auto', mb: 3 }}>
                <ReceiptIcon sx={{ fontSize: 60, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h5" fontWeight={700} color="text.secondary" gutterBottom>
                No receipts found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Start making sales to see receipts here'
                }
              </Typography>
            </CardContent>
          </Card>
        ) : viewMode === 'month' ? (
          // Month View with Bulk Delete
          Object.entries(groupedReceiptsByMonth)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort by month descending
            .map(([monthKey, monthReceipts]) => {
              const date = new Date(monthKey + '-01');
              const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
              const isFullySelected = isMonthFullySelected(monthReceipts);
              const isPartiallySelected = isMonthPartiallySelected(monthReceipts);
              
              return (
                <Card key={monthKey} sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
                  <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Checkbox
                          checked={isFullySelected}
                          indeterminate={isPartiallySelected}
                          onChange={(e) => handleSelectAllInMonth(monthReceipts, e.target.checked)}
                          sx={{ p: 0 }}
                        />
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                          <CalendarTodayIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {monthName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {monthReceipts.length} receipt{monthReceipts.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip 
                          label={`₱${monthReceipts.reduce((sum, r) => sum + r.total, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                          color="success"
                          variant="filled"
                          icon={<MoneyIcon />}
                          sx={{ fontWeight: 700 }}
                        />
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteSweepIcon />}
                          onClick={() => handleBulkDeleteMonth(monthKey, monthReceipts)}
                          sx={{ borderRadius: 2 }}
                        >
                          Delete Month
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                      {monthReceipts.map((receipt) => (
                        <Grid item xs={12} sm={6} md={4} key={receipt.id}>
                          <Card 
                            sx={{ 
                              borderRadius: 3, 
                              border: '1px solid', 
                              borderColor: selectedReceiptIds.has(receipt.id) ? 'primary.main' : 'grey.200',
                              bgcolor: selectedReceiptIds.has(receipt.id) ? 'primary.50' : 'background.paper',
                              transition: 'all 0.3s',
                              cursor: 'pointer',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 4,
                                borderColor: 'primary.main',
                              }
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Checkbox
                                    checked={selectedReceiptIds.has(receipt.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleReceiptSelect(receipt.id, e.target.checked);
                                    }}
                                    size="small"
                                  />
                                  <Chip
                                    icon={getTypeIcon(receipt.type)}
                                    label={receipt.type.toUpperCase()}
                                    color={getTypeColor(receipt.type) as any}
                                    size="small"
                                    sx={{ fontWeight: 700 }}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(receipt.date).toLocaleDateString()}
                                </Typography>
                              </Box>
                              
                              <Typography variant="h6" fontWeight={700} gutterBottom>
                                Receipt #{receipt.id.slice(-6)}
                              </Typography>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700} color="primary">
                                  ₱{receipt.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </Typography>
                                {receipt.change && receipt.change > 0 && (
                                  <Chip 
                                    label={`Change: ₱${receipt.change.toFixed(2)}`}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              
                              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<VisibilityIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewReceipt(receipt);
                                  }}
                                  sx={{ borderRadius: 2, flex: 1 }}
                                >
                                  View
                                </Button>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintReceiptQuick(receipt);
                                  }}
                                  sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2 }}
                                  disabled={isPrinting}
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(receipt.id);
                                  }}
                                  sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Card>
              );
            })
        ) : (
          // Day View (existing functionality with checkboxes)
          Object.entries(groupedReceipts).map(([date, receiptsForDate]) => (
            <Card key={date} sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                      <CalendarTodayIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {date}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {receiptsForDate.length} receipt{receiptsForDate.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={`₱${receiptsForDate.reduce((sum, r) => sum + r.total, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                    color="success"
                    variant="filled"
                    icon={<MoneyIcon />}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {receiptsForDate.map((receipt) => (
                    <Grid item xs={12} sm={6} md={4} key={receipt.id}>
                      <Card 
                        sx={{ 
                          borderRadius: 3, 
                          border: '1px solid', 
                          borderColor: selectedReceiptIds.has(receipt.id) ? 'primary.main' : 'grey.200',
                          bgcolor: selectedReceiptIds.has(receipt.id) ? 'primary.50' : 'background.paper',
                          transition: 'all 0.3s',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                            borderColor: 'primary.main',
                          }
                        }}
                        onClick={() => handleViewReceipt(receipt)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Checkbox
                                checked={selectedReceiptIds.has(receipt.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleReceiptSelect(receipt.id, e.target.checked);
                                }}
                                size="small"
                              />
                              <Chip
                                icon={getTypeIcon(receipt.type)}
                                label={receipt.type.toUpperCase()}
                                color={getTypeColor(receipt.type) as any}
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(receipt.date).toLocaleTimeString()}
                            </Typography>
                          </Box>
                          
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            Receipt #{receipt.id.slice(-6)}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight={700} color="primary">
                              ₱{receipt.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </Typography>
                            {receipt.change && receipt.change > 0 && (
                              <Chip 
                                label={`Change: ₱${receipt.change.toFixed(2)}`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </Box>
                          
                          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReceipt(receipt);
                              }}
                              sx={{ borderRadius: 2, flex: 1 }}
                            >
                              View
                            </Button>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintReceiptQuick(receipt);
                              }}
                              sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2 }}
                              disabled={isPrinting}
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(receipt.id);
                              }}
                              sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Card>
          ))
        )}
      </Box>

      {/* Receipt Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
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
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
              <ReceiptIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Receipt Details
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Receipt #{selectedReceipt?.id.slice(-8)} • {selectedReceipt && new Date(selectedReceipt.date).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={() => setDialogOpen(false)} 
            sx={{ 
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        
        <DialogContent sx={{ p: 4 }}>
          {selectedReceipt && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Transaction Info
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Date & Time:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {new Date(selectedReceipt.date).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Type:</Typography>
                      <Chip 
                        size="small" 
                        label={selectedReceipt.type.toUpperCase()} 
                        color={getTypeColor(selectedReceipt.type) as any}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Receipt ID:</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {selectedReceipt.id.slice(-12)}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>

                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, mt: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Payment Summary
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                      <Typography variant="body1" fontWeight={700}>
                        ₱{selectedReceipt.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Cash Paid:</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        ₱{(selectedReceipt.customerMoney || selectedReceipt.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Change:</Typography>
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        ₱{(selectedReceipt.change || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>

                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, mt: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    QR Preview
                  </Typography>
                  <ReceiptQrPreview value={getReceiptQrData(selectedReceipt)} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mt: 2,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {getReceiptQrData(selectedReceipt)}
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: 2, height: 'fit-content' }}>
                  <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700}>
                      Items Purchased ({selectedReceipt.items.length})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    <List sx={{ p: 0 }}>
                      {selectedReceipt.items.map((item, index) => (
                        <ListItem 
                          key={index} 
                          sx={{ 
                            px: 3, 
                            py: 2,
                            borderBottom: index < selectedReceipt.items.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                                {item.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Chip 
                                  label={`Qty: ${item.quantity}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                <Typography variant="body2" color="text.secondary">
                                  ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} each
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" fontWeight={700} color="primary.main">
                                ₱{(item.quantity * item.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Line Total
                              </Typography>
                            </Box>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                  
                  <Box sx={{ p: 3, bgcolor: 'success.50', borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight={700} color="success.dark">
                        Receipt Total
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="success.main">
                        ₱{selectedReceipt.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 4 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ borderRadius: 3, px: 4 }}
            size="large"
          >
            Close
          </Button>
          <Button 
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintReceipt}
            disabled={isPrinting}
            sx={{ borderRadius: 3, px: 4 }}
            size="large"
          >
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            color: 'white',
            p: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
            <DeleteIcon sx={{ fontSize: 32, color: 'white' }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
              Delete Receipt
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              This action cannot be undone
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Are you sure you want to delete this receipt?
          </Typography>
          
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
            <Typography variant="body2" color="error.dark">
              This will permanently delete the receipt record and cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 4 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: 3, px: 4 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleConfirmDelete}
            sx={{ borderRadius: 3, px: 4 }}
          >
            Delete Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog 
        open={bulkDeleteDialogOpen} 
        onClose={() => setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            color: 'white',
            p: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
            <DeleteSweepIcon sx={{ fontSize: 32, color: 'white' }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
              Delete Month Receipts
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              This action cannot be undone
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Are you sure you want to delete all receipts from {bulkDeleteMonthData?.month}?
          </Typography>
          
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', mb: 3 }}>
            <Typography variant="body2" color="warning.dark" fontWeight={600}>
              This will delete {bulkDeleteMonthData?.count} receipt{bulkDeleteMonthData?.count !== 1 ? 's' : ''} permanently.
            </Typography>
          </Box>
          
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
            <Typography variant="body2" color="error.dark">
              This action cannot be undone. All receipt data for this month will be permanently lost.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 4 }}>
          <Button 
            onClick={() => setBulkDeleteDialogOpen(false)}
            sx={{ borderRadius: 3, px: 4 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleConfirmBulkDelete}
            sx={{ borderRadius: 3, px: 4 }}
            startIcon={<DeleteSweepIcon />}
          >
            Delete All Receipts
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

export default Receipts; 
