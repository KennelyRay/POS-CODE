import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  IconButton,
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Divider,
  Paper,
  Tab,
  Tabs,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as SalaryIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  DateRange as DateRangeIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

// Staff interface
interface StaffMember {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  avatar?: string;
  startDate: Date;
}

// Attendance interface
export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD format
  status: 'present' | 'absent';
  notes?: string;
}

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
      id={`staff-tabpanel-${index}`}
      aria-labelledby={`staff-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Staff: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const stored = localStorage.getItem('pos_staff');
    return stored ? JSON.parse(stored) : [];
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const stored = localStorage.getItem('pos_attendance');
    return stored ? JSON.parse(stored) : [];
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ 
    open: false, message: '', severity: 'success' 
  });

  const [formData, setFormData] = useState<Omit<StaffMember, 'id'>>({
    name: '',
    position: '',
    email: '',
    phone: '',
    startDate: new Date(),
  });

  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent'>('present');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  const [salaryCalculation, setSalaryCalculation] = useState({
    selectedStaffId: '',
    dailyRate: '',
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    creditDeduction: '',
    presentDays: 0,
    grossSalary: 0,
    finalSalary: 0,
  });

  // 1. Add state for calendar attendance editing
  const [calendarAttendanceDialogOpen, setCalendarAttendanceDialogOpen] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [calendarAttendanceDraft, setCalendarAttendanceDraft] = useState<Record<string, { status: 'present' | 'absent', notes: string }>>({});

  // Save to localStorage whenever staff or attendance changes
  useEffect(() => {
    localStorage.setItem('pos_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('pos_attendance', JSON.stringify(attendance));
  }, [attendance]);

  // Calculate statistics
  const today = moment().format('YYYY-MM-DD');
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
  const totalStaff = staff.length;
  const notRecordedToday = totalStaff - presentToday - absentToday;

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      email: '',
      phone: '',
      startDate: new Date(),
    });
  };

  const handleSalaryInputChange = (field: string, value: string) => {
    setSalaryCalculation(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getTodayAttendance = (staffId: string) => {
    return attendance.find(a => a.staffId === staffId && a.date === today);
  };

  const handleStaffCardClick = (staffMember: StaffMember) => {
    const existingRecord = attendance.find(a => a.staffId === staffMember.id && a.date === today);
    
    setSelectedStaff(staffMember);
    if (existingRecord) {
      setAttendanceStatus(existingRecord.status);
      setAttendanceNotes(existingRecord.notes || '');
    } else {
      setAttendanceStatus('present');
      setAttendanceNotes('');
    }
    setAttendanceDialogOpen(true);
  };

  const openEditDialog = (s: StaffMember) => {
    setEditingStaff(s);
    setFormData({
      name: s.name,
      position: s.position,
      email: s.email,
      phone: s.phone,
      startDate: s.startDate,
    });
    setDialogOpen(true);
  };

  const handleDeleteStaff = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    setAttendance(prev => prev.filter(a => a.staffId !== id));
    setSnackbar({ open: true, message: 'Staff member deleted successfully!', severity: 'success' });
  };

  const handleUpdateStaff = () => {
    if (!editingStaff || !formData.name || !formData.position) {
      setSnackbar({ open: true, message: 'Please fill in required fields', severity: 'error' });
      return;
    }

    const updatedStaff: StaffMember = {
      ...formData,
      id: editingStaff.id,
    };

    setStaff(prev => prev.map(s => s.id === editingStaff.id ? updatedStaff : s));
    setSnackbar({ open: true, message: 'Staff member updated successfully!', severity: 'success' });
    setDialogOpen(false);
    setEditingStaff(null);
    resetForm();
  };

  const handleAddStaff = () => {
    if (!formData.name || !formData.position) {
      setSnackbar({ open: true, message: 'Please fill in required fields', severity: 'error' });
      return;
    }

    const newStaff: StaffMember = {
      ...formData,
      id: Date.now().toString(),
    };

    setStaff(prev => [...prev, newStaff]);
    setSnackbar({ open: true, message: 'Staff member added successfully!', severity: 'success' });
    setDialogOpen(false);
    resetForm();
  };

  const handleRecordAttendance = () => {
    if (!selectedStaff) return;

    const existingRecord = attendance.find(a => a.staffId === selectedStaff.id && a.date === today);

    if (existingRecord) {
      const updatedRecord: AttendanceRecord = {
        ...existingRecord,
        status: attendanceStatus,
        notes: attendanceNotes,
      };
      setAttendance(prev => prev.map(a => a.id === existingRecord.id ? updatedRecord : a));
      setSnackbar({ open: true, message: 'Attendance updated successfully!', severity: 'success' });
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        staffId: selectedStaff.id,
        date: today,
        status: attendanceStatus,
        notes: attendanceNotes,
      };
      setAttendance(prev => [...prev, newRecord]);
      setSnackbar({ open: true, message: 'Attendance recorded successfully!', severity: 'success' });
    }

    setAttendanceDialogOpen(false);
    setSelectedStaff(null);
    setAttendanceNotes('');
  };

  // Calendar events
  const events = attendance.map(a => {
    const staffMember = staff.find(s => s.id === a.staffId);
    return staffMember ? {
      id: a.id,
      title: `${staffMember.name} - ${a.status === 'present' ? 'Present' : 'Absent'}`,
      start: new Date(a.date),
      end: new Date(a.date),
      resource: {
        staff: staffMember,
        status: a.status,
        notes: a.notes,
      },
    } : null;
  }).filter(Boolean);

  const resetSalaryCalculation = () => {
    setSalaryCalculation({
      selectedStaffId: '',
      dailyRate: '',
      startDate: moment().startOf('month').format('YYYY-MM-DD'),
      endDate: moment().endOf('month').format('YYYY-MM-DD'),
      creditDeduction: '',
      presentDays: 0,
      grossSalary: 0,
      finalSalary: 0,
    });
  };

  const calculateSalary = () => {
    if (!salaryCalculation.selectedStaffId || !salaryCalculation.dailyRate) {
      setSnackbar({ open: true, message: 'Please select staff and enter daily rate', severity: 'error' });
      return;
    }

    const dailyRate = parseFloat(salaryCalculation.dailyRate);
    const creditDeduction = parseFloat(salaryCalculation.creditDeduction) || 0;

    const presentDays = attendance.filter(a => {
      const recordDate = a.date;
      const isInRange = recordDate >= salaryCalculation.startDate && recordDate <= salaryCalculation.endDate;
      const isSelectedStaff = a.staffId === salaryCalculation.selectedStaffId;
      const isPresent = a.status === 'present';
      return isInRange && isSelectedStaff && isPresent;
    }).length;

    const grossSalary = presentDays * dailyRate;
    const finalSalary = grossSalary - creditDeduction;

    setSalaryCalculation(prev => ({
      ...prev,
      presentDays,
      grossSalary,
      finalSalary,
    }));
  };

  // 2. Handler to open dialog for a date
  const handleCalendarDateSelect = (slotInfo: any) => {
    const date = moment(slotInfo.start).format('YYYY-MM-DD');
    setCalendarSelectedDate(date);
    // Prepare draft attendance for all staff for this date
    const draft: Record<string, { status: 'present' | 'absent', notes: string }> = {};
    staff.forEach(s => {
      const rec = attendance.find(a => a.staffId === s.id && a.date === date);
      draft[s.id] = {
        status: rec ? rec.status : 'present',
        notes: rec ? rec.notes || '' : '',
      };
    });
    setCalendarAttendanceDraft(draft);
    setCalendarAttendanceDialogOpen(true);
  };

  // 3. Handler to save attendance edits
  const handleSaveCalendarAttendance = () => {
    if (!calendarSelectedDate) return;
    let updatedAttendance = [...attendance];
    staff.forEach(s => {
      const draft = calendarAttendanceDraft[s.id];
      const existing = updatedAttendance.find(a => a.staffId === s.id && a.date === calendarSelectedDate);
      if (existing) {
        existing.status = draft.status;
        existing.notes = draft.notes;
      } else {
        updatedAttendance.push({
          id: Date.now().toString() + Math.random(),
          staffId: s.id,
          date: calendarSelectedDate,
          status: draft.status,
          notes: draft.notes,
        });
      }
    });
    setAttendance(updatedAttendance);
    setCalendarAttendanceDialogOpen(false);
    setCalendarSelectedDate(null);
    setSnackbar({ open: true, message: 'Attendance updated for selected date.', severity: 'success' });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="primary.main">
              Staff Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your team and track attendance
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ 
            borderRadius: 3,
            px: 3,
            py: 1.5,
            boxShadow: 3,
            '&:hover': { boxShadow: 6 }
          }}
        >
          Add Staff Member
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h3" fontWeight={700}>{totalStaff}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Staff</Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h3" fontWeight={700}>{presentToday}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Present Today</Typography>
              </Box>
              <PresentIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h3" fontWeight={700}>{absentToday}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Absent Today</Typography>
              </Box>
              <AbsentIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h3" fontWeight={700}>{notRecordedToday}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Not Recorded</Typography>
              </Box>
              <ScheduleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ px: 2 }}>
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon fontSize="small" />
                  Staff Directory
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TodayIcon fontSize="small" />
                  Today's Attendance
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon fontSize="small" />
                  Calendar
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SalaryIcon fontSize="small" />
                  Salary Calculator
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Staff Directory Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3, py: 2 }}>
            <Grid container spacing={3}>
              {staff.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <PersonIcon sx={{ fontSize: 120, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h5" color="text.secondary" gutterBottom>
                      No staff members yet
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      Add your first team member to get started with staff management
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={() => setDialogOpen(true)}
                      sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                    >
                      Add Staff Member
                    </Button>
                  </Box>
                </Grid>
              ) : (
                staff.map(staffMember => {
                  const todayAttendance = getTodayAttendance(staffMember.id);
                  return (
                    <Grid item xs={12} sm={6} lg={4} key={staffMember.id}>
                      <Card sx={{
                        borderRadius: 3,
                        boxShadow: 2,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        height: '100%',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        },
                        border: '1px solid',
                        borderColor: 'grey.200',
                      }} onClick={() => handleStaffCardClick(staffMember)}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar 
                              sx={{ 
                                width: 50, 
                                height: 50, 
                                mr: 2, 
                                bgcolor: 'primary.main',
                                fontSize: 18,
                                fontWeight: 700
                              }}
                            >
                              {staffMember.name.charAt(0)}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="h6" fontWeight={700} gutterBottom noWrap>
                                {staffMember.name}
                              </Typography>
                              <Chip 
                                label={staffMember.position} 
                                size="small" 
                                sx={{ 
                                  bgcolor: 'primary.50', 
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  maxWidth: '100%'
                                }} 
                              />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(staffMember);
                                }}
                                sx={{ bgcolor: 'grey.50', width: 32, height: 32 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStaff(staffMember.id);
                                }}
                                sx={{ bgcolor: 'error.50', width: 32, height: 32 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmailIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                {staffMember.email || 'No email provided'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                {staffMember.phone || 'No phone provided'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <DateRangeIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                Started: {moment(staffMember.startDate).format('MMM DD, YYYY')}
                              </Typography>
                            </Box>
                          </Stack>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                              Today's Status:
                            </Typography>
                            {todayAttendance ? (
                              <Chip
                                icon={todayAttendance.status === 'present' ? <PresentIcon /> : <AbsentIcon />}
                                label={todayAttendance.status === 'present' ? 'Present' : 'Absent'}
                                color={todayAttendance.status === 'present' ? 'success' : 'error'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Chip 
                                label="Not Recorded" 
                                color="warning" 
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* Today's Attendance Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3, py: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={700}>
                Today's Attendance - {moment().format('MMMM DD, YYYY')}
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {staff.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <TodayIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No staff members to track
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add staff members to start tracking daily attendance
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                staff.map(staffMember => {
                  const todayAttendance = getTodayAttendance(staffMember.id);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={staffMember.id}>
                      <Card 
                        sx={{ 
                          borderRadius: 3,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: todayAttendance 
                            ? (todayAttendance.status === 'present' ? 'success.main' : 'error.main')
                            : 'warning.main',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            boxShadow: 4,
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => handleStaffCardClick(staffMember)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                              {staffMember.name.charAt(0)}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" fontWeight={600} noWrap>
                                {staffMember.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {staffMember.position}
                              </Typography>
                            </Box>
                            {todayAttendance ? (
                              <Chip
                                icon={todayAttendance.status === 'present' ? <PresentIcon /> : <AbsentIcon />}
                                label={todayAttendance.status}
                                color={todayAttendance.status === 'present' ? 'success' : 'error'}
                                variant="filled"
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Chip 
                                label="Record" 
                                color="warning" 
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Box>
                          {todayAttendance?.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                              Note: {todayAttendance.notes}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* Calendar Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3, py: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={700}>
                Staff Attendance Calendar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View attendance history across all staff members
              </Typography>
            </Box>
            <Box sx={{ 
              height: 600, 
              border: '1px solid', 
              borderColor: 'grey.200', 
              borderRadius: 2,
              p: 2,
              bgcolor: 'background.paper'
            }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                eventPropGetter={(event: any) => ({
                  style: {
                    backgroundColor: event.resource?.status === 'present' ? '#4caf50' : '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                  },
                })}
                views={['month', 'week', 'day']}
                defaultView="month"
                popup
                style={{ height: '100%' }}
                selectable
                onSelectSlot={handleCalendarDateSelect}
                onSelectEvent={handleCalendarDateSelect}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Salary Calculator Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3, py: 2 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box sx={{ pr: { md: 3 } }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
                    Calculate Salary
                  </Typography>
                  <Stack spacing={3}>
                    <FormControl fullWidth>
                      <InputLabel>Select Staff Member</InputLabel>
                      <Select
                        value={salaryCalculation.selectedStaffId}
                        label="Select Staff Member"
                        onChange={e => handleSalaryInputChange('selectedStaffId', e.target.value)}
                      >
                        {staff.map(s => (
                          <MenuItem key={s.id} value={s.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                {s.name.charAt(0)}
                              </Avatar>
                              {s.name} - {s.position}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <TextField
                      fullWidth
                      label="Daily Rate (₱)"
                      type="number"
                      value={salaryCalculation.dailyRate}
                      onChange={e => handleSalaryInputChange('dailyRate', e.target.value)}
                      InputProps={{
                        startAdornment: <SalaryIcon color="action" sx={{ mr: 1 }} />,
                      }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Start Date"
                        type="date"
                        value={salaryCalculation.startDate}
                        onChange={e => handleSalaryInputChange('startDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="End Date"
                        type="date"
                        value={salaryCalculation.endDate}
                        onChange={e => handleSalaryInputChange('endDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    
                    <TextField
                      fullWidth
                      label="Credit Deduction (₱)"
                      type="number"
                      value={salaryCalculation.creditDeduction}
                      onChange={e => handleSalaryInputChange('creditDeduction', e.target.value)}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={resetSalaryCalculation}
                        sx={{ 
                          borderRadius: 2, 
                          minWidth: 120,
                          py: 1.5
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="contained"
                        onClick={calculateSalary}
                        sx={{ 
                          borderRadius: 2, 
                          flexGrow: 1,
                          py: 1.5,
                          fontWeight: 600
                        }}
                      >
                        Calculate Salary
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ pl: { md: 3 } }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
                    Salary Summary
                  </Typography>
                  <Stack spacing={3}>
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      bgcolor: 'primary.50',
                      border: '1px solid',
                      borderColor: 'primary.100'
                    }}>
                      <Typography variant="h3" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                        {salaryCalculation.presentDays}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Present Days
                      </Typography>
                    </Paper>
                    
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      bgcolor: 'success.50',
                      border: '1px solid',
                      borderColor: 'success.100'
                    }}>
                      <Typography variant="h3" fontWeight={700} color="success.main" sx={{ mb: 1 }}>
                        ₱{salaryCalculation.grossSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Gross Salary
                      </Typography>
                    </Paper>
                    
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      bgcolor: 'warning.50',
                      border: '1px solid',
                      borderColor: 'warning.100'
                    }}>
                      <Typography variant="h3" fontWeight={700} color="warning.main" sx={{ mb: 1 }}>
                        ₱{salaryCalculation.finalSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Final Salary (After Deductions)
                      </Typography>
                    </Paper>
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Full Name *"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              InputProps={{
                startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            <TextField
              fullWidth
              label="Position *"
              value={formData.position}
              onChange={e => setFormData({ ...formData, position: e.target.value })}
              InputProps={{
                startAdornment: <WorkIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              InputProps={{
                startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={moment(formData.startDate).format('YYYY-MM-DD')}
              onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <DateRangeIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => { setDialogOpen(false); setEditingStaff(null); resetForm(); }}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={editingStaff ? handleUpdateStaff : handleAddStaff}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {editingStaff ? 'Update Staff' : 'Add Staff'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={() => setAttendanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TodayIcon color="primary" />
            Record Attendance - {selectedStaff?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Attendance Status</InputLabel>
              <Select
                value={attendanceStatus}
                onChange={e => setAttendanceStatus(e.target.value as 'present' | 'absent')}
                label="Attendance Status"
              >
                <MenuItem value="present">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PresentIcon color="success" fontSize="small" />
                    Present
                  </Box>
                </MenuItem>
                <MenuItem value="absent">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AbsentIcon color="error" fontSize="small" />
                    Absent
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={attendanceNotes}
              onChange={e => setAttendanceNotes(e.target.value)}
              placeholder="Add any additional notes about attendance..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => { setAttendanceDialogOpen(false); setSelectedStaff(null); setAttendanceNotes(''); }}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleRecordAttendance}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Record Attendance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calendar Attendance Edit Dialog */}
      <Dialog open={calendarAttendanceDialogOpen} onClose={() => setCalendarAttendanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon color="primary" />
            Edit Attendance - {calendarSelectedDate && moment(calendarSelectedDate).format('MMMM DD, YYYY')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            {staff.map(s => (
              <Paper key={s.id} sx={{ p: 2, borderRadius: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>{s.name.charAt(0)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700}>{s.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.position}</Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={calendarAttendanceDraft[s.id]?.status || 'present'}
                    onChange={e => setCalendarAttendanceDraft(draft => ({ ...draft, [s.id]: { ...draft[s.id], status: e.target.value as 'present' | 'absent' } }))}
                  >
                    <MenuItem value="present">Present</MenuItem>
                    <MenuItem value="absent">Absent</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Notes"
                  value={calendarAttendanceDraft[s.id]?.notes || ''}
                  onChange={e => setCalendarAttendanceDraft(draft => ({ ...draft, [s.id]: { ...draft[s.id], notes: e.target.value } }))}
                  sx={{ minWidth: 120 }}
                />
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalendarAttendanceDialogOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCalendarAttendance} sx={{ borderRadius: 2, px: 3 }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Staff; 
