import React, { useMemo, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  Button,
  TextField,
  Alert,
  Grid,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Stack,
  LinearProgress,
  Fade,
  Grow,
  Slide,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DateRange as DateRangeIcon,
  Today as TodayIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  AccountBalance as AccountBalanceIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { GrossSalesContext, DailySalesRecord, GrossSalesRecord } from '../App';
import { useTheme } from '@mui/material/styles';

const GROSS_SALES_PASSWORD = 'Anapen73';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={value === index} timeout={300}>
          <Box sx={{ p: 0 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
}

const GrossSales: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const grossSalesContext = useContext(GrossSalesContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [editingDaily, setEditingDaily] = useState<string | null>(null);
  const [editingMonthly, setEditingMonthly] = useState<string | null>(null);
  const [editingYearly, setEditingYearly] = useState<string | null>(null);
  const [dailyExcelYear, setDailyExcelYear] = useState(() => new Date().getFullYear());
  const [dailyExcelMonth, setDailyExcelMonth] = useState(() => new Date().getMonth() + 1);
  const [editForm, setEditForm] = useState<{
    gross: string;
    purchase: string;
    profit: string;
  }>({
    gross: '',
    purchase: '',
    profit: '',
  });

  // Use grossSalesData and dailySalesData from context
  const grossSalesData = grossSalesContext.grossSalesData;
  const dailySalesData = grossSalesContext.dailySalesData;

  const dailyRecordByKey = useMemo(() => {
    const map = new Map<string, DailySalesRecord>();
    for (const record of dailySalesData) {
      map.set(`${record.year}-${record.month}-${record.day}`, record);
    }
    return map;
  }, [dailySalesData]);

  const groupedData = useMemo(() => {
    return grossSalesData.reduce((acc, record) => {
      if (!acc[record.year]) acc[record.year] = [];
      acc[record.year].push(record);
      return acc;
    }, {} as Record<number, GrossSalesRecord[]>);
  }, [grossSalesData]);

  const yearlyTotals = useMemo(() => {
    return Object.keys(groupedData)
      .map((year) => {
        const yearInt = parseInt(year, 10);
        const yearData = groupedData[yearInt] ?? [];
        return {
          year: yearInt,
          gross: yearData.reduce((sum, record) => sum + record.gross, 0),
          purchase: yearData.reduce((sum, record) => sum + record.purchase, 0),
          profit: yearData.reduce((sum, record) => sum + record.profit, 0),
        };
      })
      .sort((a, b) => b.year - a.year);
  }, [groupedData]);

  const overallTotals = useMemo(() => {
    return grossSalesData.reduce(
      (acc, record) => ({
        gross: acc.gross + record.gross,
        purchase: acc.purchase + record.purchase,
        profit: acc.profit + record.profit,
      }),
      { gross: 0, purchase: 0, profit: 0 }
    );
  }, [grossSalesData]);

  // Keep the analytics window stable during a render cycle.
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Calculate profit margin
  const profitMargin = useMemo(() => {
    return overallTotals.gross > 0 ? (overallTotals.profit / overallTotals.gross) * 100 : 0;
  }, [overallTotals.gross, overallTotals.profit]);

  // Daily Analytics Calculations
  const currentDay = currentDate.getDate();
  
  // Get current day data
  const currentDayData = useMemo(() => {
    return dailyRecordByKey.get(`${currentYear}-${currentMonth}-${currentDay}`);
  }, [currentDay, currentMonth, currentYear, dailyRecordByKey]);

  // Get yesterday's data
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYear = yesterday.getFullYear();
  const yesterdayMonth = yesterday.getMonth() + 1;
  const yesterdayDay = yesterday.getDate();
  const yesterdayData = useMemo(() => {
    return dailyRecordByKey.get(`${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`);
  }, [dailyRecordByKey, yesterdayDay, yesterdayMonth, yesterdayYear]);

  // Calculate daily growth percentage
  const dailyGrowthPercentage = useMemo(() => {
    return yesterdayData && currentDayData
      ? ((currentDayData.gross - yesterdayData.gross) / yesterdayData.gross) * 100
      : 0;
  }, [currentDayData, yesterdayData]);

  const dailyExcelYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    for (const record of dailySalesData) years.add(record.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, dailySalesData]);

  const dailyExcelRows = useMemo(() => {
    const rows: Array<{
      key: string;
      year: number;
      month: number;
      monthName: string;
      day: number;
      dayName: string;
      date: Date;
      dateLabel: string;
      record: DailySalesRecord | null;
      monthRowSpan: number;
      isFirstOfMonth: boolean;
    }> = [];

    const month = dailyExcelMonth;
    {
      const daysInMonth = new Date(dailyExcelYear, month, 0).getDate();
      const monthName = new Date(dailyExcelYear, month - 1, 1).toLocaleDateString('default', { month: 'long' });
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = `${dailyExcelYear}-${month}-${day}`;
        const record = dailyRecordByKey.get(key) ?? null;
        const date = new Date(dailyExcelYear, month - 1, day);
        const dayName = record?.dayName ?? date.toLocaleDateString('default', { weekday: 'long' });
        rows.push({
          key,
          year: dailyExcelYear,
          month,
          monthName,
          day,
          dayName,
          date,
          dateLabel: date.toLocaleDateString(),
          record,
          monthRowSpan: daysInMonth,
          isFirstOfMonth: day === 1,
        });
      }
    }

    return rows;
  }, [dailyExcelMonth, dailyExcelYear, dailyRecordByKey]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handlePasswordSubmit = () => {
    if (password === GROSS_SALES_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordDialogOpen(false);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCloseDialog = () => {
    navigate('/');
  };

  // Enhanced edit handlers for different record types
  const handleEditDaily = (record: DailySalesRecord) => {
    const recordKey = `${record.year}-${record.month}-${record.day}`;
    setEditingDaily(recordKey);
    setEditForm({
      gross: record.gross.toString(),
      purchase: record.purchase.toString(),
      profit: record.profit.toString(),
    });
  };

  const handleEditMonthly = (record: GrossSalesRecord) => {
    const recordKey = `${record.year}-${record.month}`;
    setEditingMonthly(recordKey);
    setEditForm({
      gross: record.gross.toString(),
      purchase: record.purchase.toString(),
      profit: record.profit.toString(),
    });
  };

  const handleEditYearly = (yearData: { year: number; gross: number; purchase: number; profit: number }) => {
    const recordKey = yearData.year.toString();
    setEditingYearly(recordKey);
    setEditForm({
      gross: yearData.gross.toString(),
      purchase: yearData.purchase.toString(),
      profit: yearData.profit.toString(),
    });
  };

  const handleSaveDaily = (record: DailySalesRecord) => {
    const updatedRecord = {
      ...record,
      gross: parseFloat(editForm.gross) || 0,
      purchase: parseFloat(editForm.purchase) || 0,
      profit: parseFloat(editForm.gross) - parseFloat(editForm.purchase) || 0,
    };

    // Check if record already exists
    const existingRecordIndex = dailySalesData.findIndex(r => 
      r.year === record.year && r.month === record.month && r.day === record.day
    );

    let updatedDailyData: DailySalesRecord[];
    
    if (existingRecordIndex >= 0) {
      // Update existing record
      updatedDailyData = dailySalesData.map(r => 
        r.year === record.year && r.month === record.month && r.day === record.day 
          ? updatedRecord 
          : r
      );
    } else {
      // Add new record
      updatedDailyData = [...dailySalesData, updatedRecord];
    }

    grossSalesContext.setDailySalesData(updatedDailyData);
    localStorage.setItem('pos_daily_sales', JSON.stringify(updatedDailyData));
    
    setEditingDaily(null);
    setEditForm({ gross: '', purchase: '', profit: '' });
  };

  const handleSaveMonthly = (record: GrossSalesRecord) => {
    const updatedRecord = {
      ...record,
      gross: parseFloat(editForm.gross) || 0,
      purchase: parseFloat(editForm.purchase) || 0,
      profit: parseFloat(editForm.gross) - parseFloat(editForm.purchase) || 0,
    };

    const updatedGrossData = grossSalesData.map(r => 
      r.year === record.year && r.month === record.month 
        ? updatedRecord 
        : r
    );

    grossSalesContext.setGrossSalesData(updatedGrossData);
    localStorage.setItem('pos_gross_sales', JSON.stringify(updatedGrossData));
    
    setEditingMonthly(null);
    setEditForm({ gross: '', purchase: '', profit: '' });
  };

  const handleSaveYearly = (year: number) => {
    // For yearly data, we need to update all monthly records for that year
    const yearRecords = grossSalesData.filter(r => r.year === year);
    const totalOldGross = yearRecords.reduce((sum, r) => sum + r.gross, 0);
    const totalOldPurchase = yearRecords.reduce((sum, r) => sum + r.purchase, 0);
    
    const newGross = parseFloat(editForm.gross) || 0;
    const newPurchase = parseFloat(editForm.purchase) || 0;
    
    // Calculate the difference and distribute proportionally
    const grossDiff = newGross - totalOldGross;
    const purchaseDiff = newPurchase - totalOldPurchase;
    
    const updatedGrossData = grossSalesData.map(record => {
      if (record.year === year) {
        const proportion = totalOldGross > 0 ? record.gross / totalOldGross : 1 / yearRecords.length;
        return {
          ...record,
          gross: record.gross + (grossDiff * proportion),
          purchase: record.purchase + (purchaseDiff * proportion),
          profit: (record.gross + (grossDiff * proportion)) - (record.purchase + (purchaseDiff * proportion)),
        };
      }
      return record;
    });

    grossSalesContext.setGrossSalesData(updatedGrossData);
    localStorage.setItem('pos_gross_sales', JSON.stringify(updatedGrossData));
    
    setEditingYearly(null);
    setEditForm({ gross: '', purchase: '', profit: '' });
  };

  const handleCancelEdit = () => {
    setEditingDaily(null);
    setEditingMonthly(null);
    setEditingYearly(null);
    setEditForm({ gross: '', purchase: '', profit: '' });
  };

  const handleFormChange = (field: 'gross' | 'purchase' | 'profit', value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isAuthenticated) {
    return (
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => {}} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 15px 30px rgba(102, 126, 234, 0.3)',
            overflow: 'hidden',
            position: 'relative',
          }
        }}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
      >
        {/* X Button */}
        <IconButton
          onClick={handleCloseDialog}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.15)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            width: 40,
            height: 40,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.25)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Box sx={{ 
          textAlign: 'center', 
          pt: 3, 
          pb: 1,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }
        }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Grow in timeout={600}>
              <Avatar sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)', 
                mx: 'auto', 
                mb: 2, 
                width: 64, 
                height: 64,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}>
                <LockIcon sx={{ fontSize: 32, color: 'white' }} />
              </Avatar>
            </Grow>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1, letterSpacing: 0.5 }}>
              Secure Access
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, px: 2 }}>
              Enter password to access financial dashboard
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: 3, pb: 3 }}>
          <Box sx={{ 
            p: 3, 
            bgcolor: 'rgba(255,255,255,0.1)', 
            borderRadius: 3, 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handlePasswordKeyDown}
              variant="outlined"
              error={!!error}
              helperText={error}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.95)',
                  borderRadius: 2,
                  fontSize: '1rem',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderWidth: 2,
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255,255,255,0.8)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(0,0,0,0.7)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  '&.Mui-focused': {
                    color: 'rgba(0,0,0,0.8)',
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  mt: 1,
                  textAlign: 'center',
                }
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ 
                      color: 'rgba(0,0,0,0.7)',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.05)',
                      }
                    }}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
          </Box>
          
          <Button
            fullWidth
            variant="contained"
            onClick={handlePasswordSubmit}
            sx={{
              mt: 3,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 700,
              borderRadius: 3,
              py: 1.5,
              fontSize: '1rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              },
              '&:active': {
                transform: 'translateY(0px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Access Dashboard
          </Button>
        </Box>
      </Dialog>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, md: 2.5 }, 
      minHeight: '100vh',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    }}>
      {/* Compact Header */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 2,
            p: 2.5,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
          }}>
            <Box sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              p: 1.5,
              mr: 2,
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
            }}>
              <TrendingUpIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
                Financial Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8 }}>
                Sales analytics and performance insights
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              bgcolor: profitMargin > 0 ? 'success.main' : 'error.main',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 2,
              boxShadow: 1,
            }}>
              {profitMargin > 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Profit Margin
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {profitMargin.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Compact Summary Section */}
      <Grow in timeout={800}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Total Revenue Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', 
              color: 'white', 
              height: '100%',
              boxShadow: '0 8px 25px rgba(76, 175, 80, 0.25)',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 35px rgba(76, 175, 80, 0.35)',
              }
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    backdropFilter: 'blur(10px)',
                  }}>
                    <AccountBalanceIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, mb: 0.5 }}>
                      Total Revenue
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {formatCurrency(overallTotals.gross)}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', mb: 1.5 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Expenses:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(overallTotals.purchase)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Net Profit:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(overallTotals.profit)}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={profitMargin} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'rgba(255,255,255,0.8)',
                        borderRadius: 3,
                      }
                    }} 
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Performance */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #2196F3 0%, #1976d2 100%)', 
              color: 'white', 
              height: '100%',
              boxShadow: '0 8px 25px rgba(33, 150, 243, 0.25)',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 35px rgba(33, 150, 243, 0.35)',
              }
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    backdropFilter: 'blur(10px)',
                  }}>
                    <TodayIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, mb: 0.5 }}>
                      Today's Sales
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {formatCurrency(currentDayData?.gross || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', mb: 1.5 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Date:</Typography>
                    <Chip 
                      label={currentDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })} 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        fontWeight: 600,
                        backdropFilter: 'blur(10px)',
                        fontSize: '0.75rem',
                      }} 
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Profit:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(currentDayData?.profit || 0)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    p: 1, 
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.8, textAlign: 'center', display: 'block' }}>
                      {currentDayData ? 'Sales recorded today' : 'No sales recorded today'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily Growth Analytics */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              borderRadius: 3, 
              background: (dailyGrowthPercentage >= 0 
                ? 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)'
                : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'), 
              color: 'white', 
              height: '100%',
              boxShadow: (dailyGrowthPercentage >= 0 
                ? '0 8px 25px rgba(255, 152, 0, 0.25)'
                : '0 8px 25px rgba(244, 67, 54, 0.25)'),
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (dailyGrowthPercentage >= 0 
                  ? '0 12px 35px rgba(255, 152, 0, 0.35)'
                  : '0 12px 35px rgba(244, 67, 54, 0.35)'),
              }
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    p: 1,
                    backdropFilter: 'blur(10px)',
                  }}>
                    <ShowChartIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, mb: 0.5 }}>
                      Daily Growth
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {yesterdayData && currentDayData 
                        ? `${dailyGrowthPercentage >= 0 ? '+' : ''}${dailyGrowthPercentage.toFixed(1)}%`
                        : 'N/A'
                      }
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', mb: 1.5 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Yesterday:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(yesterdayData?.gross || 0)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Difference:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentDayData && yesterdayData 
                        ? `${dailyGrowthPercentage >= 0 ? '+' : ''}${formatCurrency(currentDayData.gross - yesterdayData.gross)}`
                        : 'N/A'
                      }
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    p: 1, 
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.8, textAlign: 'center', display: 'block' }}>
                      {dailyGrowthPercentage > 0 ? '📈 Daily improvement' : 
                       dailyGrowthPercentage < 0 ? '📉 Daily decline' : '➖ Same as yesterday'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grow>

      {/* Compact Tabs Section */}
      <Grow in timeout={1000}>
        <Card sx={{ 
          borderRadius: 3, 
          overflow: 'hidden',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.palette.divider}`,
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            p: 2.5,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }
          }}>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <AssessmentIcon sx={{ fontSize: 24 }} />
                Financial Reports
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Detailed analysis and historical data
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.02)' 
              : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              sx={{ 
                px: 2,
                minHeight: 48,
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  minHeight: 48,
                  borderRadius: 2,
                  mx: 0.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(102, 126, 234, 0.15)',
                    color: 'primary.main',
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }
              }}
            >
              <Tab 
                label="Daily Analytics" 
                icon={<TodayIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ gap: 1 }}
              />
              <Tab 
                label="Monthly Analytics" 
                icon={<CalendarIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ gap: 1 }}
              />
              <Tab 
                label="Yearly Overview" 
                icon={<DateRangeIcon fontSize="small" />} 
                iconPosition="start"
                sx={{ gap: 1 }}
              />
            </Tabs>
          </Box>

          {/* Daily Analytics Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 2 }}>
              {/* Today's Summary */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 2,
                  p: 2,
                  background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(21, 101, 192, 0.08) 100%)',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'info.200',
                  boxShadow: '0 2px 10px rgba(33, 150, 243, 0.1)',
                }}>
                  <Avatar sx={{ 
                    bgcolor: 'info.main', 
                    color: 'white',
                    width: 40,
                    height: 40,
                    boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)',
                  }}>
                    <TodayIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} color="info.main">
                      Today's Performance
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip 
                      label={formatCurrency(currentDayData?.gross || 0)}
                      color="success"
                      variant="filled"
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                    {yesterdayData && currentDayData && (
                      <Chip 
                        label={`${dailyGrowthPercentage >= 0 ? '+' : ''}${dailyGrowthPercentage.toFixed(1)}%`}
                        color={dailyGrowthPercentage >= 0 ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    )}
                  </Stack>
                </Box>

                {/* Today's Details */}
                {currentDayData ? (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                        <Typography variant="h4" fontWeight={700} color="success.main">
                          {formatCurrency(currentDayData.gross)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Gross Sales
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                        <Typography variant="h4" fontWeight={700} color="warning.main">
                          {formatCurrency(currentDayData.purchase)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expenses
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                        <Typography variant="h4" fontWeight={700} color="primary.main">
                          {formatCurrency(currentDayData.profit)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Net Profit
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    No sales recorded for today yet. Start selling to see daily analytics!
                  </Alert>
                )}
              </Box>

              {/* Daily Records Table */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon color="primary" />
                  Daily Records (Excel View)
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                  {dailyExcelYears.map((year) => (
                    <Chip
                      key={year}
                      label={year}
                      clickable
                      color={dailyExcelYear === year ? 'primary' : 'default'}
                      variant={dailyExcelYear === year ? 'filled' : 'outlined'}
                      onClick={() => setDailyExcelYear(year)}
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Stack>
                <Tabs
                  value={dailyExcelMonth}
                  onChange={(_, next) => setDailyExcelMonth(next)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    mb: 2,
                    minHeight: 40,
                    '& .MuiTab-root': { minHeight: 40, fontWeight: 700 },
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <Tab
                      key={month}
                      label={new Date(dailyExcelYear, month - 1, 1).toLocaleDateString('default', { month: 'short' })}
                      value={month}
                    />
                  ))}
                </Tabs>
                <TableContainer component={Paper} elevation={2} sx={{ 
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ 
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: 'text.primary',
                          py: 1.5,
                        }
                      }}>
                        <TableCell>Month</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Day</TableCell>
                        <TableCell align="right">Gross Sales</TableCell>
                        <TableCell align="right">Expenses</TableCell>
                        <TableCell align="right">Net Profit</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyExcelRows.map((row) => {
                        const isEditing = editingDaily === row.key;
                        const record: DailySalesRecord = row.record ?? {
                          year: row.year,
                          month: row.month,
                          day: row.day,
                          dayName: row.dayName,
                          monthName: row.monthName,
                          gross: 0,
                          purchase: 0,
                          profit: 0,
                          date: row.date,
                        };

                        const editedProfit = (parseFloat(editForm.gross) || 0) - (parseFloat(editForm.purchase) || 0);

                        return (
                          <TableRow
                            key={row.key}
                            sx={{
                              '&:hover': { bgcolor: 'action.hover' },
                              transition: 'all 0.15s ease',
                              '& .MuiTableCell-root': {
                                py: 1.5,
                                fontSize: '0.85rem',
                              },
                              bgcolor:
                                row.year === currentYear && row.month === currentMonth && row.day === currentDay
                                  ? 'rgba(33, 150, 243, 0.05)'
                                  : 'inherit',
                            }}
                          >
                            {row.isFirstOfMonth && (
                              <TableCell
                                rowSpan={row.monthRowSpan}
                                sx={{
                                  verticalAlign: 'top',
                                  fontWeight: 800,
                                  bgcolor: 'rgba(102, 126, 234, 0.06)',
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" fontWeight={800}>
                                    {row.monthName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {row.year}
                                  </Typography>
                                </Box>
                              </TableCell>
                            )}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ 
                                  width: 28, 
                                  height: 28, 
                                  bgcolor: row.year === currentYear && row.month === currentMonth && row.day === currentDay ? 'info.main' : 'secondary.main', 
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  boxShadow: 1,
                                }}>
                                  {row.day}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={700}>
                                    {row.dateLabel}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {row.year === currentYear && row.month === currentMonth && row.day === currentDay ? 'Today' : row.dayName}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {row.dayName}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={editForm.gross}
                                  onChange={(e) => handleFormChange('gross', e.target.value)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                  sx={{ width: 100 }}
                                />
                              ) : (
                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                  {formatCurrency(record.gross)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={editForm.purchase}
                                  onChange={(e) => handleFormChange('purchase', e.target.value)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                  sx={{ width: 100 }}
                                />
                              ) : (
                                <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                  {formatCurrency(record.purchase)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {isEditing ? (
                                <Typography variant="body2" sx={{ color: editedProfit >= 0 ? 'primary.main' : 'error.main', fontWeight: 600 }}>
                                  {formatCurrency(editedProfit)}
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: record.profit >= 0 ? 'primary.main' : 'error.main', fontWeight: 600 }}>
                                  {formatCurrency(record.profit)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {isEditing ? (
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  <Tooltip title="Save">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleSaveDaily(record)}
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={handleCancelEdit}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              ) : (
                                <Tooltip title={row.record ? 'Edit' : 'Add Data'}>
                                  <IconButton
                                    size="small"
                                    color={row.record ? 'primary' : 'secondary'}
                                    onClick={() => handleEditDaily(record)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </TabPanel>

          {/* Monthly View Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 2 }}>
              {Object.keys(groupedData).length > 0 ? (
                Object.keys(groupedData)
                  .sort((a, b) => parseInt(b) - parseInt(a))
                  .map((year, yearIndex) => (
                    <Fade in timeout={600 + yearIndex * 150} key={year}>
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          mb: 2,
                          p: 2,
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'primary.200',
                          boxShadow: '0 2px 10px rgba(102, 126, 234, 0.1)',
                        }}>
                          <Avatar sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            width: 40,
                            height: 40,
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                          }}>
                            <CalendarIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={700} color="primary.main">
                              {year}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Financial performance overview
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip 
                              label={`${groupedData[parseInt(year)].length} months`}
                              color="primary"
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                            <Chip 
                              label={formatCurrency(groupedData[parseInt(year)].reduce((sum, record) => sum + record.gross, 0))}
                              color="success"
                              variant="filled"
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                          </Stack>
                        </Box>
                        
                        <TableContainer component={Paper} elevation={2} sx={{ 
                          borderRadius: 2,
                          overflow: 'hidden',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ 
                                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                '& .MuiTableCell-head': {
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  color: 'text.primary',
                                  py: 1.5,
                                }
                              }}>
                                <TableCell>Month</TableCell>
                                <TableCell align="right">Gross Sales</TableCell>
                                <TableCell align="right">Expenses</TableCell>
                                <TableCell align="right">Net Profit</TableCell>
                                <TableCell align="right">Date</TableCell>
                                <TableCell align="center">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {groupedData[parseInt(year)]
                                .sort((a, b) => b.month - a.month)
                                .map((record, index) => {
                                  const recordKey = `${record.year}-${record.month}`;
                                  const isEditing = editingMonthly === recordKey;
                                  
                                  return (
                                    <TableRow key={`${record.year}-${record.month}`} sx={{ 
                                      '&:hover': { 
                                        bgcolor: 'action.hover',
                                        transform: 'scale(1.005)',
                                      },
                                      transition: 'all 0.15s ease',
                                      '& .MuiTableCell-root': {
                                        py: 1.5,
                                        fontSize: '0.85rem',
                                      }
                                    }}>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                          <Avatar sx={{ 
                                            width: 28, 
                                            height: 28, 
                                            bgcolor: 'secondary.main', 
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            boxShadow: 1,
                                          }}>
                                            {record.monthName.charAt(0)}
                                          </Avatar>
                                          <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                              {record.monthName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {record.year}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </TableCell>
                                      <TableCell align="right">
                                        {isEditing ? (
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={editForm.gross}
                                            onChange={(e) => handleFormChange('gross', e.target.value)}
                                            inputProps={{ min: 0, step: 0.01 }}
                                            sx={{ width: 120 }}
                                          />
                                        ) : (
                                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                            {formatCurrency(record.gross)}
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="right">
                                        {isEditing ? (
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={editForm.purchase}
                                            onChange={(e) => handleFormChange('purchase', e.target.value)}
                                            inputProps={{ min: 0, step: 0.01 }}
                                            sx={{ width: 120 }}
                                          />
                                        ) : (
                                          <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                            {formatCurrency(record.purchase)}
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="right">
                                        {isEditing ? (
                                          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                            {formatCurrency((parseFloat(editForm.gross) || 0) - (parseFloat(editForm.purchase) || 0))}
                                          </Typography>
                                        ) : (
                                          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                            {formatCurrency(record.profit)}
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="right">
                                        <Chip 
                                          label={record.date.toLocaleDateString()}
                                          variant="outlined"
                                          size="small"
                                          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                                        />
                                      </TableCell>
                                      <TableCell align="center">
                                        {isEditing ? (
                                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                            <Tooltip title="Save">
                                              <IconButton
                                                size="small"
                                                color="success"
                                                onClick={() => handleSaveMonthly(record)}
                                              >
                                                <SaveIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Cancel">
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={handleCancelEdit}
                                              >
                                                <CancelIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        ) : (
                                          <Tooltip title="Edit">
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => handleEditMonthly(record)}
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Fade>
                  ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Avatar sx={{ 
                    bgcolor: 'grey.100', 
                    mx: 'auto', 
                    mb: 2, 
                    width: 56, 
                    height: 56,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  }}>
                    <CalendarIcon sx={{ fontSize: 28, color: 'grey.400' }} />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary" gutterBottom fontWeight={600}>
                    No Monthly Data Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Start by exporting sales to generate reports
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                    }}
                  >
                    Go to Sales Record
                  </Button>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Yearly Summary Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 2 }}>
              {yearlyTotals.length > 0 ? (
                <TableContainer component={Paper} elevation={2} sx={{ 
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ 
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'text.primary',
                          py: 2,
                        }
                      }}>
                        <TableCell>Year</TableCell>
                        <TableCell align="right">Gross Sales</TableCell>
                        <TableCell align="right">Expenses</TableCell>
                        <TableCell align="right">Net Profit</TableCell>
                        <TableCell align="right">Profit Margin</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearlyTotals.map((yearData, index) => {
                        const recordKey = yearData.year.toString();
                        const isEditing = editingYearly === recordKey;
                        
                        return (
                          <Fade in timeout={400 + index * 150} key={yearData.year}>
                            <TableRow sx={{ 
                              '&:hover': { 
                                bgcolor: 'action.hover',
                                transform: 'scale(1.005)',
                              },
                              transition: 'all 0.15s ease',
                              '& .MuiTableCell-root': {
                                py: 2,
                                fontSize: '0.9rem',
                              }
                            }}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ 
                                    bgcolor: 'primary.main', 
                                    color: 'white',
                                    width: 36,
                                    height: 36,
                                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                                  }}>
                                    <DateRangeIcon sx={{ fontSize: 18 }} />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1" fontWeight={700}>
                                      {yearData.year}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {groupedData[yearData.year]?.length || 0} months recorded
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                {isEditing ? (
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={editForm.gross}
                                    onChange={(e) => handleFormChange('gross', e.target.value)}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    sx={{ width: 140 }}
                                  />
                                ) : (
                                  <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 700 }}>
                                    {formatCurrency(yearData.gross)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {isEditing ? (
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={editForm.purchase}
                                    onChange={(e) => handleFormChange('purchase', e.target.value)}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    sx={{ width: 140 }}
                                  />
                                ) : (
                                  <Typography variant="body1" sx={{ color: 'warning.main', fontWeight: 700 }}>
                                    {formatCurrency(yearData.purchase)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {isEditing ? (
                                  <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                    {formatCurrency((parseFloat(editForm.gross) || 0) - (parseFloat(editForm.purchase) || 0))}
                                  </Typography>
                                ) : (
                                  <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                    {formatCurrency(yearData.profit)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Chip 
                                  label={isEditing 
                                    ? `${(((parseFloat(editForm.gross) || 0) - (parseFloat(editForm.purchase) || 0)) / (parseFloat(editForm.gross) || 1) * 100).toFixed(1)}%`
                                    : `${((yearData.profit / yearData.gross) * 100).toFixed(1)}%`
                                  }
                                  color={isEditing 
                                    ? ((parseFloat(editForm.gross) || 0) - (parseFloat(editForm.purchase) || 0)) > 0 ? 'success' : 'error'
                                    : yearData.profit > 0 ? 'success' : 'error'
                                  }
                                  variant="filled"
                                  size="small"
                                  sx={{ 
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    px: 1.5,
                                    boxShadow: 1,
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Tooltip title="Save">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => handleSaveYearly(yearData.year)}
                                      >
                                        <SaveIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={handleCancelEdit}
                                      >
                                        <CancelIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                ) : (
                                  <Tooltip title="Edit">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleEditYearly(yearData)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          </Fade>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Avatar sx={{ 
                    bgcolor: 'grey.100', 
                    mx: 'auto', 
                    mb: 2, 
                    width: 56, 
                    height: 56,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  }}>
                    <DateRangeIcon sx={{ fontSize: 28, color: 'grey.400' }} />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary" gutterBottom fontWeight={600}>
                    No Yearly Data Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Yearly summaries will appear here once you start recording sales
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                    }}
                  >
                    Get Started
                  </Button>
                </Box>
              )}
            </Box>
          </TabPanel>
        </Card>
      </Grow>

      {/* Compact Info Alert */}
      <Fade in timeout={1200}>
        <Alert 
          severity="info" 
          sx={{ 
            mt: 2, 
            borderRadius: 2,
            p: 2,
            boxShadow: '0 2px 15px rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.2)',
            '& .MuiAlert-icon': {
              fontSize: 20,
            }
          }}
          icon={<AssessmentIcon />}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            How Financial Tracking Works
          </Typography>
          <Typography variant="body2">
            Financial data is automatically recorded when you export sales from the Sales Record page. 
            The system tracks daily totals, monthly aggregations, and calculates yearly summaries for comprehensive reporting.
          </Typography>
        </Alert>
      </Fade>
    </Box>
  );
};

export default GrossSales; 
