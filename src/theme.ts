import { alpha, createTheme, Theme, ThemeOptions } from '@mui/material/styles';

// `banner` is a deep brand colour that always carries white text, for page
// headers and stat cards. Primary can't do that job: in dark mode it is light.
declare module '@mui/material/styles' {
  interface Palette {
    banner: Palette['primary'];
  }
  interface PaletteOptions {
    banner?: PaletteOptions['primary'];
  }
}

export type ThemeName ='light' | 'dark' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'teal' | 'red' | 'gray';

const lightBase = {
  mode: 'light' as const,
  background: { default: '#f4f5f2', paper: '#ffffff' },
  text: { primary: '#16201e', secondary: '#5a6663' },
  divider: '#e2e6e3',
  success: { main: '#15803d' },
  error: { main: '#b91c1c' },
  warning: { main: '#b45309' },
};

// Only "light" and "dark" are offered in Settings; the rest stay valid for anyone
// who picked them in an earlier version.
const palettes: Record<ThemeName, ThemeOptions['palette']> = {
  light: {
    ...lightBase,
    primary: { main: '#0f766e', dark: '#115e59', light: '#14b8a6' },
    secondary: { main: '#b45309' },
  },
  dark: {
    mode: 'dark',
    primary: { main: '#2dd4bf', dark: '#14b8a6', light: '#5eead4' },
    secondary: { main: '#f59e0b' },
    background: { default: '#0c1211', paper: '#141b1a' },
    text: { primary: '#e8eeec', secondary: '#9aa8a5' },
    divider: 'rgba(255, 255, 255, 0.09)',
    success: { main: '#4ade80' },
    error: { main: '#f87171' },
    warning: { main: '#fbbf24' },
  },
  blue: { ...lightBase, primary: { main: '#1d4ed8' }, secondary: { main: '#0891b2' } },
  green: { ...lightBase, primary: { main: '#15803d' }, secondary: { main: '#65a30d' } },
  pink: { ...lightBase, primary: { main: '#be185d' }, secondary: { main: '#db2777' } },
  purple: { ...lightBase, primary: { main: '#6d28d9' }, secondary: { main: '#9333ea' } },
  orange: { ...lightBase, primary: { main: '#c2410c' }, secondary: { main: '#d97706' } },
  teal: { ...lightBase, primary: { main: '#0f766e' }, secondary: { main: '#0891b2' } },
  red: { ...lightBase, primary: { main: '#b91c1c' }, secondary: { main: '#ea580c' } },
  gray: { ...lightBase, primary: { main: '#3f4a48' }, secondary: { main: '#6b7280' } },
};

export const isThemeName = (value: string | null): value is ThemeName =>
  value != null && Object.prototype.hasOwnProperty.call(palettes, value);

const componentOverrides = (theme: Theme): ThemeOptions['components'] => {
  const isDark = theme.palette.mode === 'dark';
  const cardShadow = isDark ? 'none' : '0 1px 2px rgba(16, 24, 22, 0.05)';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums' },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(theme.palette.text.primary, 0.2),
          borderRadius: 8,
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
        },
        '::-webkit-scrollbar-thumb:hover': {
          backgroundColor: alpha(theme.palette.text.primary, 0.35),
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, textTransform: 'none', fontWeight: 600 },
        sizeLarge: { padding: '10px 22px', fontSize: '1rem' },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: cardShadow,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: `1px solid ${theme.palette.divider}`, backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: theme.palette.background.paper,
          '&:hover:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.35),
          },
        },
        notchedOutline: { borderColor: alpha(theme.palette.text.primary, isDark ? 0.18 : 0.16) },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700, fontSize: '1.125rem' } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: theme.palette.divider },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.background.default,
        },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: '0.8125rem', borderRadius: 8 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
  };
};

const bannerColors: Partial<Record<ThemeName, { main: string; dark: string }>> = {
  light: { main: '#0f766e', dark: '#115e59' },
  dark: { main: '#115e59', dark: '#134e4a' },
};

export const buildTheme = (name: ThemeName): Theme => {
  const palette = palettes[name];
  const primary = palette?.primary as { main: string; dark?: string };
  const banner = bannerColors[name] ?? { main: primary.main, dark: primary.dark ?? primary.main };
  const base = createTheme({
    palette: { ...palette, banner: { ...banner, contrastText: '#ffffff' } },
    // Pages use sx `borderRadius: 2`/`3`, which multiply this value.
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: '"Segoe UI Variable Text", "Segoe UI", Inter, system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.015em' },
      h5: { fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, fontSize: '1.0625rem' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.08em' },
    },
  });
  return createTheme(base, { components: componentOverrides(base) });
};
