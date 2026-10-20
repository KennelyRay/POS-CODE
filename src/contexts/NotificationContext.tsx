import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha, keyframes, styled } from '@mui/material/styles';
import {
  CheckCircleRounded as SuccessIcon,
  InfoRounded as InfoIcon,
  WarningRounded as WarningIcon,
  ErrorRounded as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export type NotifySeverity = 'success' | 'info' | 'warning' | 'error';

export type NotifyOptions = {
  severity?: NotifySeverity;
  /** A button on the notification, e.g. Undo. Clicking it also dismisses the notification. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it hides itself. */
  duration?: number;
};

type Notify = (message: string, severityOrOptions?: NotifySeverity | NotifyOptions) => void;

type Toast = {
  id: number;
  message: string;
  severity: NotifySeverity;
  action?: NotifyOptions['action'];
  duration: number;
  count: number;
  // bumped when a repeat restarts the timer, so the progress bar restarts too
  version: number;
  leaving: boolean;
};

const MAX_VISIBLE = 4;
const EXIT_MS = 180;
const DEFAULT_DURATION: Record<NotifySeverity, number> = { success: 3500, info: 3500, warning: 5000, error: 6000 };

const icons: Record<NotifySeverity, React.ReactElement> = {
  success: <SuccessIcon />,
  info: <InfoIcon />,
  warning: <WarningIcon />,
  error: <ErrorIcon />,
};

const NotificationContext = createContext<Notify | null>(null);

export const useNotify = (): Notify => {
  const notify = useContext(NotificationContext);
  if (!notify) throw new Error('useNotify must be used within a NotificationProvider');
  return notify;
};

const enter = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;
const leave = keyframes`
  to { opacity: 0; transform: translateX(16px); }
`;
const drain = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

const Stack = styled('div')(({ theme }) => ({
  position: 'fixed',
  zIndex: theme.zIndex.snackbar,
  bottom: 16,
  left: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  pointerEvents: 'none',
  [theme.breakpoints.up('sm')]: {
    left: 'auto',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
  },
}));

const Card = styled('div')(({ theme }) => ({
  pointerEvents: 'auto',
  position: 'relative',
  width: '100%',
  maxWidth: 400,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 8px 12px 12px',
  borderRadius: 14,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 16px 36px -12px rgba(0, 0, 0, 0.75)'
      : '0 16px 36px -14px rgba(16, 24, 22, 0.3), 0 2px 6px rgba(16, 24, 22, 0.06)',
  animation: `${enter} 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
  '&[data-leaving="true"]': { animation: `${leave} ${EXIT_MS}ms ease-in forwards` },
  '& .toast-bar': {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    transformOrigin: 'left',
    animationName: drain,
    animationTimingFunction: 'linear',
    animationFillMode: 'forwards',
  },
  '&:hover .toast-bar': { animationPlayState: 'paused' },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    '&[data-leaving="true"]': { animation: 'none', opacity: 0 },
  },
}));

const ToastView: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const remaining = useRef(toast.duration);
  const startedAt = useRef(Date.now());
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const start = useCallback(() => {
    stop();
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => onDismiss(toast.id), remaining.current);
  }, [onDismiss, stop, toast.id]);

  // A repeat of the same message restarts the countdown
  useEffect(() => {
    remaining.current = toast.duration;
    start();
    return stop;
  }, [start, stop, toast.duration, toast.version]);

  const pause = () => {
    remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current));
    stop();
  };

  const { severity } = toast;
  return (
    <Card
      role={severity === 'error' || severity === 'warning' ? 'alert' : 'status'}
      data-leaving={toast.leaving}
      onMouseEnter={pause}
      onMouseLeave={start}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          color: `${severity}.main`,
          bgcolor: (t) => alpha(t.palette[severity].main, t.palette.mode === 'dark' ? 0.2 : 0.12),
          '& svg': { fontSize: 22 },
        }}
      >
        {icons[severity]}
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {toast.message}
        {toast.count > 1 && (
          <Box component="span" sx={{ ml: 0.75, px: 0.75, borderRadius: '6px', fontSize: '0.75rem', bgcolor: 'action.selected', color: 'text.secondary' }}>
            ×{toast.count}
          </Box>
        )}
      </Typography>
      {toast.action && (
        <Box
          component="button"
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          sx={{
            flexShrink: 0,
            border: 0,
            borderRadius: '8px',
            px: 1.25,
            py: 0.75,
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: `${severity}.main`,
            bgcolor: (t) => alpha(t.palette[severity].main, t.palette.mode === 'dark' ? 0.18 : 0.1),
            '&:hover': { bgcolor: (t) => alpha(t.palette[severity].main, t.palette.mode === 'dark' ? 0.28 : 0.18) },
            '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: `${severity}.main` },
          }}
        >
          {toast.action.label}
        </Box>
      )}
      <IconButton size="small" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)} sx={{ flexShrink: 0, color: 'text.secondary' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      <Box
        key={toast.version}
        className="toast-bar"
        sx={{ bgcolor: `${severity}.main`, opacity: 0.55, animationDuration: `${toast.duration}ms` }}
      />
    </Card>
  );
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const notify = useCallback<Notify>((message, severityOrOptions) => {
    const options: NotifyOptions = typeof severityOrOptions === 'string' ? { severity: severityOrOptions } : severityOrOptions ?? {};
    const severity = options.severity ?? 'success';
    const duration = options.duration ?? (options.action ? 6000 : DEFAULT_DURATION[severity]);
    setToasts((list) => {
      // The same message again (e.g. adding one product repeatedly) bumps a counter
      // instead of stacking copies. Actions differ per call, so those always stack.
      const repeat = !options.action && list.find((t) => !t.leaving && !t.action && t.message === message && t.severity === severity);
      if (repeat) {
        return list.map((t) => (t === repeat ? { ...t, count: t.count + 1, version: t.version + 1 } : t));
      }
      const toast: Toast = { id: nextId.current++, message, severity, action: options.action, duration, count: 1, version: 0, leaving: false };
      return [...list, toast].slice(-MAX_VISIBLE);
    });
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Stack aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </Stack>
    </NotificationContext.Provider>
  );
};
