import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Fade,
  Stack,
  Card,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Login as LoginIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Storefront as StoreIcon,
  Inventory2 as InventoryIcon,
  Insights as InsightsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '../contexts/NotificationContext';
import { DEFAULT_PASSWORD, DEFAULT_USERNAME, getLoginPassword, getLoginUsername, hasCustomLogin } from '../utils/preferences';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const notify = useNotify();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get stored credentials or fallback to default
    const storedUsername = getLoginUsername();
    const storedPassword = getLoginPassword();

    setTimeout(() => {
      if (username === storedUsername && password === storedPassword) {
        // Start fade out animation
        setFadeOut(true);
        // Wait for animation to complete before navigating
        setTimeout(() => {
          localStorage.setItem('isAuthenticated', 'true');
          navigate('/');
        }, 500); // Match this with the transition duration
      } else {
        notify('Invalid username or password', 'error');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Fade in={!fadeOut} timeout={500}>
        <Card
          sx={{
            width: '100%',
            maxWidth: 920,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' },
            overflow: 'hidden',
            boxShadow: '0 24px 48px -12px rgba(16, 24, 22, 0.18)',
            transform: fadeOut ? 'scale(0.98)' : 'scale(1)',
            transition: 'transform 0.5s ease-in-out',
          }}
        >
          {/* Branding */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              p: { xs: 3, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.16)',
                }}
              >
                <StoreIcon />
              </Box>
              <Box>
                <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  Ken-dal Store
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Point of Sale
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography variant="h4" sx={{ mb: 3, lineHeight: 1.25 }}>
                Ring up sales, track stock and credit in one place.
              </Typography>
              <Stack spacing={1.5}>
                {[
                  { icon: <CartIcon fontSize="small" />, text: 'Fast checkout with barcode scanning' },
                  { icon: <InventoryIcon fontSize="small" />, text: 'Inventory and category management' },
                  { icon: <InsightsIcon fontSize="small" />, text: 'Daily and monthly sales reports' },
                ].map((feature) => (
                  <Box key={feature.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, opacity: 0.92 }}>
                    {feature.icon}
                    <Typography variant="body2" fontWeight={500}>
                      {feature.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>

          {/* Form */}
          <Box sx={{ p: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h5" sx={{ mb: 0.5 }}>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your account details to open the register.
            </Typography>

            <form onSubmit={handleLogin}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                  sx={{ py: 1.5 }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>

                {/* Only while the default account is still in use */}
                {!hasCustomLogin() && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    borderRadius: '10px',
                    border: 1,
                    borderColor: 'divider',
                    color: 'text.secondary',
                  }}
                >
                  <AdminIcon fontSize="small" />
                  <Typography variant="body2">
                    Default login: <strong>{DEFAULT_USERNAME}</strong> / <strong>{DEFAULT_PASSWORD}</strong> · change it in Settings
                  </Typography>
                </Box>
                )}
              </Stack>
            </form>
          </Box>
        </Card>
      </Fade>
    </Box>
  );
};

export default Login;
