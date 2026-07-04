import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
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
} from '@mui/icons-material';

const drawerWidth = 220;

interface LayoutProps {
  children: React.ReactNode;
}

const KdsLogoMark: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      flexShrink: 0,
      userSelect: 'none',
    }}
  >
    <CartIcon sx={{ fontSize: size, color: 'primary.main' }} />
    <Typography
      sx={{
        fontWeight: 900,
        letterSpacing: 2,
        color: 'primary.main',
        fontSize: Math.max(16, Math.round(size * 0.5)),
        lineHeight: 1,
      }}
    >
      KDS
    </Typography>
  </Box>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const menuItems = [
    { text: 'Basket', icon: <CartIcon />, path: '/' },
    { text: 'Sales Record', icon: <AssessmentIcon />, path: '/sales' },
    { text: 'Gross Sales', icon: <TrendingUpIcon />, path: '/gross-sales' },
    { text: 'Manage Products', icon: <InventoryIcon />, path: '/products' },
    { text: 'Receipts', icon: <ReceiptIcon />, path: '/receipts' },
    { text: 'Customer Credit', icon: <WalletIcon />, path: '/customer-credit' },
    { text: 'Staff', icon: <PeopleIcon />, path: '/staff' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <Box sx={{ mr: 1 }}>
          <KdsLogoMark size={40} />
        </Box>
      </Toolbar>
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              bgcolor: location.pathname === item.path ? 'primary.100' : 'inherit',
              '&.Mui-selected': {
                bgcolor: 'primary.50',
                color: 'primary.main',
                fontWeight: 700,
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Version 1.21.0 (Updated 2026-07-01)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Coded by Ken
        </Typography>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ mr: 1 }}>
            <KdsLogoMark size={32} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Logout">
            <IconButton
              color="inherit"
              onClick={() => {
                localStorage.removeItem('isAuthenticated');
                navigate('/login');
              }}
              sx={{ ml: 1 }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 
