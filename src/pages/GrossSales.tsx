import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  CalendarMonth as CalendarIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  EmojiEvents as BestIcon,
  FileDownloadOutlined as ExportIcon,
  InsightsOutlined as InsightsIcon,
  Lock as LockIcon,
  PercentOutlined as MarginIcon,
  PointOfSale as GrossIcon,
  Speed as PaceIcon,
  TrendingDown as TrendDownIcon,
  TrendingUp as TrendUpIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  EventBusy as QuietIcon,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { DailySalesRecord, GrossSalesContext, GrossSalesRecord } from '../App';
import { useNotify } from '../contexts/NotificationContext';

const GROSS_SALES_PASSWORD = 'Anapen73';
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_LONG = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

const formatPeso = (value: number) => value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e6) return `${sign}₱${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${sign}₱${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
  return `${sign}₱${Math.round(abs)}`;
};
const pct = (value: number) => `${Math.abs(value) < 10 ? Math.abs(value).toFixed(1).replace(/\.0$/, '') : Math.round(Math.abs(value))}%`;
const monthName = (year: number, month: number) => new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
const dayKey = (year: number, month: number, day: number) => `${year}-${month}-${day}`;
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
// 0 = Monday ... 6 = Sunday
const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;
const margin = (gross: number, profit: number) => (gross > 0 ? (profit / gross) * 100 : 0);

const reviveDates = <T extends { date: Date }>(list: T[]): T[] => list.map((r) => ({ ...r, date: new Date(r.date) }));

// ---------- chart colours (validated categorical pair; see the dataviz palette) ----------

const useChartColors = () => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return {
    profit: dark ? '#3987e5' : '#2a78d6',
    purchase: dark ? '#d95926' : '#eb6834',
    muted: '#898781',
    deemphasis: dark ? '#4b4b47' : '#d3d2cb',
    baseline: dark ? '#383835' : '#c3c2b7',
    grid: theme.palette.divider,
    surface: theme.palette.background.paper,
    text: theme.palette.text.secondary,
  };
};

const useWidth = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
};

const niceScale = (max: number, count = 4) => {
  if (max <= 0) return { top: 1000, step: 250 };
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
  return { top: Math.ceil(max / step) * step, step };
};

type Segment = { name: string; value: number; color: string };
type TooltipRow = { name: string; value: string; color?: string; line?: boolean };
type ChartColumn = {
  key: string;
  tick: string;
  segments: Segment[]; // bottom to top
  ghost?: number;
  title: string;
  rows: TooltipRow[];
  ariaLabel: string;
};

const roundedTop = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}L${x},${y + r}Q${x},${y} ${x + r},${y}L${x + w - r},${y}Q${x + w},${y} ${x + w},${y + r}L${x + w},${y + h}Z`;
};

// Columns that grow from one baseline; stacked segments are separated by a 2px surface gap.
const ColumnChart: React.FC<{
  columns: ChartColumn[];
  height?: number;
  average?: { value: number; label: string };
  label: string;
}> = ({ columns, height = 240, average, label }) => {
  const colors = useChartColors();
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 8, bottom: 26, left: 48 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const maxValue = Math.max(0, ...columns.map((c) => Math.max(c.segments.reduce((s, x) => s + Math.max(0, x.value), 0), c.ghost ?? 0)), average?.value ?? 0);
  const { top, step } = niceScale(maxValue);
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const slot = columns.length ? plotW / columns.length : 0;
  const barW = Math.max(2, Math.min(24, slot * 0.68));
  const tickEvery = Math.max(1, Math.ceil(columns.length / Math.max(1, Math.floor(plotW / 34))));

  const hovered = hover !== null ? columns[hover] : null;
  const hoverX = hover !== null ? pad.left + slot * hover + slot / 2 : 0;
  const hoverTop = hovered ? y(Math.max(hovered.segments.reduce((s, x) => s + Math.max(0, x.value), 0), hovered.ghost ?? 0)) : 0;

  return (
    <Box ref={ref} sx={{ position: 'relative', width: '100%', height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? colors.baseline : colors.grid} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={colors.text} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCompact(t)}
              </text>
            </g>
          ))}
          {average && average.value > 0 && (
            <g aria-hidden>
              <line x1={pad.left} x2={pad.left + plotW} y1={y(average.value)} y2={y(average.value)} stroke={colors.text} strokeWidth={1} opacity={0.7} />
              <text x={pad.left + plotW} y={y(average.value) - 5} textAnchor="end" fontSize={11} fontWeight={600} fill={colors.text}>
                {average.label}
              </text>
            </g>
          )}
          {columns.map((column, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const x = cx - barW / 2;
            const dim = hover !== null && hover !== i;
            let cursor = y(0);
            const parts = column.segments.filter((s) => s.value > 0);
            return (
              <g
                key={column.key}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={column.ariaLabel}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: 'none', cursor: 'default' }}
              >
                <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill="transparent" />
                {hover === i && <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill={colors.text} opacity={0.06} rx={4} />}
                {parts.map((segment, p) => {
                  const h = (segment.value / top) * plotH;
                  const gap = p > 0 ? 2 : 0;
                  const segTop = cursor - h;
                  const drawH = Math.max(0, h - gap);
                  cursor = segTop;
                  const isTop = p === parts.length - 1;
                  return isTop ? (
                    <path key={segment.name} d={roundedTop(x, segTop, barW, drawH)} fill={segment.color} opacity={dim ? 0.45 : 1} />
                  ) : (
                    <rect key={segment.name} x={x} y={segTop} width={barW} height={drawH} fill={segment.color} opacity={dim ? 0.45 : 1} />
                  );
                })}
                {column.ghost !== undefined && column.ghost > 0 && (
                  <circle cx={cx} cy={y(column.ghost)} r={4} fill={colors.muted} stroke={colors.surface} strokeWidth={2} opacity={dim ? 0.45 : 1} />
                )}
                {(i % tickEvery === 0 || i === columns.length - 1) && (
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={colors.text} fontWeight={hover === i ? 700 : 400}>
                    {column.tick}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hovered && (
        <Box
          role="presentation"
          sx={{
            position: 'absolute',
            left: Math.min(Math.max(hoverX, 90), Math.max(90, width - 90)),
            top: Math.max(0, hoverTop - 8),
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 2,
            minWidth: 170,
            px: 1.5,
            py: 1,
            borderRadius: '10px',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            boxShadow: (t) => (t.palette.mode === 'dark' ? '0 10px 24px rgba(0,0,0,0.6)' : '0 10px 24px -8px rgba(16,24,22,0.25)'),
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={700} component="p" sx={{ mb: 0.5 }}>
            {hovered.title}
          </Typography>
          {hovered.rows.map((row) => (
            <Box key={row.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, lineHeight: 1.6 }}>
              {row.color ? (
                row.line ? (
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
                ) : (
                  <Box sx={{ width: 12, height: 2, borderRadius: 1, bgcolor: row.color, flexShrink: 0 }} />
                )
              ) : (
                <Box sx={{ width: 12, flexShrink: 0 }} />
              )}
              <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.name}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const LegendItem: React.FC<{ color: string; label: string; dot?: boolean }> = ({ color, label, dot }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
    <Box sx={{ width: dot ? 8 : 10, height: dot ? 8 : 10, borderRadius: dot ? '50%' : '2px', bgcolor: color }} />
    <Typography variant="caption" color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
  </Box>
);

// ---------- tiles ----------

type Delta = { text: string; direction: 'up' | 'down' | 'flat' };

const StatTile: React.FC<{ icon: React.ReactElement; label: string; value: string; caption?: string; delta?: Delta | null }> = ({ icon, label, value, caption, delta }) => (
  <Card sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '10px',
        display: { xs: 'none', sm: 'grid' },
        placeItems: 'center',
        color: 'primary.main',
        bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" sx={{ lineHeight: 1.3, fontSize: { xs: '1.125rem', sm: '1.375rem' }, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      {delta && (
        <Typography
          variant="caption"
          component="p"
          fontWeight={700}
          color={delta.direction === 'up' ? 'success.main' : delta.direction === 'down' ? 'error.main' : 'text.secondary'}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
        >
          {delta.direction === 'up' ? <UpIcon sx={{ fontSize: 14 }} /> : delta.direction === 'down' ? <DownIcon sx={{ fontSize: 14 }} /> : null}
          {delta.text}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.4 }}>
          {caption}
        </Typography>
      )}
    </Box>
  </Card>
);

const compareDelta = (current: number, previous: number, against: string): Delta | null => {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return { text: `New vs ${against}`, direction: 'up' };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { text: `Flat vs ${against}`, direction: 'flat' };
  return { text: `${change > 0 ? '+' : '−'}${pct(change)} vs ${against}`, direction: change > 0 ? 'up' : 'down' };
};

// ---------- page ----------

type DeleteTarget =
  | { kind: 'daily'; record: DailySalesRecord }
  | { kind: 'monthly'; record: GrossSalesRecord };

type Editing = { kind: 'daily' | 'monthly' | 'yearly'; key: string } | null;

const GrossSales: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const colors = useChartColors();
  const grossSalesContext = useContext(GrossSalesContext);
  const grossSalesData = grossSalesContext.grossSalesData;
  const dailySalesData = grossSalesContext.dailySalesData;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const [editing, setEditing] = useState<Editing>(null);
  const [editGross, setEditGross] = useState('');
  const [editPurchase, setEditPurchase] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLinked, setDeleteLinked] = useState(true);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const monthDays = daysInMonth(year, month);
  // Days of the selected month that have already happened
  const elapsedDays = isCurrentMonth ? today.getDate() : year * 12 + month < today.getFullYear() * 12 + today.getMonth() + 1 ? monthDays : 0;

  // ---------- lookups ----------

  const dailyByKey = useMemo(() => {
    const map = new Map<string, DailySalesRecord>();
    for (const r of dailySalesData) map.set(dayKey(r.year, r.month, r.day), r);
    return map;
  }, [dailySalesData]);

  const monthlyByKey = useMemo(() => {
    const map = new Map<string, GrossSalesRecord>();
    for (const r of grossSalesData) map.set(`${r.year}-${r.month}`, r);
    return map;
  }, [grossSalesData]);

  const sumDays = useCallback(
    (y: number, m: number, uptoDay: number) => {
      const total = { gross: 0, purchase: 0, profit: 0, days: 0 };
      for (let d = 1; d <= uptoDay; d += 1) {
        const r = dailyByKey.get(dayKey(y, m, d));
        if (r) {
          total.gross += r.gross;
          total.purchase += r.purchase;
          total.profit += r.profit;
          total.days += 1;
        }
      }
      return total;
    },
    [dailyByKey]
  );

  // A month's figures come from its monthly record (the running total), falling back to its days
  const monthTotals = useCallback(
    (y: number, m: number) => {
      const record = monthlyByKey.get(`${y}-${m}`);
      if (record) return { gross: record.gross, purchase: record.purchase, profit: record.profit };
      const days = sumDays(y, m, daysInMonth(y, m));
      return { gross: days.gross, purchase: days.purchase, profit: days.profit };
    },
    [monthlyByKey, sumDays]
  );

  const current = monthTotals(year, month);
  const currentDays = sumDays(year, month, monthDays);

  // Compare like with like: the same number of days into last month when this month isn't over
  const comparison = useMemo(() => {
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const prevDaily = sumDays(prev.year, prev.month, daysInMonth(prev.year, prev.month));
    if (isCurrentMonth && prevDaily.days > 0) {
      const upto = Math.min(today.getDate(), daysInMonth(prev.year, prev.month));
      const prevSame = sumDays(prev.year, prev.month, upto);
      const nowSame = sumDays(year, month, today.getDate());
      return { label: `${MONTHS_SHORT[prev.month - 1]} 1–${upto}`, prev: prevSame, now: nowSame };
    }
    return { label: MONTHS_SHORT[prev.month - 1], prev: monthTotals(prev.year, prev.month), now: monthTotals(year, month) };
  }, [isCurrentMonth, month, monthTotals, sumDays, today, year]);

  const bestDay = useMemo(() => {
    let best: DailySalesRecord | null = null;
    for (let d = 1; d <= monthDays; d += 1) {
      const r = dailyByKey.get(dayKey(year, month, d));
      if (r && (!best || r.gross > best.gross)) best = r;
    }
    return best;
  }, [dailyByKey, monthDays, month, year]);

  const averagePerDay = currentDays.days > 0 ? currentDays.gross / currentDays.days : 0;
  const projection = isCurrentMonth && today.getDate() > 0 ? (sumDays(year, month, today.getDate()).gross / today.getDate()) * monthDays : null;

  // Weekday pattern over the 12 weeks up to the end of the selected month (or today)
  const weekday = useMemo(() => {
    const end = isCurrentMonth ? today : new Date(year, month - 1, monthDays);
    const start = new Date(end.getTime() - 83 * DAY_MS);
    const sums = Array.from({ length: 7 }, () => ({ gross: 0, days: 0 }));
    for (const r of dailySalesData) {
      const date = new Date(r.year, r.month - 1, r.day);
      if (date < start || date > end) continue;
      const w = weekdayIndex(date);
      sums[w].gross += r.gross;
      sums[w].days += 1;
    }
    const averages = sums.map((s) => (s.days ? s.gross / s.days : 0));
    const withData = averages.filter((a, i) => sums[i].days > 0);
    const overall = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : 0;
    let best = -1;
    averages.forEach((a, i) => {
      if (sums[i].days > 0 && (best < 0 || a > averages[best])) best = i;
    });
    return { averages, sums, overall, best };
  }, [dailySalesData, isCurrentMonth, month, monthDays, today, year]);

  // ---------- chart data ----------

  const dailyColumns = useMemo<ChartColumn[]>(() => {
    return Array.from({ length: monthDays }, (_, i) => {
      const d = i + 1;
      const r = dailyByKey.get(dayKey(year, month, d));
      const date = new Date(year, month - 1, d);
      const gross = r?.gross ?? 0;
      const purchase = r?.purchase ?? 0;
      const profit = r?.profit ?? 0;
      const title = date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
      return {
        key: `d${d}`,
        tick: String(d),
        segments: [
          { name: 'Purchase', value: Math.min(purchase, gross), color: colors.purchase },
          { name: 'Profit', value: Math.max(0, gross - purchase), color: colors.profit },
        ],
        title,
        rows: r
          ? [
              { name: 'gross', value: formatPeso(gross) },
              { name: 'purchase', value: formatPeso(purchase), color: colors.purchase },
              { name: `profit · ${pct(margin(gross, profit))} margin`, value: formatPeso(profit), color: colors.profit },
            ]
          : [{ name: '', value: 'No sales recorded' }],
        ariaLabel: r ? `${title}: gross ${formatPeso(gross)}, purchase ${formatPeso(purchase)}, profit ${formatPeso(profit)}` : `${title}: no sales recorded`,
      };
    });
  }, [colors.profit, colors.purchase, dailyByKey, month, monthDays, year]);

  const monthlyColumns = useMemo<ChartColumn[]>(() => {
    return MONTHS_SHORT.map((label, i) => {
      const m = i + 1;
      const t = monthTotals(year, m);
      const last = monthTotals(year - 1, m);
      return {
        key: `m${m}`,
        tick: label,
        segments: [
          { name: 'Purchase', value: Math.min(t.purchase, t.gross), color: colors.purchase },
          { name: 'Profit', value: Math.max(0, t.gross - t.purchase), color: colors.profit },
        ],
        ghost: last.gross > 0 ? last.gross : undefined,
        title: monthName(year, m),
        rows: [
          { name: 'gross', value: formatPeso(t.gross) },
          { name: 'purchase', value: formatPeso(t.purchase), color: colors.purchase },
          { name: `profit · ${pct(margin(t.gross, t.profit))} margin`, value: formatPeso(t.profit), color: colors.profit },
          ...(last.gross > 0 ? [{ name: `gross in ${year - 1}`, value: formatPeso(last.gross), color: colors.muted, line: true }] : []),
        ],
        ariaLabel: `${monthName(year, m)}: gross ${formatPeso(t.gross)}, profit ${formatPeso(t.profit)}${last.gross > 0 ? `, ${year - 1}: ${formatPeso(last.gross)}` : ''}`,
      };
    });
  }, [colors.muted, colors.profit, colors.purchase, monthTotals, year]);

  const weekdayColumns = useMemo<ChartColumn[]>(
    () =>
      WEEKDAYS.map((label, i) => ({
        key: label,
        tick: label,
        segments: [{ name: 'Average', value: weekday.averages[i], color: i === weekday.best ? colors.profit : colors.deemphasis }],
        title: WEEKDAYS_LONG[i],
        rows: weekday.sums[i].days
          ? [
              { name: 'average gross', value: formatPeso(weekday.averages[i]) },
              { name: `from ${weekday.sums[i].days} day${weekday.sums[i].days !== 1 ? 's' : ''}`, value: '' },
            ]
          : [{ name: '', value: 'No sales recorded' }],
        ariaLabel: `${WEEKDAYS_LONG[i]}: average ${formatPeso(weekday.averages[i])} over ${weekday.sums[i].days} days`,
      })),
    [colors.deemphasis, colors.profit, weekday]
  );

  const yearTotals = useMemo(() => {
    const years = new Map<number, { gross: number; purchase: number; profit: number; months: number }>();
    for (const r of grossSalesData) {
      const t = years.get(r.year) ?? { gross: 0, purchase: 0, profit: 0, months: 0 };
      t.gross += r.gross;
      t.purchase += r.purchase;
      t.profit += r.profit;
      t.months += 1;
      years.set(r.year, t);
    }
    return Array.from(years, ([y, t]) => ({ year: y, ...t })).sort((a, b) => b.year - a.year);
  }, [grossSalesData]);

  // ---------- insights ----------

  const insights = useMemo(() => {
    const list: Array<{ icon: React.ReactElement; text: React.ReactNode }> = [];
    if (projection !== null && projection > 0) {
      list.push({
        icon: <PaceIcon />,
        text: (
          <>
            On pace for <strong>{formatPeso(projection)}</strong> this month, at {formatPeso(projection / monthDays)} a day so far.
          </>
        ),
      });
    }
    const delta = comparison.prev.gross > 0 ? ((comparison.now.gross - comparison.prev.gross) / comparison.prev.gross) * 100 : null;
    if (delta !== null && current.gross > 0) {
      list.push({
        icon: delta >= 0 ? <TrendUpIcon /> : <TrendDownIcon />,
        text: (
          <>
            Gross is <strong>{delta >= 0 ? 'up' : 'down'} {pct(delta)}</strong> vs {comparison.label} ({formatPeso(comparison.prev.gross)}).
          </>
        ),
      });
    }
    if (current.gross > 0 && comparison.prev.gross > 0) {
      const now = margin(comparison.now.gross, comparison.now.profit);
      const before = margin(comparison.prev.gross, comparison.prev.profit);
      const diff = now - before;
      list.push({
        icon: <MarginIcon />,
        text: (
          <>
            Profit margin is <strong>{pct(now)}</strong>
            {Math.abs(diff) < 0.5 ? `, about the same as ${comparison.label}` : `, ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(1)} points from ${comparison.label}`}.
          </>
        ),
      });
    }
    if (weekday.best >= 0 && weekday.overall > 0) {
      const lift = ((weekday.averages[weekday.best] - weekday.overall) / weekday.overall) * 100;
      list.push({
        icon: <BestIcon />,
        text: (
          <>
            <strong>{WEEKDAYS_LONG[weekday.best]}</strong> are your strongest day: {formatPeso(weekday.averages[weekday.best])} on average
            {lift >= 1 ? `, ${pct(lift)} above a typical day` : ''}.
          </>
        ),
      });
    }
    const thisYear = MONTHS_SHORT.map((_, i) => ({ m: i + 1, ...monthTotals(year, i + 1) })).filter((x) => x.gross > 0);
    if (thisYear.length > 1) {
      const top = thisYear.reduce((a, b) => (b.gross > a.gross ? b : a));
      list.push({
        icon: <CalendarIcon />,
        text: (
          <>
            Best month of {year}: <strong>{new Date(year, top.m - 1, 1).toLocaleDateString('en-PH', { month: 'long' })}</strong> at {formatPeso(top.gross)}.
          </>
        ),
      });
    }
    // Year over year, like for like: only finished months that have sales in both years
    const lastFullMonth = year === today.getFullYear() ? today.getMonth() : 12;
    const shared: number[] = [];
    let thisSum = 0;
    let lastSum = 0;
    for (let m = 1; m <= lastFullMonth; m += 1) {
      const now = monthTotals(year, m).gross;
      const before = monthTotals(year - 1, m).gross;
      if (now > 0 && before > 0) {
        shared.push(m);
        thisSum += now;
        lastSum += before;
      }
    }
    if (shared.length > 0) {
      const yoy = ((thisSum - lastSum) / lastSum) * 100;
      const span =
        shared.length === 1
          ? new Date(year, shared[0] - 1, 1).toLocaleDateString('en-PH', { month: 'long' })
          : `the ${shared.length} months with sales in both years (${MONTHS_SHORT[shared[0] - 1]}–${MONTHS_SHORT[shared[shared.length - 1] - 1]})`;
      list.push({
        icon: yoy >= 0 ? <TrendUpIcon /> : <TrendDownIcon />,
        text: (
          <>
            Across {span}, {year} is <strong>{yoy >= 0 ? 'up' : 'down'} {pct(yoy)}</strong> on {year - 1} ({formatPeso(thisSum)} vs {formatPeso(lastSum)}).
          </>
        ),
      });
    }
    if (elapsedDays > 0 && currentDays.days > 0) {
      const quiet: number[] = [];
      for (let d = 1; d <= elapsedDays; d += 1) if (!dailyByKey.has(dayKey(year, month, d))) quiet.push(d);
      if (quiet.length > 0) {
        list.push({
          icon: <QuietIcon />,
          text: (
            <>
              No sales recorded on <strong>{quiet.length} day{quiet.length !== 1 ? 's' : ''}</strong> this month
              {quiet.length <= 5 ? ` (${quiet.map((d) => `${MONTHS_SHORT[month - 1]} ${d}`).join(', ')})` : ''}.
            </>
          ),
        });
      }
    }
    return list;
  }, [comparison, current.gross, currentDays.days, dailyByKey, elapsedDays, month, monthDays, monthTotals, projection, today, weekday, year]);

  // ---------- persistence ----------

  const persistDaily = (next: DailySalesRecord[]) => {
    grossSalesContext.setDailySalesData(next);
    localStorage.setItem('pos_daily_sales', JSON.stringify(next));
  };
  const persistMonthly = (next: GrossSalesRecord[]) => {
    grossSalesContext.setGrossSalesData(next);
    localStorage.setItem('pos_gross_sales', JSON.stringify(next));
  };
  // Undo reads the stored lists, so it builds on anything recorded in the meantime
  const storedDaily = (): DailySalesRecord[] => reviveDates(JSON.parse(localStorage.getItem('pos_daily_sales') || '[]'));
  const storedMonthly = (): GrossSalesRecord[] => reviveDates(JSON.parse(localStorage.getItem('pos_gross_sales') || '[]'));

  // ---------- editing (same rules as before: profit = gross − purchase) ----------

  const startEdit = (kind: 'daily' | 'monthly' | 'yearly', key: string, gross: number, purchase: number) => {
    setEditing({ kind, key });
    setEditGross(String(gross));
    setEditPurchase(String(purchase));
  };
  const editValues = () => {
    const gross = parseFloat(editGross) || 0;
    const purchase = parseFloat(editPurchase) || 0;
    return { gross, purchase, profit: gross - purchase };
  };

  const saveDaily = (d: number) => {
    const v = editValues();
    const date = new Date(year, month - 1, d);
    const existing = dailyByKey.get(dayKey(year, month, d));
    const record: DailySalesRecord = existing
      ? { ...existing, ...v }
      : {
          year,
          month,
          day: d,
          dayName: date.toLocaleString('default', { weekday: 'long' }),
          monthName: date.toLocaleString('default', { month: 'long' }),
          date,
          ...v,
        };
    persistDaily(existing ? dailySalesData.map((r) => (r === existing ? record : r)) : [...dailySalesData, record]);
    setEditing(null);
    notify(`Saved ${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`, 'success');
  };

  const saveMonthly = (record: GrossSalesRecord) => {
    const v = editValues();
    persistMonthly(grossSalesData.map((r) => (r === record ? { ...r, ...v } : r)));
    setEditing(null);
    notify(`Saved ${monthName(record.year, record.month)}`, 'success');
  };

  // A yearly total is spread across that year's months in proportion to their gross
  const saveYearly = (y: number) => {
    const yearRecords = grossSalesData.filter((r) => r.year === y);
    const oldGross = yearRecords.reduce((s, r) => s + r.gross, 0);
    const oldPurchase = yearRecords.reduce((s, r) => s + r.purchase, 0);
    const v = editValues();
    const grossDiff = v.gross - oldGross;
    const purchaseDiff = v.purchase - oldPurchase;
    persistMonthly(
      grossSalesData.map((r) => {
        if (r.year !== y) return r;
        const share = oldGross > 0 ? r.gross / oldGross : 1 / yearRecords.length;
        const gross = r.gross + grossDiff * share;
        const purchase = r.purchase + purchaseDiff * share;
        return { ...r, gross, purchase, profit: gross - purchase };
      })
    );
    setEditing(null);
    notify(`Saved ${y} totals`, 'success');
  };

  // ---------- deleting (password protected, undoable) ----------

  const openDelete = (target: DeleteTarget) => {
    setDeleteTarget(target);
    setDeletePassword('');
    setDeleteError('');
    setDeleteLinked(true);
  };

  const linkedInfo = useMemo(() => {
    if (!deleteTarget) return null;
    if (deleteTarget.kind === 'daily') {
      const r = deleteTarget.record;
      const monthRecord = monthlyByKey.get(`${r.year}-${r.month}`);
      return monthRecord ? { label: `Also subtract it from ${monthName(r.year, r.month)}’s monthly total`, available: true } : { label: '', available: false };
    }
    const r = deleteTarget.record;
    const days = dailySalesData.filter((d) => d.year === r.year && d.month === r.month).length;
    return days > 0
      ? { label: `Also delete the ${days} daily record${days !== 1 ? 's' : ''} in ${monthName(r.year, r.month)}`, available: true }
      : { label: '', available: false };
  }, [dailySalesData, deleteTarget, monthlyByKey]);

  const confirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    if (deletePassword !== GROSS_SALES_PASSWORD) {
      setDeleteError('Incorrect password. The record was not deleted.');
      return;
    }
    const linked = deleteLinked && Boolean(linkedInfo?.available);

    if (deleteTarget.kind === 'daily') {
      const r = deleteTarget.record;
      const label = new Date(r.year, r.month - 1, r.day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      persistDaily(dailySalesData.filter((d) => d !== r));
      const adjust = (sign: 1 | -1) => (m: GrossSalesRecord) =>
        m.year === r.year && m.month === r.month
          ? { ...m, gross: m.gross + sign * r.gross, purchase: m.purchase + sign * r.purchase, profit: m.profit + sign * r.profit }
          : m;
      if (linked) persistMonthly(grossSalesData.map(adjust(-1)));
      const undo = () => {
        persistDaily([...storedDaily(), r]);
        if (linked) persistMonthly(storedMonthly().map(adjust(1)));
      };
      notify(`Deleted the record for ${label}${linked ? ' and updated the month' : ''}`, { severity: 'info', action: { label: 'Undo', onClick: undo } });
    } else {
      const r = deleteTarget.record;
      const removedDays = linked ? dailySalesData.filter((d) => d.year === r.year && d.month === r.month) : [];
      persistMonthly(grossSalesData.filter((m) => m !== r));
      if (linked) persistDaily(dailySalesData.filter((d) => !(d.year === r.year && d.month === r.month)));
      const undo = () => {
        persistMonthly([...storedMonthly(), r]);
        if (removedDays.length) persistDaily([...storedDaily(), ...removedDays]);
      };
      notify(`Deleted ${monthName(r.year, r.month)}${removedDays.length ? ` and its ${removedDays.length} daily records` : ''}`, {
        severity: 'info',
        action: { label: 'Undo', onClick: undo },
      });
    }
    setDeleteTarget(null);
  };

  // ---------- export ----------

  const exportCsv = () => {
    let rows: string[] = [];
    let name = '';
    if (tab === 'daily') {
      rows = ['Date,Day,Gross,Purchase,Profit,Margin %'];
      for (let d = 1; d <= monthDays; d += 1) {
        const r = dailyByKey.get(dayKey(year, month, d));
        if (r) rows.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')},${r.dayName},${r.gross.toFixed(2)},${r.purchase.toFixed(2)},${r.profit.toFixed(2)},${margin(r.gross, r.profit).toFixed(1)}`);
      }
      name = `gross_sales_${year}-${String(month).padStart(2, '0')}_daily.csv`;
    } else if (tab === 'monthly') {
      rows = ['Month,Gross,Purchase,Profit,Margin %'];
      for (let m = 1; m <= 12; m += 1) {
        const r = monthlyByKey.get(`${year}-${m}`);
        if (r) rows.push(`${year}-${String(m).padStart(2, '0')},${r.gross.toFixed(2)},${r.purchase.toFixed(2)},${r.profit.toFixed(2)},${margin(r.gross, r.profit).toFixed(1)}`);
      }
      name = `gross_sales_${year}_monthly.csv`;
    } else {
      rows = ['Year,Gross,Purchase,Profit,Margin %'];
      for (const t of yearTotals) rows.push(`${t.year},${t.gross.toFixed(2)},${t.purchase.toFixed(2)},${t.profit.toFixed(2)},${margin(t.gross, t.profit).toFixed(1)}`);
      name = 'gross_sales_yearly.csv';
    }
    if (rows.length === 1) {
      notify('Nothing to export for this period', 'warning');
      return;
    }
    saveAs(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' }), name);
    notify(`Exported ${rows.length - 1} row${rows.length - 1 !== 1 ? 's' : ''}`, 'success');
  };

  // ---------- render helpers ----------

  const stepMonth = (by: number) => {
    const d = new Date(year, month - 1 + by, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setEditing(null);
  };

  const editCells = (onSave: () => void) => (
    <>
      <TableCell align="right">
        <TextField
          size="small"
          type="number"
          value={editGross}
          onChange={(e) => setEditGross(e.target.value)}
          autoFocus
          inputProps={{ 'aria-label': 'Gross', min: 0, step: 0.01 }}
          sx={{ width: 120 }}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </TableCell>
      <TableCell align="right">
        <TextField
          size="small"
          type="number"
          value={editPurchase}
          onChange={(e) => setEditPurchase(e.target.value)}
          inputProps={{ 'aria-label': 'Purchase', min: 0, step: 0.01 }}
          sx={{ width: 120 }}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </TableCell>
      <TableCell align="right" sx={{ color: 'text.secondary' }}>
        {formatPeso(editValues().profit)}
      </TableCell>
      <TableCell align="right" sx={{ color: 'text.secondary' }}>
        {pct(margin(editValues().gross, editValues().profit))}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Button size="small" variant="contained" onClick={onSave}>
          Save
        </Button>
        <Button size="small" color="inherit" onClick={() => setEditing(null)} sx={{ ml: 0.5 }}>
          Cancel
        </Button>
      </TableCell>
    </>
  );

  const valueCells = (gross: number, purchase: number, profit: number) => (
    <>
      <TableCell align="right" sx={{ fontWeight: 600 }}>
        {formatPeso(gross)}
      </TableCell>
      <TableCell align="right">{formatPeso(purchase)}</TableCell>
      <TableCell align="right" sx={{ color: profit < 0 ? 'error.main' : undefined }}>
        {formatPeso(profit)}
      </TableCell>
      <TableCell align="right" sx={{ color: 'text.secondary' }}>
        {gross > 0 ? pct(margin(gross, profit)) : '—'}
      </TableCell>
    </>
  );

  const rowActions = (onEdit: () => void, onDelete?: () => void, label = 'record') => (
    <TableCell align="right" sx={{ whiteSpace: 'nowrap', width: '1%' }}>
      <Tooltip title="Edit">
        <IconButton size="small" aria-label={`Edit ${label}`} onClick={onEdit}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {onDelete && (
        <Tooltip title="Delete (password required)">
          <IconButton size="small" aria-label={`Delete ${label}`} onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </TableCell>
  );

  // ---------- password gate ----------

  if (!isAuthenticated) {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (password === GROSS_SALES_PASSWORD) {
        setIsAuthenticated(true);
        setError('');
      } else {
        setError('Incorrect password. Please try again.');
      }
    };
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 140px)' }}>
        <Card component="form" onSubmit={submit} noValidate sx={{ p: 3.5, width: '100%', maxWidth: 400 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
              mb: 2,
            }}
          >
            <LockIcon />
          </Box>
          <Typography variant="h5">Gross Sales is locked</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Enter the owner password to see sales, purchases and profit.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            error={Boolean(error)}
            helperText={error || ' '}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)} edge="end">
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button color="inherit" onClick={() => navigate('/')} sx={{ flex: 1 }}>
              Back to Basket
            </Button>
            <Button type="submit" variant="contained" sx={{ flex: 1 }}>
              Unlock
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  // ---------- page ----------

  const deltaGross = compareDelta(comparison.now.gross, comparison.prev.gross, comparison.label);
  const deltaProfit = compareDelta(comparison.now.profit, comparison.prev.profit, comparison.label);
  const avgLabel = averagePerDay > 0 ? `Avg ${formatCompact(averagePerDay)}/day` : '';
  const hasAnyData = grossSalesData.length > 0 || dailySalesData.length > 0;

  return (
    <Box>
      {/* Header + period: everything below follows the selected month */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h5">Gross Sales</Typography>
          <Typography variant="body2" color="text.secondary">
            Sales, purchases and profit over time.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton aria-label="Previous month" onClick={() => stepMonth(-1)}>
            <PrevIcon />
          </IconButton>
          <Typography fontWeight={700} sx={{ minWidth: 150, textAlign: 'center' }}>
            {monthName(year, month)}
          </Typography>
          <IconButton aria-label="Next month" onClick={() => stepMonth(1)} disabled={isCurrentMonth}>
            <NextIcon />
          </IconButton>
          {!isCurrentMonth && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth() + 1);
              }}
              sx={{ ml: 0.5 }}
            >
              This month
            </Button>
          )}
        </Box>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
        <StatTile icon={<GrossIcon />} label="Gross sales" value={formatPeso(current.gross)} delta={deltaGross} caption={isCurrentMonth ? 'Month to date' : monthName(year, month)} />
        <StatTile
          icon={<MarginIcon />}
          label="Profit"
          value={formatPeso(current.profit)}
          delta={deltaProfit}
          caption={current.gross > 0 ? `${pct(margin(current.gross, current.profit))} margin` : undefined}
        />
        <StatTile
          icon={<PaceIcon />}
          label="Daily average"
          value={formatPeso(averagePerDay)}
          caption={
            projection !== null && projection > 0
              ? `On pace for ${formatCompact(projection)} this month`
              : `${currentDays.days} of ${monthDays} days with sales`
          }
        />
        <StatTile
          icon={<BestIcon />}
          label="Best day"
          value={bestDay ? formatPeso(bestDay.gross) : '—'}
          caption={bestDay ? new Date(bestDay.year, bestDay.month - 1, bestDay.day).toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' }) : 'No daily records yet'}
        />
      </Box>

      {/* Daily chart + weekday pattern */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 2, mb: 2 }}>
        <Card sx={{ p: 2, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Box>
              <Typography variant="h6">Daily sales</Typography>
              <Typography variant="caption" color="text.secondary">
                Each column is a day’s gross, split into purchase and profit
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <LegendItem color={colors.profit} label="Profit" />
              <LegendItem color={colors.purchase} label="Purchase" />
            </Box>
          </Box>
          <ColumnChart
            columns={dailyColumns}
            average={averagePerDay > 0 ? { value: averagePerDay, label: avgLabel } : undefined}
            label={`Daily gross sales for ${monthName(year, month)}`}
          />
        </Card>
        <Card sx={{ p: 2, minWidth: 0 }}>
          <Typography variant="h6">Average by weekday</Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
            Gross on days with sales, last 12 weeks
            {weekday.best >= 0 ? ` · best: ${WEEKDAYS_LONG[weekday.best]}` : ''}
          </Typography>
          <ColumnChart columns={weekdayColumns} label="Average gross by weekday over the last 12 weeks" />
        </Card>
      </Box>

      {/* Monthly chart + insights */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 2, mb: 2 }}>
        <Card sx={{ p: 2, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Box>
              <Typography variant="h6">Monthly sales · {year}</Typography>
              <Typography variant="caption" color="text.secondary">
                Gross per month, with {year - 1} for comparison
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <LegendItem color={colors.profit} label="Profit" />
              <LegendItem color={colors.purchase} label="Purchase" />
              <LegendItem color={colors.muted} label={`${year - 1} gross`} dot />
            </Box>
          </Box>
          <ColumnChart columns={monthlyColumns} label={`Monthly gross sales for ${year}`} />
        </Card>
        <Card sx={{ p: 2, minWidth: 0 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <InsightsIcon color="primary" /> Insights
          </Typography>
          {insights.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {hasAnyData ? 'Not enough data for this month yet. Insights appear as sales are recorded.' : 'Insights appear once sales are recorded.'}
            </Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
              {insights.map((insight, i) => (
                <Box component="li" key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <Box sx={{ color: 'text.secondary', mt: '1px', '& svg': { fontSize: 20 } }}>{insight.icon}</Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    {insight.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>

      {/* Records: the table view of everything above */}
      <Card sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={(_, value) => {
              setTab(value);
              setEditing(null);
            }}
          >
            <Tab value="daily" label={`Daily · ${MONTHS_SHORT[month - 1]} ${year}`} />
            <Tab value="monthly" label={`Monthly · ${year}`} />
            <Tab value="yearly" label="Yearly" />
          </Tabs>
          <Button size="small" startIcon={<ExportIcon />} onClick={exportCsv}>
            Export CSV
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{tab === 'daily' ? 'Date' : tab === 'monthly' ? 'Month' : 'Year'}</TableCell>
                <TableCell align="right">Gross</TableCell>
                <TableCell align="right">Purchase</TableCell>
                <TableCell align="right">Profit</TableCell>
                <TableCell align="right">Margin</TableCell>
                <TableCell align="right" sx={{ position: 'relative' }}>
                  <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                    Actions
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tab === 'daily' &&
                Array.from({ length: monthDays }, (_, i) => {
                  const d = i + 1;
                  const r = dailyByKey.get(dayKey(year, month, d));
                  const date = new Date(year, month - 1, d);
                  const key = `d-${d}`;
                  const isEditing = editing?.kind === 'daily' && editing.key === key;
                  const future = isCurrentMonth && d > today.getDate();
                  return (
                    <TableRow key={key} hover sx={{ opacity: !r && !isEditing ? 0.55 : 1 }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isCurrentMonth && d === today.getDate() && (
                          <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 700, color: 'primary.main' }}>
                            Today
                          </Box>
                        )}
                      </TableCell>
                      {isEditing ? (
                        editCells(() => saveDaily(d))
                      ) : r ? (
                        <>
                          {valueCells(r.gross, r.purchase, r.profit)}
                          {rowActions(
                            () => startEdit('daily', key, r.gross, r.purchase),
                            () => openDelete({ kind: 'daily', record: r }),
                            date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })
                          )}
                        </>
                      ) : (
                        <>
                          <TableCell align="right" colSpan={4} sx={{ color: 'text.secondary' }}>
                            {future ? '' : 'No sales recorded'}
                          </TableCell>
                          <TableCell align="right">
                            {!future && (
                              <Button size="small" onClick={() => startEdit('daily', key, 0, 0)}>
                                Add
                              </Button>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}

              {tab === 'monthly' &&
                (() => {
                  const rows = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => monthlyByKey.has(`${year}-${m}`));
                  if (rows.length === 0)
                    return (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          No monthly records for {year}.
                        </TableCell>
                      </TableRow>
                    );
                  return rows.map((m) => {
                    const r = monthlyByKey.get(`${year}-${m}`)!;
                    const key = `m-${m}`;
                    const isEditing = editing?.kind === 'monthly' && editing.key === key;
                    return (
                      <TableRow key={key} hover selected={m === month}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{monthName(year, m)}</TableCell>
                        {isEditing ? (
                          editCells(() => saveMonthly(r))
                        ) : (
                          <>
                            {valueCells(r.gross, r.purchase, r.profit)}
                            {rowActions(
                              () => startEdit('monthly', key, r.gross, r.purchase),
                              () => openDelete({ kind: 'monthly', record: r }),
                              monthName(year, m)
                            )}
                          </>
                        )}
                      </TableRow>
                    );
                  });
                })()}

              {tab === 'yearly' &&
                (yearTotals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      No records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  yearTotals.map((t) => {
                    const key = `y-${t.year}`;
                    const isEditing = editing?.kind === 'yearly' && editing.key === key;
                    return (
                      <TableRow key={key} hover selected={t.year === year}>
                        <TableCell>
                          {t.year}
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {t.months} month{t.months !== 1 ? 's' : ''}
                          </Typography>
                        </TableCell>
                        {isEditing ? (
                          editCells(() => saveYearly(t.year))
                        ) : (
                          <>
                            {valueCells(t.gross, t.purchase, t.profit)}
                            {rowActions(() => startEdit('yearly', key, t.gross, t.purchase), undefined, `${t.year} totals`)}
                          </>
                        )}
                      </TableRow>
                    );
                  })
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
          {tab === 'yearly'
            ? 'Year totals are the sum of their months. Editing one spreads the change across those months; delete individual months from the Monthly tab.'
            : 'Totals are added automatically at every Basket checkout and when a report is exported from Sales Record. Deleting a record needs the owner password.'}
        </Typography>
      </Card>

      {/* Password-protected delete */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={confirmDelete} noValidate>
          <DialogTitle>
            Delete{' '}
            {deleteTarget?.kind === 'daily'
              ? new Date(deleteTarget.record.year, deleteTarget.record.month - 1, deleteTarget.record.day).toLocaleDateString('en-PH', {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : deleteTarget
                ? monthName(deleteTarget.record.year, deleteTarget.record.month)
                : ''}
            ?
          </DialogTitle>
          <DialogContent>
            {deleteTarget && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.5, mb: 2, p: 1.5, borderRadius: '10px', bgcolor: 'background.default' }}>
                <Typography variant="body2">Gross</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'right' }}>
                  {formatPeso(deleteTarget.record.gross)}
                </Typography>
                <Typography variant="body2">Purchase</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'right' }}>
                  {formatPeso(deleteTarget.record.purchase)}
                </Typography>
                <Typography variant="body2">Profit</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'right' }}>
                  {formatPeso(deleteTarget.record.profit)}
                </Typography>
              </Box>
            )}
            {linkedInfo?.available && (
              <FormControlLabel
                control={<Checkbox checked={deleteLinked} onChange={(e) => setDeleteLinked(e.target.checked)} />}
                label={<Typography variant="body2">{linkedInfo.label}</Typography>}
                sx={{ mb: 1.5 }}
              />
            )}
            <TextField
              fullWidth
              autoFocus
              type="password"
              label="Owner password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError('');
              }}
              error={Boolean(deleteError)}
              helperText={deleteError || 'Required to delete records'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="error" disabled={!deletePassword}>
              Delete
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default GrossSales;
