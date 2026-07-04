import React, { useState, useContext, useEffect, useRef } from 'react';
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
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  AccountBalance as CreditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as PaidIcon,
  Cancel as UnpaidIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  FileDownload as ExportIcon,
  Upload as UploadIcon,
  Backup as BackupIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { SalesContext } from '../App';
import { saveAs } from 'file-saver';

interface CreditRecord {
  id: string;
  date: Date;
  amount: number;
  description: string;
  status: 'paid' | 'unpaid';
}

const CustomerCredit: React.FC = () => {
  const salesContext = useContext(SalesContext);
  
  const [credits, setCredits] = useState<{ [customer: string]: CreditRecord[] }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [addCustomerDialog, setAddCustomerDialog] = useState(false);
  const [customerDetailDialog, setCustomerDetailDialog] = useState<{ open: boolean; customer: string }>({ open: false, customer: '' });
  const [addCreditDialog, setAddCreditDialog] = useState<{ open: boolean; customer: string }>({ open: false, customer: '' });
  const [editCreditDialog, setEditCreditDialog] = useState<{ open: boolean; customer: string; credit?: CreditRecord }>({ open: false, customer: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; customer: string; creditId: string } | null>(null);
  const [payAllDialog, setPayAllDialog] = useState<{ open: boolean; customer: string; totalAmount: number }>({ open: false, customer: '', totalAmount: 0 });
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load credits from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('customerCredits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const converted: { [customer: string]: CreditRecord[] } = {};
        Object.keys(parsed).forEach(customer => {
          converted[customer] = parsed[customer].map((credit: any) => ({
            ...credit,
            date: new Date(credit.date)
          }));
        });
        setCredits(converted);
      } catch (error) {
        console.error('Error loading credits:', error);
      }
    }
  }, []);

  const saveCredits = (newCredits: { [customer: string]: CreditRecord[] }) => {
    setCredits(newCredits);
    localStorage.setItem('customerCredits', JSON.stringify(newCredits));
  };

  // New customer workflow handlers
  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) {
      setSnackbar({ open: true, message: 'Customer name is required!', severity: 'error' });
      return;
    }

    // Check if customer already exists
    if (credits[newCustomerName.trim()]) {
      setSnackbar({ open: true, message: 'Customer already exists!', severity: 'error' });
      return;
    }

    const updatedCredits = { ...credits };
    updatedCredits[newCustomerName.trim()] = [];
    saveCredits(updatedCredits);
    
    setSnackbar({ open: true, message: 'Customer added successfully!', severity: 'success' });
    setNewCustomerName('');
    setAddCustomerDialog(false);
  };

  const handleCustomerCardClick = (customer: string) => {
    setCustomerDetailDialog({ open: true, customer });
  };

  const handleToggleCustomerExpand = (customer: string) => {
    setExpandedCustomer((currentCustomer) =>
      currentCustomer === customer ? null : customer
    );
  };

  const handleAddCreditToCustomer = (customer: string) => {
    setAddCreditDialog({ open: true, customer });
    setNewAmount('');
    setNewDescription('');
  };

  const handleSaveCreditToCustomer = () => {
    if (!addCreditDialog.customer || !newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      setSnackbar({ open: true, message: 'Please fill in all fields with valid data', severity: 'error' });
      return;
    }

    const credit: CreditRecord = {
      id: Date.now().toString(),
      date: new Date(),
      amount: Number(newAmount),
      description: newDescription.trim() || 'Credit purchase',
      status: 'unpaid'
    };

    const updatedCredits = { ...credits };
    updatedCredits[addCreditDialog.customer].push(credit);
    
    saveCredits(updatedCredits);
    setSnackbar({ open: true, message: 'Credit added successfully!', severity: 'success' });
    
    // Reset form
    setNewAmount('');
    setNewDescription('');
    setAddCreditDialog({ open: false, customer: '' });
  };

  const handleEditCredit = (customer: string, credit: CreditRecord) => {
    setEditCreditDialog({ open: true, customer, credit });
    setNewAmount(credit.amount.toString());
    setNewDescription(credit.description);
  };

  const handleSaveEditedCredit = () => {
    if (!editCreditDialog.customer || !editCreditDialog.credit || !newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      setSnackbar({ open: true, message: 'Please fill in all fields with valid data', severity: 'error' });
      return;
    }

    const updatedCredits = { ...credits };
    updatedCredits[editCreditDialog.customer] = updatedCredits[editCreditDialog.customer].map(credit =>
      credit.id === editCreditDialog.credit!.id 
        ? { ...credit, amount: Number(newAmount), description: newDescription.trim() || 'Credit purchase' }
        : credit
    );
    
    saveCredits(updatedCredits);
    setSnackbar({ open: true, message: 'Credit updated successfully!', severity: 'success' });
    
    // Reset form
    setNewAmount('');
    setNewDescription('');
    setEditCreditDialog({ open: false, customer: '' });
  };

  const handleDeleteCredit = (customer: string, creditId: string) => {
    setDeleteDialog({ open: true, customer, creditId });
  };

  const confirmDeleteCredit = () => {
    if (!deleteDialog) return;
    
    const { customer, creditId } = deleteDialog;
    const updatedCredits = { ...credits };
    updatedCredits[customer] = updatedCredits[customer].filter(credit => credit.id !== creditId);
    if (updatedCredits[customer].length === 0) {
      delete updatedCredits[customer];
    }
    saveCredits(updatedCredits);
    setSnackbar({ open: true, message: 'Credit deleted', severity: 'info' });
    setDeleteDialog(null);
  };

  const handleMarkPaid = (customer: string, credit: CreditRecord) => {
    const updated = { ...credits };
    updated[customer] = updated[customer].map(c => c.id === credit.id ? { ...c, status: 'paid' } : c);
    saveCredits(updated);
    // Log as general sale with CustomerName-Paid
    salesContext.addSale({
      id: Date.now().toString(),
      date: new Date(credit.date),
      items: [{ name: `${customer}-Paid`, quantity: 1, price: credit.amount }],
      total: credit.amount,
      type: 'general',
    });
    setSnackbar({ open: true, message: 'Marked as paid and logged as general sale.', severity: 'success' });
  };

  const handlePayAllCredits = (customer: string) => {
    const customerCredits = credits[customer];
    const unpaidCredits = customerCredits.filter(credit => credit.status === 'unpaid');
    
    if (unpaidCredits.length === 0) {
      setSnackbar({ open: true, message: 'No unpaid credits to pay for this customer.', severity: 'info' });
      return;
    }

    // Calculate total amount to be paid
    const totalAmount = unpaidCredits.reduce((sum, credit) => sum + credit.amount, 0);
    
    // Show confirmation dialog
    setPayAllDialog({ open: true, customer, totalAmount });
  };

  const confirmPayAllCredits = (customer: string) => {
    const customerCredits = credits[customer];
    const unpaidCredits = customerCredits.filter(credit => credit.status === 'unpaid');
    
    // Mark all unpaid credits as paid
    const updated = { ...credits };
    updated[customer] = customerCredits.map(c => c.status === 'unpaid' ? { ...c, status: 'paid' } : c);
    saveCredits(updated);

    // Calculate total amount paid
    const totalAmount = unpaidCredits.reduce((sum, credit) => sum + credit.amount, 0);

    // Create combined items list for the sales record
    const items = unpaidCredits.map(credit => ({
      name: `${customer}-${credit.description}`,
      quantity: 1,
      price: credit.amount
    }));

    // Log as general sale with all credit items combined
    salesContext.addSale({
      id: Date.now().toString(),
      date: new Date(),
      items: items,
      total: totalAmount,
      type: 'general',
    });

    setSnackbar({ 
      open: true, 
      message: `All credits paid! Total: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} logged as general sale.`, 
      severity: 'success' 
    });
  };

  // Filter and search logic
  const filteredCustomers = Object.keys(credits).filter(customer => {
    const customerCredits = credits[customer];
    const matchesSearch = customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerCredits.some(credit => credit.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterStatus === 'all') return matchesSearch;
    
    const hasMatchingStatus = customerCredits.some(credit => credit.status === filterStatus);
    return matchesSearch && hasMatchingStatus;
  });

  // Calculate totals
  const calculateCustomerTotal = (customerCredits: CreditRecord[]) => {
    return customerCredits.reduce((sum, credit) => sum + (credit.status === 'unpaid' ? credit.amount : 0), 0);
  };

  const calculateOverallStats = () => {
    let totalUnpaid = 0;
    let totalPaid = 0;
    let totalCustomers = 0;
    let unpaidRecords = 0;

    Object.keys(credits).forEach(customer => {
      const customerCredits = credits[customer];
      const hasUnpaid = customerCredits.some(c => c.status === 'unpaid');
      if (hasUnpaid) totalCustomers++;
      
      customerCredits.forEach(credit => {
        if (credit.status === 'unpaid') {
          totalUnpaid += credit.amount;
          unpaidRecords++;
        } else {
          totalPaid += credit.amount;
        }
      });
    });

    return { totalUnpaid, totalPaid, totalCustomers, unpaidRecords };
  };

  const stats = calculateOverallStats();

  // Export functions
  const handleExportCredits = () => {
    const exportData: string[] = [];
    
    Object.keys(credits).forEach(customer => {
      credits[customer].forEach(credit => {
        // Format date as YYYY-MM-DD to match the CSV format
        const formattedDate = new Date(credit.date).toISOString().split('T')[0];
        exportData.push(`"${customer}","${credit.description}",${credit.amount},${formattedDate},${credit.status}`);
      });
    });

    if (exportData.length === 0) {
      setSnackbar({ open: true, message: 'No credit data to export', severity: 'warning' });
      return;
    }

    // Create CSV content with header
    const csvContent = [
      'Customer,Product,Amount,Date,Status', // Header row matching your CSV format
      ...exportData
    ].join('\n');
    
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(csvBlob, `customer_credits_${new Date().toISOString().split('T')[0]}.csv`);
    setSnackbar({ open: true, message: 'Customer credits exported successfully!', severity: 'success' });
  };

  const handleExportFullBackup = () => {
    const backupData = {
      credits,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([jsonStr], { type: 'application/json' });
    saveAs(dataBlob, `customer_credits_backup_${new Date().toISOString().split('T')[0]}.json`);
    setSnackbar({ open: true, message: 'Full backup exported successfully!', severity: 'success' });
  };

  const handleImportCredits = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'json') {
      // Handle JSON backup import
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          if (data.credits) {
            // Convert date strings back to Date objects
            const converted: { [customer: string]: CreditRecord[] } = {};
            Object.keys(data.credits).forEach(customer => {
              converted[customer] = data.credits[customer].map((credit: any) => ({
                ...credit,
                date: new Date(credit.date)
              }));
            });
            
            saveCredits(converted);
            setSnackbar({ open: true, message: 'Credits imported successfully from backup!', severity: 'success' });
          } else {
            setSnackbar({ open: true, message: 'Invalid backup file format', severity: 'error' });
          }
        } catch (error) {
          setSnackbar({ open: true, message: 'Error importing backup file', severity: 'error' });
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'csv') {
      // Handle CSV import
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
          
          if (lines.length === 0) {
            setSnackbar({ open: true, message: 'CSV file is empty!', severity: 'error' });
            return;
          }
          
          // Check if first line is header (Customer,Product,Amount,Date,Status)
          const hasHeader = lines[0].toLowerCase().includes('customer') && 
                           lines[0].toLowerCase().includes('product') && 
                           lines[0].toLowerCase().includes('amount');
          const dataLines = hasHeader ? lines.slice(1) : lines;
          
          const importedCredits: { [customer: string]: CreditRecord[] } = {};
          let importedCount = 0;
          
          dataLines.forEach((line) => {
            // Split CSV line, handling quoted values
            const parts = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''));
            
            if (parts.length >= 5) {
              const customer = parts[0];
              const product = parts[1];
              const amount = Number(parts[2]) || 0;
              const dateStr = parts[3];
              const status = parts[4];
              
              if (customer && product && amount > 0 && dateStr) {
                const credit: CreditRecord = {
                  id: Date.now().toString() + Math.random(),
                  date: new Date(dateStr),
                  amount: amount,
                  description: product,
                  status: (status === 'paid' || status === 'unpaid') ? status : 'unpaid'
                };
                
                if (!importedCredits[customer]) {
                  importedCredits[customer] = [];
                }
                importedCredits[customer].push(credit);
                importedCount++;
              }
            }
          });
          
          if (importedCount > 0) {
            // Merge with existing credits
            const mergedCredits = { ...credits };
            Object.keys(importedCredits).forEach(customer => {
              if (mergedCredits[customer]) {
                mergedCredits[customer] = [...mergedCredits[customer], ...importedCredits[customer]];
              } else {
                mergedCredits[customer] = importedCredits[customer];
              }
            });
            
            saveCredits(mergedCredits);
            setSnackbar({ 
              open: true, 
              message: `${importedCount} credit records imported successfully from CSV!`, 
              severity: 'success' 
            });
          } else {
            setSnackbar({ 
              open: true, 
              message: 'No valid credit data found in CSV file', 
              severity: 'warning' 
            });
          }
        } catch (error) {
          setSnackbar({ 
            open: true, 
            message: 'Error importing CSV file. Please check file format.', 
            severity: 'error' 
          });
        }
      };
      reader.readAsText(file);
    } else {
      setSnackbar({ open: true, message: 'Please select a valid CSV (.csv) or JSON (.json) file', severity: 'error' });
    }

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <CreditIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                Customer Credit Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track and manage customer credit accounts
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleImportCredits}
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ borderRadius: 3, px: 2 }}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportCredits}
              sx={{ borderRadius: 3, px: 2 }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddCustomerDialog(true)}
              sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
            >
              Add Customer
            </Button>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <UnpaidIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  ₱{stats.totalUnpaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Unpaid
                </Typography>
                <Chip 
                  label={`${stats.unpaidRecords} records`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <PaidIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  ₱{stats.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="info.main">
                  {stats.totalCustomers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Customers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  ₱{(stats.totalUnpaid + stats.totalPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Credit
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Search and Filter Section */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon color="primary" />
            Search & Filter Credits
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search by customer name or description..."
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
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Filter by Status"
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="all">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon />
                      <Typography>All Status</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="unpaid">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UnpaidIcon />
                      <Typography>Unpaid</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="paid">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaidIcon />
                      <Typography>Paid</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={filterStatus === 'all' ? 'All' : filterStatus}
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 700 }}
                />
                {filteredCustomers.length > 0 && (
                  <Chip
                    label={`${filteredCustomers.length} found`}
                    color="secondary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* Data Management Section */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BackupIcon color="primary" />
            Data Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Export, import, and backup your customer credit data
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'success.200', bgcolor: 'success.50' }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'success.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                    <ExportIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Export to CSV
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Download detailed credit records in CSV format
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ExportIcon />}
                    onClick={handleExportCredits}
                    fullWidth
                    sx={{ borderRadius: 3 }}
                    disabled={Object.keys(credits).length === 0}
                  >
                    Export Credits
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'info.200', bgcolor: 'info.50' }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'info.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                    <BackupIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Full Backup
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create complete backup with all credit data
                  </Typography>
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<BackupIcon />}
                    onClick={handleExportFullBackup}
                    fullWidth
                    sx={{ borderRadius: 3 }}
                    disabled={Object.keys(credits).length === 0}
                  >
                    Create Backup
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.200', bgcolor: 'warning.50' }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 50, height: 50, mx: 'auto', mb: 2 }}>
                    <UploadIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Import Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Import from CSV or restore from backup
                  </Typography>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<UploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    fullWidth
                    sx={{ borderRadius: 3 }}
                  >
                    Import Credits
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'grey.100' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Supported formats:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <strong>CSV (.csv):</strong> Spreadsheet format with columns: Customer, Product, Amount, Date, Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <strong>JSON (.json):</strong> Full backup format for complete data restoration
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Customer Credits Display */}
      <Box>
        {filteredCustomers.length === 0 ? (
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 3 }}>
                <CreditIcon sx={{ fontSize: 40, color: 'grey.500' }} />
              </Avatar>
              <Typography variant="h5" fontWeight={700} gutterBottom color="text.secondary">
                No Customer Credits Found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by adding your first customer credit record'
                }
              </Typography>
              {(searchQuery || filterStatus !== 'all') ? (
                <Button 
                  variant="outlined" 
                  onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                  sx={{ borderRadius: 3 }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => setAddCustomerDialog(true)}
                  sx={{ borderRadius: 3 }}
                >
                  Add First Credit
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredCustomers.map((customer) => {
              const customerCredits = credits[customer];
              const filteredCredits = filterStatus === 'all' 
                ? customerCredits 
                : customerCredits.filter(credit => credit.status === filterStatus);
              const totalUnpaid = calculateCustomerTotal(customerCredits);
              const isExpanded = expandedCustomer === customer;

              return (
                <Grid item xs={12} key={customer}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <Box 
                      sx={{ 
                        p: 3, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider',
                        bgcolor: totalUnpaid > 0 ? 'error.50' : 'success.50',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleCustomerCardClick(customer)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: totalUnpaid > 0 ? 'error.main' : 'success.main', width: 50, height: 50 }}>
                            <PersonIcon sx={{ fontSize: 28 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight={700}>
                              {customer}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {customerCredits.length} credit record{customerCredits.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {totalUnpaid > 0 ? (
                            <Chip 
                              label={`₱${totalUnpaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })} unpaid`}
                              color="error"
                              variant="filled"
                              icon={<MoneyIcon />}
                              sx={{ fontWeight: 700 }}
                            />
                          ) : (
                            <Chip 
                              label="All Paid"
                              color="success"
                              variant="filled"
                              icon={<PaidIcon />}
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleCustomerExpand(customer);
                            }}
                            sx={{ color: 'text.secondary' }}
                          >
                            <ExpandMoreIcon 
                              sx={{ 
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s'
                              }}
                            />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                    
                    {isExpanded && (
                      <Box sx={{ p: 3 }}>
                        <List>
                          {filteredCredits.map((credit, index) => (
                            <ListItem key={credit.id} sx={{ px: 0, py: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                    <Typography variant="body1" fontWeight={600}>
                                      {credit.description}
                                    </Typography>
                                    <Chip 
                                      label={credit.status.toUpperCase()}
                                      color={credit.status === 'paid' ? 'success' : 'error'}
                                      size="small"
                                      icon={credit.status === 'paid' ? <PaidIcon /> : <UnpaidIcon />}
                                    />
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <CalendarIcon sx={{ fontSize: 16 }} />
                                      {new Date(credit.date).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700} color={credit.status === 'paid' ? 'success.main' : 'error.main'}>
                                      ₱{credit.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  {credit.status === 'unpaid' && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      startIcon={<PaymentIcon />}
                                      onClick={() => handleMarkPaid(customer, credit)}
                                      sx={{ borderRadius: 2 }}
                                    >
                                      Mark Paid
                                    </Button>
                                  )}
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteCredit(customer, credit.id)}
                                    sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Box>
                              {index < filteredCredits.length - 1 && <Divider sx={{ mt: 2 }} />}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Add Customer Dialog */}
      <Dialog
        open={addCustomerDialog}
        onClose={() => setAddCustomerDialog(false)}
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
        {/* Header with gradient background */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative circles */}
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              <PersonIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Add New Customer
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Create a new customer profile to start tracking credits
              </Typography>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Grid container spacing={4}>
            {/* Left side - Form */}
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  Customer Information
                </Typography>
                
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Enter full customer name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 3,
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      }
                    }}
                    autoFocus
                    variant="outlined"
                  />
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'info.main', width: 24, height: 24 }}>
                        <Typography variant="caption" fontWeight={700}>ℹ</Typography>
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={700} color="info.main">
                        What happens next?
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="info.dark">
                      After creating the customer profile, you'll be able to add credit records, track payments, and manage their account history.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* Right side - Preview/Stats */}
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                {/* Customer Preview Card */}
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
                    Customer Preview
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, bgcolor: 'grey.100' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {newCustomerName.trim() || 'Customer Name'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        New Customer • 0 Credits
                      </Typography>
                    </Box>
                  </Box>
                </Card>

                {/* Quick Stats */}
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
                    Current Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'success.50' }}>
                        <Typography variant="h5" fontWeight={700} color="success.main">
                          {Object.keys(credits).length}
                        </Typography>
                        <Typography variant="caption" color="success.dark">
                          Total Customers
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'primary.50' }}>
                        <Typography variant="h5" fontWeight={700} color="primary.main">
                          {Object.values(credits).reduce((sum, customerCredits) => sum + customerCredits.length, 0)}
                        </Typography>
                        <Typography variant="caption" color="primary.dark">
                          Total Credits
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setAddCustomerDialog(false);
              setNewCustomerName('');
            }} 
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCustomer}
            startIcon={<AddIcon />}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              }
            }}
            disabled={!newCustomerName.trim()}
            size="large"
          >
            Create Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog
        open={customerDetailDialog.open}
        onClose={() => setCustomerDetailDialog({ open: false, customer: '' })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 4, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          } 
        }}
      >
        {/* Header with gradient background */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  width: 64, 
                  height: 64,
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              >
                <PersonIcon sx={{ fontSize: 32, color: 'white' }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                  {customerDetailDialog.customer}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Customer Credit Management
                </Typography>
              </Box>
            </Box>
            
            {/* Quick stats in header */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {customerDetailDialog.customer && credits[customerDetailDialog.customer] && (
                <>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                    <Typography variant="h6" fontWeight={700}>
                      {credits[customerDetailDialog.customer].length}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Total Credits
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'error.50' }}>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      ₱{calculateCustomerTotal(credits[customerDetailDialog.customer]).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="error.dark">
                      Current Unpaid
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Grid container spacing={4}>
            {/* Left side - Actions */}
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white', height: 'fit-content' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  Quick Actions
                </Typography>
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddCreditToCustomer(customerDetailDialog.customer)}
                    sx={{ 
                      borderRadius: 3, 
                      py: 1.5,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3d8bfe 0%, #00d4fe 100%)',
                        boxShadow: '0 6px 20px rgba(79, 172, 254, 0.6)',
                      }
                    }}
                    fullWidth
                    size="large"
                  >
                    Add New Credit
                  </Button>
                  
                  {customerDetailDialog.customer && credits[customerDetailDialog.customer] && 
                   calculateCustomerTotal(credits[customerDetailDialog.customer]) > 0 && (
                    <Button
                      variant="contained"
                      startIcon={<PaymentIcon />}
                      onClick={() => handlePayAllCredits(customerDetailDialog.customer)}
                      sx={{ 
                        borderRadius: 3, 
                        py: 1.5,
                        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        boxShadow: '0 4px 15px rgba(17, 153, 142, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #0f8b82 0%, #32d470 100%)',
                          boxShadow: '0 6px 20px rgba(17, 153, 142, 0.6)',
                        }
                      }}
                      fullWidth
                      size="large"
                    >
                      Pay All Credit
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    startIcon={<ExportIcon />}
                    sx={{ 
                      borderRadius: 3, 
                      py: 1.5,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.50',
                        borderColor: 'primary.dark',
                      }
                    }}
                    fullWidth
                    size="large"
                  >
                    Export Records
                  </Button>
                </Stack>
              </Card>
            </Grid>

            {/* Right side - Credit Records */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, bgcolor: 'white', overflow: 'hidden' }}>
                <Box sx={{ p: 3, bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    Credit Records
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage all credit transactions for this customer
                  </Typography>
                </Box>
                
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {customerDetailDialog.customer && credits[customerDetailDialog.customer] && credits[customerDetailDialog.customer].length > 0 ? (
                    <List sx={{ p: 0 }}>
                      {credits[customerDetailDialog.customer].map((credit, index) => (
                        <ListItem 
                          key={credit.id} 
                          sx={{ 
                            px: 3, 
                            py: 2,
                            borderBottom: index < credits[customerDetailDialog.customer].length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            '&:hover': {
                              bgcolor: 'grey.50'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Typography variant="body1" fontWeight={600}>
                                  {credit.description}
                                </Typography>
                                <Chip
                                  label={credit.status.toUpperCase()}
                                  color={credit.status === 'paid' ? 'success' : 'error'}
                                  size="small"
                                  icon={credit.status === 'paid' ? <PaidIcon /> : <UnpaidIcon />}
                                  sx={{ fontWeight: 600 }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CalendarIcon sx={{ fontSize: 16 }} />
                                  {new Date(credit.date).toLocaleDateString()}
                                </Typography>
                                <Typography variant="h6" fontWeight={700} color={credit.status === 'paid' ? 'success.main' : 'error.main'}>
                                  ₱{credit.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                            </Box>
                            <Stack direction="row" spacing={1}>
                              {credit.status === 'unpaid' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<PaymentIcon />}
                                  onClick={() => handleMarkPaid(customerDetailDialog.customer, credit)}
                                  sx={{ borderRadius: 2 }}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<EditIcon />}
                                onClick={() => handleEditCredit(customerDetailDialog.customer, credit)}
                                sx={{ borderRadius: 2 }}
                              >
                                Edit
                              </Button>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteCredit(customerDetailDialog.customer, credit.id)}
                                sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <Avatar sx={{ bgcolor: 'grey.100', width: 64, height: 64, mx: 'auto', mb: 2 }}>
                        <CreditIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                      </Avatar>
                      <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                        No Credit Records
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        This customer doesn't have any credit records yet.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddCreditToCustomer(customerDetailDialog.customer)}
                        sx={{ borderRadius: 3 }}
                      >
                        Add First Credit
                      </Button>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setCustomerDetailDialog({ open: false, customer: '' })} 
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Credit to Customer Dialog */}
      <Dialog
        open={addCreditDialog.open && !!addCreditDialog.customer}
        onClose={() => setAddCreditDialog({ open: false, customer: '' })}
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
        {/* Header with gradient background */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.3)', 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.4)'
              }}
            >
              <AddIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: '#2d3748' }}>
                Add Credit Record
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8, color: '#4a5568' }}>
                Create a new credit entry for {addCreditDialog.customer}
              </Typography>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: 'grey.50' }}>
          <Grid container spacing={4}>
            {/* Left side - Form */}
            <Grid item xs={12} md={8}>
              <Card sx={{ p: 4, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary' }}>
                  Credit Details
                </Typography>
                
                <Stack spacing={4}>
                  <TextField
                    fullWidth
                    label="Credit Amount"
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon color="success" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'success.main',
                          },
                        },
                      }
                    }}
                    autoFocus
                  />
                  
                  <TextField
                    fullWidth
                    label="Description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What is this credit for? (e.g., Product purchase, Service fee, etc.)"
                    multiline
                    rows={4}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 3,
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      }
                    }}
                  />
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24 }}>
                        <Typography variant="caption" fontWeight={700}>!</Typography>
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                        Credit Information
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="warning.dark">
                      This credit will be marked as "unpaid" by default. You can mark it as paid later when the customer settles the amount.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* Right side - Summary */}
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                {/* Credit Summary */}
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
                    Credit Summary
                  </Typography>
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.100', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Customer
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {addCreditDialog.customer}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'success.50', mb: 2 }}>
                    <Typography variant="body2" color="success.dark" sx={{ mb: 1 }}>
                      Amount
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      ₱{newAmount ? Number(newAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'info.50' }}>
                    <Typography variant="body2" color="info.dark" sx={{ mb: 1 }}>
                      Status
                    </Typography>
                    <Chip 
                      label="UNPAID" 
                      color="error" 
                      size="small" 
                      icon={<UnpaidIcon />}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Card>

                {/* Customer Stats */}
                <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
                    Customer Stats
                  </Typography>
                  {addCreditDialog.customer && credits[addCreditDialog.customer] && (
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'primary.50' }}>
                          <Typography variant="h6" fontWeight={700} color="primary.main">
                            {credits[addCreditDialog.customer].length}
                          </Typography>
                          <Typography variant="caption" color="primary.dark">
                            Existing Credits
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'error.50' }}>
                          <Typography variant="h6" fontWeight={700} color="error.main">
                            ₱{calculateCustomerTotal(credits[addCreditDialog.customer]).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" color="error.dark">
                            Current Unpaid
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 4, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setAddCreditDialog({ open: false, customer: '' })} 
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
            size="large"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCreditToCustomer}
            startIcon={<AddIcon />}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              color: '#2d3748',
              boxShadow: '0 4px 15px rgba(168, 237, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #96e6e1 0%, #fcc9d9 100%)',
                boxShadow: '0 6px 20px rgba(168, 237, 234, 0.6)',
              }
            }}
            disabled={!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0}
            size="large"
          >
            Add Credit Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Credit Dialog */}
      <Dialog
        open={editCreditDialog.open && !!editCreditDialog.customer && !!editCreditDialog.credit}
        onClose={() => setEditCreditDialog({ open: false, customer: '' })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <EditIcon />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Edit Credit for {editCreditDialog.customer}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              multiline
              rows={3}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditCreditDialog({ open: false, customer: '' })} sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditedCredit}
            startIcon={<EditIcon />}
            sx={{ borderRadius: 3 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!deleteDialog} 
        onClose={() => setDeleteDialog(null)}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'error.main' }}>
              <DeleteIcon />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Confirm Delete
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this credit record? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setDeleteDialog(null)}
            sx={{ borderRadius: 3 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={confirmDeleteCredit}
            sx={{ borderRadius: 3 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay All Confirmation Dialog */}
      <Dialog
        open={payAllDialog.open}
        onClose={() => setPayAllDialog({ ...payAllDialog, open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'success.main' }}>
              <CheckCircleIcon />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Confirm Payment
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark all unpaid credits for <strong>{payAllDialog.customer}</strong> as paid? This action will log a general sale for the total amount of ₱{payAllDialog.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setPayAllDialog({ ...payAllDialog, open: false })}
            sx={{ borderRadius: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              confirmPayAllCredits(payAllDialog.customer);
              setPayAllDialog({ ...payAllDialog, open: false });
            }}
            sx={{ borderRadius: 3 }}
          >
            Confirm Payment
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

export default CustomerCredit; 
