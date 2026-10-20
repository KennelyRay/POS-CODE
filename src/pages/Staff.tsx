import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  CheckCircleRounded as PresentIcon,
  CancelRounded as AbsentIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  DeleteOutline as DeleteIcon,
  DoneAll as AllPresentIcon,
  EditOutlined as EditIcon,
  FileDownloadOutlined as ExportIcon,
  HelpOutline as UnrecordedIcon,
  PeopleOutline as PeopleIcon,
  PhoneOutlined as PhoneIcon,
  EmailOutlined as EmailIcon,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { useNotify } from '../contexts/NotificationContext';

interface StaffMember {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  avatar?: string;
  startDate: Date | string;
  /** Remembered by the payroll table */
  dailyRate?: number;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  notes?: string;
}

type Status = 'present' | 'absent';
type PayPeriod = 'this-month' | 'last-month' | 'first-half' | 'second-half' | 'custom';

const AVATAR_COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be185d', '#1d4ed8', '#15803d', '#c2410c', '#0e7490'];
const pad = (n: number) => String(n).padStart(2, '0');
// Dates stay as local YYYY-MM-DD strings so a day never shifts with the timezone
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatPeso = (v: number) => v.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const formatDay = (s: string) => fromIso(s).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};
const startDateIso = (s: StaffMember) => (typeof s.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate) ? s.startDate : isoDate(new Date(s.startDate)));
const tenure = (s: StaffMember) => {
  const start = fromIso(startDateIso(s));
  const months = (new Date().getFullYear() - start.getFullYear()) * 12 + new Date().getMonth() - start.getMonth();
  if (months < 1) return 'Started this month';
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''}${months % 12 ? ` ${months % 12} mo` : ''}`;
};

const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 38 }) => (
  <Box
    aria-hidden
    sx={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: avatarColor(name), color: '#fff', fontWeight: 700, fontSize: size * 0.38 }}
  >
    {initials(name)}
  </Box>
);

const StatTile: React.FC<{ icon: React.ReactElement; label: string; value: string; caption: string; tone?: 'success' | 'error' | 'warning' }> = ({ icon, label, value, caption, tone }) => (
  <Card sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '10px',
        display: { xs: 'none', sm: 'grid' },
        placeItems: 'center',
        color: tone ? `${tone}.main` : 'primary.main',
        bgcolor: (t) => alpha(tone ? t.palette[tone].main : t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" sx={{ lineHeight: 1.3, fontSize: { xs: '1.125rem', sm: '1.375rem' } }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.4 }}>
        {caption}
      </Typography>
    </Box>
  </Card>
);

const periodRange = (period: PayPeriod, custom: { start: string; end: string }) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'this-month':
      return { start: isoDate(new Date(y, m, 1)), end: isoDate(new Date(y, m + 1, 0)) };
    case 'last-month':
      return { start: isoDate(new Date(y, m - 1, 1)), end: isoDate(new Date(y, m, 0)) };
    case 'first-half':
      return { start: isoDate(new Date(y, m, 1)), end: isoDate(new Date(y, m, 15)) };
    case 'second-half':
      return { start: isoDate(new Date(y, m, 16)), end: isoDate(new Date(y, m + 1, 0)) };
    default:
      return custom;
  }
};

const Staff: React.FC = () => {
  const notify = useNotify();
  const [tab, setTab] = useState<'today' | 'directory' | 'attendance' | 'payroll'>('today');

  const [staff, setStaff] = useState<StaffMember[]>(() => JSON.parse(localStorage.getItem('pos_staff') || '[]'));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => JSON.parse(localStorage.getItem('pos_attendance') || '[]'));
  useEffect(() => localStorage.setItem('pos_staff', JSON.stringify(staff)), [staff]);
  useEffect(() => localStorage.setItem('pos_attendance', JSON.stringify(attendance)), [attendance]);

  const today = isoDate(new Date());

  // Staff form
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', position: '', email: '', phone: '', startDate: today, dailyRate: '' });
  const [formErrors, setFormErrors] = useState<{ name?: string; position?: string }>({});
  const [toDelete, setToDelete] = useState<StaffMember | null>(null);

  // Attendance grid month
  const [gridMonth, setGridMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Payroll
  const [period, setPeriod] = useState<PayPeriod>('this-month');
  const [custom, setCustom] = useState(() => periodRange('this-month', { start: '', end: '' }));
  const [deductions, setDeductions] = useState<Record<string, string>>({});
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  // ---------- lookups ----------

  const byKey = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const a of attendance) map.set(`${a.staffId}|${a.date}`, a);
    return map;
  }, [attendance]);

  const statusOn = (staffId: string, date: string) => byKey.get(`${staffId}|${date}`)?.status;

  const todayStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    for (const s of staff) {
      const st = byKey.get(`${s.id}|${today}`)?.status;
      if (st === 'present') present += 1;
      if (st === 'absent') absent += 1;
    }
    return { present, absent, unrecorded: staff.length - present - absent };
  }, [byKey, staff, today]);

  const monthPrefix = today.slice(0, 7);
  const presentThisMonth = (id: string) => attendance.filter((a) => a.staffId === id && a.status === 'present' && a.date.startsWith(monthPrefix)).length;

  // ---------- attendance ----------

  // One place that writes a day's status; null clears it
  const setStatus = (staffId: string, date: string, status: Status | null, notes?: string) => {
    setAttendance((prev) => {
      const existing = prev.find((a) => a.staffId === staffId && a.date === date);
      if (status === null) return prev.filter((a) => a !== existing);
      if (existing) return prev.map((a) => (a === existing ? { ...a, status, notes: notes ?? a.notes } : a));
      return [...prev, { id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, staffId, date, status, notes: notes ?? '' }];
    });
  };

  const setNote = (staffId: string, date: string, notes: string) => {
    setAttendance((prev) => prev.map((a) => (a.staffId === staffId && a.date === date ? { ...a, notes } : a)));
  };

  const markAllPresent = () => {
    const unrecorded = staff.filter((s) => !statusOn(s.id, today));
    if (!unrecorded.length) return;
    const stamp = Date.now();
    setAttendance((prev) => [...prev, ...unrecorded.map((s, i) => ({ id: `${stamp}${i}`, staffId: s.id, date: today, status: 'present' as const, notes: '' }))]);
    const ids = new Set(unrecorded.map((s) => s.id));
    notify(`Marked ${unrecorded.length} present`, {
      severity: 'success',
      action: { label: 'Undo', onClick: () => setAttendance((prev) => prev.filter((a) => !(a.date === today && ids.has(a.staffId) && a.id.startsWith(String(stamp))))) },
    });
  };

  // Grid cell click cycles: not recorded -> present -> absent -> not recorded
  const cycleCell = (staffId: string, date: string) => {
    const current = statusOn(staffId, date);
    setStatus(staffId, date, current === undefined ? 'present' : current === 'present' ? 'absent' : null);
  };

  // ---------- staff CRUD ----------

  const openForm = (member?: StaffMember) => {
    setEditing(member ?? null);
    setForm(
      member
        ? { name: member.name, position: member.position, email: member.email, phone: member.phone, startDate: startDateIso(member), dailyRate: member.dailyRate ? String(member.dailyRate) : '' }
        : { name: '', position: '', email: '', phone: '', startDate: today, dailyRate: '' }
    );
    setFormErrors({});
    setFormOpen(true);
  };

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = 'Enter a name';
    if (!form.position.trim()) errors.position = 'Enter a position, e.g. Cashier';
    setFormErrors(errors);
    if (errors.name || errors.position) return;
    const rate = parseFloat(form.dailyRate);
    const member: StaffMember = {
      id: editing?.id ?? Date.now().toString(),
      name: form.name.trim(),
      position: form.position.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      startDate: form.startDate || today,
      dailyRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    };
    setStaff((prev) => (editing ? prev.map((s) => (s.id === editing.id ? member : s)) : [...prev, member]));
    setFormOpen(false);
    notify(editing ? `Saved ${member.name}` : `Added ${member.name}`, 'success');
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const member = toDelete;
    const records = attendance.filter((a) => a.staffId === member.id);
    const position = staff.findIndex((s) => s.id === member.id);
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
    setAttendance((prev) => prev.filter((a) => a.staffId !== member.id));
    setToDelete(null);
    notify(`Removed ${member.name}`, {
      severity: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          setStaff((prev) => {
            const next = [...prev];
            next.splice(Math.min(position, next.length), 0, member);
            return next;
          });
          setAttendance((prev) => [...prev, ...records]);
        },
      },
    });
  };

  // ---------- payroll ----------

  const range = periodRange(period, custom);
  const payroll = useMemo(
    () =>
      staff.map((s) => {
        const days = attendance.filter((a) => a.staffId === s.id && a.status === 'present' && a.date >= range.start && a.date <= range.end).length;
        const rateText = rateDrafts[s.id] ?? (s.dailyRate ? String(s.dailyRate) : '');
        const rate = parseFloat(rateText) || 0;
        const deduction = parseFloat(deductions[s.id] ?? '') || 0;
        const gross = days * rate;
        return { staff: s, days, rateText, rate, deduction, gross, net: gross - deduction };
      }),
    [attendance, deductions, range.end, range.start, rateDrafts, staff]
  );
  const payrollTotal = payroll.reduce((sum, row) => sum + row.net, 0);

  // A rate typed in payroll is remembered on the staff member
  const commitRate = (staffId: string) => {
    const text = rateDrafts[staffId];
    if (text === undefined) return;
    const rate = parseFloat(text);
    setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, dailyRate: Number.isFinite(rate) && rate > 0 ? rate : undefined } : s)));
    setRateDrafts(({ [staffId]: _, ...rest }) => rest);
  };

  const exportPayroll = () => {
    const rows = [
      `Period,${range.start} to ${range.end}`,
      'Name,Position,Days present,Daily rate,Gross,Deduction,Net pay',
      ...payroll.map((r) => [`"${r.staff.name.replace(/"/g, '""')}"`, `"${r.staff.position.replace(/"/g, '""')}"`, r.days, r.rate.toFixed(2), r.gross.toFixed(2), r.deduction.toFixed(2), r.net.toFixed(2)].join(',')),
      `Total,,,,,,${payrollTotal.toFixed(2)}`,
    ];
    saveAs(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' }), `payroll_${range.start}_to_${range.end}.csv`);
    notify('Payroll exported', 'success');
  };

  // ---------- render ----------

  const gridDays = useMemo(() => {
    const count = new Date(gridMonth.year, gridMonth.month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => isoDate(new Date(gridMonth.year, gridMonth.month, i + 1)));
  }, [gridMonth]);
  const gridLabel = new Date(gridMonth.year, gridMonth.month, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const stepGrid = (by: number) => {
    const d = new Date(gridMonth.year, gridMonth.month + by, 1);
    setGridMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const emptyState = (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <PeopleIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
      <Typography fontWeight={600}>No staff yet</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add your staff to track attendance and work out pay.
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
        Add staff
      </Button>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h5">Staff</Typography>
          <Typography variant="body2" color="text.secondary">
            Attendance and pay for {staff.length} staff member{staff.length !== 1 ? 's' : ''}.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          Add staff
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
        <StatTile icon={<PeopleIcon />} label="Staff" value={String(staff.length)} caption="On the team" />
        <StatTile icon={<PresentIcon />} label="Present today" value={String(todayStats.present)} caption={formatDay(today)} tone="success" />
        <StatTile icon={<AbsentIcon />} label="Absent today" value={String(todayStats.absent)} caption={formatDay(today)} tone="error" />
        <StatTile icon={<UnrecordedIcon />} label="Not recorded" value={String(todayStats.unrecorded)} caption={todayStats.unrecorded ? 'Still to mark today' : 'Everyone is marked'} tone="warning" />
      </Box>

      <Card sx={{ minWidth: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="today" label="Today" />
          <Tab value="directory" label="Directory" />
          <Tab value="attendance" label="Attendance" />
          <Tab value="payroll" label="Payroll" />
        </Tabs>

        {/* Today: one tap per person */}
        {tab === 'today' &&
          (staff.length === 0 ? (
            emptyState
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</Typography>
                <Button size="small" startIcon={<AllPresentIcon />} onClick={markAllPresent} disabled={todayStats.unrecorded === 0}>
                  Mark everyone else present
                </Button>
              </Box>
              {staff.map((s) => {
                const record = byKey.get(`${s.id}|${today}`);
                return (
                  <Box
                    key={s.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1fr) 220px minmax(0, 1fr)' },
                      gap: 1.5,
                      alignItems: 'center',
                      px: 2,
                      py: 1.25,
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Avatar name={s.name} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={600} noWrap>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="p">
                          {s.position}
                        </Typography>
                      </Box>
                    </Box>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={record?.status ?? null}
                      onChange={(_, value: Status | null) => setStatus(s.id, today, value)}
                      aria-label={`Attendance for ${s.name}`}
                      sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, px: 1.5 } }}
                    >
                      <ToggleButton value="present" color="success">
                        <PresentIcon sx={{ fontSize: 18, mr: 0.5 }} /> Present
                      </ToggleButton>
                      <ToggleButton value="absent" color="error">
                        <AbsentIcon sx={{ fontSize: 18, mr: 0.5 }} /> Absent
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <TextField
                      size="small"
                      placeholder={record ? 'Note (optional)' : 'Mark attendance to add a note'}
                      disabled={!record}
                      defaultValue={record?.notes ?? ''}
                      key={`${s.id}-${record ? 'on' : 'off'}`}
                      onBlur={(e) => record && e.target.value !== (record.notes ?? '') && setNote(s.id, today, e.target.value)}
                      sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
                    />
                  </Box>
                );
              })}
            </>
          ))}

        {/* Directory */}
        {tab === 'directory' &&
          (staff.length === 0
            ? emptyState
            : staff.map((s) => (
                <Box
                  key={s.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1.2fr) minmax(0, 1fr) 140px 120px auto' },
                    gap: 1.5,
                    alignItems: 'center',
                    px: 2,
                    py: 1.25,
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Avatar name={s.name} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={600} noWrap>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="p">
                        {s.position}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 0, display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="body2" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {s.phone || '—'}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {s.email || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="body2">{tenure(s)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      since {fromIso(startDateIso(s)).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="body2" fontWeight={600}>
                      {presentThisMonth(s.id)} days
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      present this month
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <Tooltip title="Edit">
                      <IconButton aria-label={`Edit ${s.name}`} onClick={() => openForm(s)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton aria-label={`Remove ${s.name}`} onClick={() => setToDelete(s)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )))}

        {/* Attendance month grid */}
        {tab === 'attendance' &&
          (staff.length === 0 ? (
            emptyState
          ) : (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <IconButton aria-label="Previous month" onClick={() => stepGrid(-1)}>
                  <PrevIcon />
                </IconButton>
                <Typography fontWeight={700} sx={{ minWidth: 140, textAlign: 'center' }}>
                  {gridLabel}
                </Typography>
                <IconButton aria-label="Next month" onClick={() => stepGrid(1)}>
                  <NextIcon />
                </IconButton>
                <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                  Click a day to cycle: present → absent → not recorded
                </Typography>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{ display: 'grid', gridTemplateColumns: `168px repeat(${gridDays.length}, 28px) 52px`, minWidth: 'max-content', fontSize: '0.75rem' }}
                >
                  <Box sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', px: 2, py: 1, fontWeight: 600, color: 'text.secondary' }}>Staff</Box>
                  {gridDays.map((d) => {
                    const date = fromIso(d);
                    const weekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <Box key={d} sx={{ textAlign: 'center', py: 0.5, color: d === today ? 'primary.main' : weekend ? 'text.secondary' : 'text.primary', fontWeight: d === today ? 800 : 600 }}>
                        <div>{date.getDate()}</div>
                        <div style={{ fontWeight: 400, opacity: 0.7 }}>{date.toLocaleDateString('en-PH', { weekday: 'narrow' })}</div>
                      </Box>
                    );
                  })}
                  <Box sx={{ textAlign: 'center', py: 1, fontWeight: 600, color: 'text.secondary' }} title="Days present">Days</Box>
                  {staff.map((s) => {
                    const present = gridDays.filter((d) => statusOn(s.id, d) === 'present').length;
                    return (
                      <React.Fragment key={s.id}>
                        <Box sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', px: 2, py: 0.5, display: 'flex', alignItems: 'center', gap: 1, borderTop: 1, borderColor: 'divider', minWidth: 0 }}>
                          <Avatar name={s.name} size={24} />
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {s.name}
                          </Typography>
                        </Box>
                        {gridDays.map((d) => {
                          const st = statusOn(s.id, d);
                          const future = d > today;
                          return (
                            <Box key={d} sx={{ borderTop: 1, borderColor: 'divider', display: 'grid', placeItems: 'center', py: 0.5 }}>
                              <Box
                                component="button"
                                type="button"
                                disabled={future}
                                aria-label={`${s.name}, ${formatDay(d)}: ${st ?? 'not recorded'}`}
                                title={`${formatDay(d)}: ${st ?? 'not recorded'}${byKey.get(`${s.id}|${d}`)?.notes ? ` · ${byKey.get(`${s.id}|${d}`)!.notes}` : ''}`}
                                onClick={() => cycleCell(s.id, d)}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '6px',
                                  border: 1,
                                  borderColor: st ? 'transparent' : 'divider',
                                  cursor: future ? 'default' : 'pointer',
                                  font: 'inherit',
                                  fontWeight: 800,
                                  fontSize: '0.6875rem',
                                  color: st ? '#fff' : 'text.disabled',
                                  bgcolor: st === 'present' ? 'success.main' : st === 'absent' ? 'error.main' : 'transparent',
                                  opacity: future ? 0.35 : 1,
                                  '&:hover:not(:disabled)': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' },
                                }}
                              >
                                {st === 'present' ? 'P' : st === 'absent' ? 'A' : ''}
                              </Box>
                            </Box>
                          );
                        })}
                        <Box sx={{ borderTop: 1, borderColor: 'divider', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.875rem' }}>{present}</Box>
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            </>
          ))}

        {/* Payroll for everyone */}
        {tab === 'payroll' &&
          (staff.length === 0 ? (
            emptyState
          ) : (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <TextField select size="small" label="Pay period" value={period} onChange={(e) => setPeriod(e.target.value as PayPeriod)} sx={{ minWidth: 190 }}>
                  <MenuItem value="this-month">This month</MenuItem>
                  <MenuItem value="last-month">Last month</MenuItem>
                  <MenuItem value="first-half">1st–15th (this month)</MenuItem>
                  <MenuItem value="second-half">16th–end (this month)</MenuItem>
                  <MenuItem value="custom">Custom dates</MenuItem>
                </TextField>
                {period === 'custom' ? (
                  <>
                    <TextField size="small" type="date" label="From" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="date" label="To" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} InputLabelProps={{ shrink: true }} />
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {fromIso(range.start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – {fromIso(range.end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                )}
                <Button size="small" startIcon={<ExportIcon />} onClick={exportPayroll} sx={{ ml: { sm: 'auto' } }}>
                  Export CSV
                </Button>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 640 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 70px 130px 110px 130px 120px',
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      '& span': { typography: 'caption', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                    }}
                  >
                    <span>Staff</span>
                    <span style={{ textAlign: 'right' }}>Days</span>
                    <span>Daily rate</span>
                    <span style={{ textAlign: 'right' }}>Gross</span>
                    <span>Deduction</span>
                    <span style={{ textAlign: 'right' }}>Net pay</span>
                  </Box>
                  {payroll.map((row) => (
                    <Box
                      key={row.staff.id}
                      sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 70px 130px 110px 130px 120px', gap: 1.5, alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Avatar name={row.staff.name} size={28} />
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {row.staff.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.days}
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={row.rateText}
                        placeholder="0"
                        onChange={(e) => setRateDrafts({ ...rateDrafts, [row.staff.id]: e.target.value })}
                        onBlur={() => commitRate(row.staff.id)}
                        inputProps={{ min: 0, step: 1, 'aria-label': `Daily rate for ${row.staff.name}` }}
                        InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                      />
                      <Typography variant="body2" sx={{ textAlign: 'right' }}>
                        {formatPeso(row.gross)}
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={deductions[row.staff.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => setDeductions({ ...deductions, [row.staff.id]: e.target.value })}
                        inputProps={{ min: 0, step: 1, 'aria-label': `Deduction for ${row.staff.name}` }}
                        InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                      />
                      <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'right', color: row.net < 0 ? 'error.main' : 'text.primary' }}>
                        {formatPeso(row.net)}
                      </Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 2, py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Days are “present” days in the period. Daily rates are remembered; deductions (e.g. credit) are per pay run.
                    </Typography>
                    <Typography fontWeight={700}>Total {formatPeso(payrollTotal)}</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          ))}
      </Card>

      {/* Add / edit staff */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" noValidate onSubmit={saveForm}>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add staff'}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
            <TextField
              autoFocus
              label="Full name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setFormErrors({ ...formErrors, name: undefined });
              }}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
            />
            <TextField
              label="Position"
              value={form.position}
              onChange={(e) => {
                setForm({ ...form, position: e.target.value });
                setFormErrors({ ...formErrors, position: undefined });
              }}
              error={Boolean(formErrors.position)}
              helperText={formErrors.position}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputProps={{ inputMode: 'tel' }} />
              <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} inputProps={{ inputMode: 'email' }} />
              <TextField label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField
                label="Daily rate"
                type="number"
                value={form.dailyRate}
                onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                inputProps={{ min: 0, step: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                helperText="Used in Payroll"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              {editing ? 'Save' : 'Add staff'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Remove staff */}
      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove {toDelete?.name}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Their {toDelete ? attendance.filter((a) => a.staffId === toDelete.id).length : 0} attendance record(s) go with them. You can undo this right after.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff;
