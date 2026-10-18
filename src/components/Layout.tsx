import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  ShoppingCart as CartIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountBalanceWallet as WalletIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Print as PrintIcon,
  DarkModeOutlined as DarkModeIcon,
  LightModeOutlined as LightModeIcon,
  Storefront as StorefrontIcon,
} from '@mui/icons-material';
import { StoreSettingsContext, ThemeContext } from '../App';
import { useBasket } from '../contexts/BasketContext';
import { usePrinter } from '../contexts/PrinterContext';

const drawerWidth = 248;

type NavItem = { text: string; icon: React.ReactElement; path: string };

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Sell',
    items: [
      { text: 'Basket', icon: <CartIcon />, path: '/' },
      { text: 'Receipts', icon: <ReceiptIcon />, path: '/receipts' },
      { text: 'Customer Credit', icon: <WalletIcon />, path: '/customer-credit' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { text: 'Sales Record', icon: <AssessmentIcon />, path: '/sales' },
      { text: 'Gross Sales', icon: <TrendingUpIcon />, path: '/gross-sales' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { text: 'Products', icon: <InventoryIcon />, path: '/products' },
      { text: 'Staff', icon: <PeopleIcon />, path: '/staff' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ],
  },
];

const useClock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeName } = useContext(StoreSettingsContext);
  const { themeName, setThemeName } = useContext(ThemeContext);
  const { basket } = useBasket();
  const { selectedPrinter } = usePrinter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const now = useClock();

  const basketCount = useMemo(() => basket.reduce((sum, item) => sum + item.quantity, 0), [basket]);
  const isDark = themeName === 'dark';

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, height: 64, flexShrink: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <StorefrontIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} noWrap sx={{ lineHeight: 1.2 }}>
            {storeName || 'My Store'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
            Point of Sale
          </Typography>
        </Box>
      </Box>

      <Box component="nav" sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mt: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1.5, fontSize: '0.6875rem', display: 'block', lineHeight: 2 }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const selected = location.pathname === item.path;
                const showBasketBadge = item.path === '/' && basketCount > 0;
                return (
                  <ListItemButton
                    key={item.path}
                    selected={selected}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    sx={{
                      mb: 0.25,
                      py: 0.875,
                      color: 'text.secondary',
                      '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 },
                      '&:hover': { color: 'text.primary' },
                      '&.Mui-selected': {
                        color: 'primary.main',
                        bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.09),
                        '&:hover': {
                          bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.2 : 0.13),
                        },
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{ fontWeight: selected ? 700 : 500, fontSize: '0.9375rem' }}
                    />
                    {showBasketBadge && (
                      <Chip
                        label={basketCount}
                        size="small"
                        color="primary"
                        sx={{ height: 22, minWidth: 28, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Version 1.25.0 · Updated 2026-10-19
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Coded by Ken
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: (t) => alpha(t.palette.background.default, 0.85),
          backdropFilter: 'blur(8px)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 64 } }}>
          <IconButton
            aria-label="Open navigation"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap sx={{ lineHeight: 1.25 }}>
              {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ lineHeight: 1.25 }}>
              {now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={selectedPrinter ? `Printer: ${selectedPrinter}` : 'Choose a printer in Settings'}>
            <Chip
              icon={<PrintIcon />}
              label={selectedPrinter ? 'Printer ready' : 'No printer'}
              color={selectedPrinter ? 'success' : 'warning'}
              variant="outlined"
              size="small"
              onClick={selectedPrinter ? undefined : () => navigate('/settings')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: 'background.paper' }}
            />
          </Tooltip>
          <Tooltip title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
            <IconButton aria-label="Toggle theme" onClick={() => setThemeName(isDark ? 'light' : 'dark')}>
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Log out">
            <IconButton
              aria-label="Log out"
              onClick={() => {
                localStorage.removeItem('isAuthenticated');
                navigate('/login');
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="aside" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          p: { xs: 1.5, md: 2.5 },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
