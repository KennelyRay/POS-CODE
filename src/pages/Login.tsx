import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Fade,
  Avatar,
  Stack,
  Card,
  Grid,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Login as LoginIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Store as StoreIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [error, setError] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get stored credentials or fallback to default
    const storedUsername = localStorage.getItem('pos_username') || 'Admin';
    const storedPassword = localStorage.getItem('pos_password') || '000000';

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
        setError({
          open: true,
          message: 'Invalid username or password',
        });
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        p: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(30px)',
        }}
      />

      <Fade in={!fadeOut} timeout={500}>
        <Card
          sx={{
            width: '100%',
            maxWidth: 1200,
            height: 'auto',
            maxHeight: '85vh',
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            transform: fadeOut ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.5s ease-in-out',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Grid container sx={{ height: '100%' }}>
            {/* Left Side - Branding */}
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Decorative circles in header */}
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
                
                <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      width: 120, 
                      height: 120,
                      backdropFilter: 'blur(10px)',
                      border: '3px solid rgba(255,255,255,0.3)',
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <StoreIcon sx={{ fontSize: 60, color: 'white' }} />
                  </Avatar>
                  <Typography variant="h2" fontWeight={800} sx={{ mb: 2 }}>
                    Ken-dal Store
                  </Typography>
                  <Typography variant="h5" sx={{ opacity: 0.9, fontWeight: 500, mb: 4 }}>
                    Point of Sale System
                  </Typography>
                  
                  {/* Features Section - Compact */}
                  <Stack spacing={2} sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                        <CartIcon sx={{ color: 'white', fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="body1" fontWeight={600}>
                        Sales Management
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                        <StoreIcon sx={{ color: 'white', fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="body1" fontWeight={600}>
                        Inventory Control
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                        <SecurityIcon sx={{ color: 'white', fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="body1" fontWeight={600}>
                        Secure Access
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Grid>

            {/* Right Side - Login Form */}
            <Grid item xs={12} md={7}>
              <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                    Welcome Back
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sign in to access your store management system
                  </Typography>
                </Box>

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                  <Stack spacing={3}>
                    <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon color="primary" />
                        Authentication
                      </Typography>
                      
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          variant="outlined"
                          required
                          autoFocus
                          placeholder="Enter your username"
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
                              bgcolor: 'white',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main',
                                },
                              },
                            }
                          }}
                        />
                        
                        <TextField
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          variant="outlined"
                          required
                          placeholder="Enter your password"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon color="primary" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  sx={{ borderRadius: 2 }}
                                >
                                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 3,
                              bgcolor: 'white',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main',
                                },
                              },
                            }
                          }}
                        />
                      </Stack>
                    </Card>

                    {/* Default Credentials - Compact */}
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AdminIcon color="info" sx={{ fontSize: 20 }} />
                        <Typography variant="subtitle2" fontWeight={700} color="info.main">
                          Default Credentials
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 4 }}>
                        <Typography variant="body2" color="info.dark">
                          <strong>Username:</strong> Admin
                        </Typography>
                        <Typography variant="body2" color="info.dark">
                          <strong>Password:</strong> 000000
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      size="large"
                      variant="contained"
                      type="submit"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                      sx={{
                        py: 2,
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                        },
                        '&:disabled': {
                          background: 'linear-gradient(135deg, #cccccc 0%, #999999 100%)',
                          boxShadow: 'none',
                        }
                      }}
                    >
                      {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                    </Button>
                  </Stack>
                </form>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Fade>

      <Snackbar
        open={error.open}
        autoHideDuration={4000}
        onClose={() => setError({ ...error, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          variant="filled" 
          sx={{ 
            width: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)'
          }}
        >
          {error.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login; 
