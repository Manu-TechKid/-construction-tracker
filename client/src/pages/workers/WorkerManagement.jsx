import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as TimeIcon,
  Receipt as LetterIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Assignment as TaskIcon
} from '@mui/icons-material';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useGetUserQuery } from '../../features/users/usersApiSlice';
import { useGetTimeTrackingQuery } from '../../features/timeTracking/timeTrackingApiSlice';
import { useGetWorkerAssignmentsQuery } from '../../features/workers/workersApiSlice';

const WorkerManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [letterDialog, setLetterDialog] = useState(false);
  const [letterData, setLetterData] = useState({
    startDate: '',
    endDate: '',
    totalHours: 0,
    hourlyRate: 0,
    totalEarnings: 0,
    workDescription: '',
    performanceRating: 'excellent'
  });
  const [timeFilters, setTimeFilters] = useState({
    startDate: startOfWeek(new Date()),
    endDate: endOfWeek(new Date()),
    period: 'week'
  });

  // API queries
  const { data: workerData, isLoading: workerLoading, error: workerError } = useGetUserQuery(id);
  const { data: timeData, isLoading: timeLoading } = useGetTimeTrackingQuery({
    workerId: id,
    startDate: timeFilters.startDate,
    endDate: timeFilters.endDate
  });
  const { data: assignmentsData, isLoading: assignmentsLoading } = useGetWorkerAssignmentsQuery(id);

  const worker = workerData?.data?.user;
  const timeEntries = timeData?.data?.timeEntries || [];
  const assignments = assignmentsData?.data?.workOrders || [];

  // Calculate time statistics
  const timeStats = React.useMemo(() => {
    if (!timeEntries.length) return { totalHours: 0, totalEarnings: 0, averageDaily: 0 };
    
    const totalMinutes = timeEntries.reduce((sum, entry) => {
      if (entry.endTime && entry.startTime) {
        const start = new Date(entry.startTime);
        const end = new Date(entry.endTime);
        return sum + (end - start) / (1000 * 60);
      }
      return sum;
    }, 0);
    
    const totalHours = totalMinutes / 60;
    const hourlyRate = worker?.workerProfile?.hourlyRate || 0;
    const totalEarnings = totalHours * hourlyRate;
    const workingDays = Math.max(1, new Set(timeEntries.map(e => 
      format(parseISO(e.startTime), 'yyyy-MM-dd')
    )).size);
    const averageDaily = totalHours / workingDays;
    
    return { totalHours, totalEarnings, averageDaily };
  }, [timeEntries, worker]);

  // Handle period change
  const handlePeriodChange = (period) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'custom':
        // Keep current dates
        return;
      default:
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
    }
    
    setTimeFilters({ period, startDate, endDate });
  };

  // Generate employment letter
  const generateEmploymentLetter = () => {
    const letterContent = {
      workerName: `${worker?.firstName} ${worker?.lastName}`,
      startDate: letterData.startDate,
      endDate: letterData.endDate,
      totalHours: timeStats.totalHours.toFixed(2),
      hourlyRate: worker?.workerProfile?.hourlyRate || 0,
      totalEarnings: timeStats.totalEarnings.toFixed(2),
      workDescription: letterData.workDescription || 'Construction and maintenance work',
      performanceRating: letterData.performanceRating,
      companyName: 'DSJ Services',
      date: format(new Date(), 'MMMM dd, yyyy')
    };

    // Create letter content
    const letterHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center; color: #1976d2;">EMPLOYMENT REFERENCE LETTER</h1>
        <p style="text-align: center; margin-bottom: 30px;">Date: ${letterContent.date}</p>
        
        <p><strong>To Whom It May Concern:</strong></p>
        
        <p>This letter serves to confirm that ${letterContent.workerName} has been employed with ${letterContent.companyName} as a Construction Worker in the Operations department since ${letterContent.startDate}.</p>
        
        <p>During their employment, ${letterContent.workerName} has demonstrated dedication and reliability in their work assignments.</p>
        
        <p><strong>Work Summary for the period ${letterContent.startDate} to ${letterContent.endDate}:</strong></p>
        <ul>
          <li>Total hours worked: ${letterContent.totalHours} hours</li>
          <li>Number of projects completed: ${assignments.length}</li>
          <li>Average hours per week: ${(parseFloat(letterContent.totalHours) / 4).toFixed(1)} hours</li>
        </ul>
        
        <p>${letterContent.workerName} has worked at various building locations and maintained a professional approach to their responsibilities.</p>
        
        <p>If you require any additional information, please do not hesitate to contact us.</p>
        
        <p>Sincerely,<br>
        ${letterContent.companyName}<br>
        Human Resources Department</p>
        
        <p style="font-style: italic; margin-top: 30px;">This letter is computer generated and valid without signature.<br>
        Generated on: ${letterContent.date}</p>
      </div>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(letterHTML);
    printWindow.document.close();
    printWindow.print();
    
    setLetterDialog(false);
    toast.success('Employment letter generated successfully');
  };

  if (workerLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (workerError || !worker) {
    return (
      <Container>
        <Alert severity="error">
          Worker not found or error loading worker data
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/workers')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h4" component="h1">
              {worker.firstName} {worker.lastName}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {worker.workerProfile?.skills?.join(', ') || 'General Worker'}
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<LetterIcon />}
              onClick={() => setLetterDialog(true)}
            >
              Generate Letter
            </Button>
            {hasPermission(['update:workers']) && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/workers/edit/${worker._id}`)}
              >
                Edit Worker
              </Button>
            )}
          </Box>
        </Box>

        {/* Worker Info Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <PersonIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Contact Info</Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                  <PhoneIcon sx={{ fontSize: 16, mr: 1 }} />
                  {worker.phone || 'No phone'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <EmailIcon sx={{ fontSize: 16, mr: 1 }} />
                  {worker.email}
                </Typography>
                <Typography variant="body2">
                  Status: <Chip 
                    label={worker.workerProfile?.approved ? 'Approved' : 'Pending'} 
                    color={worker.workerProfile?.approved ? 'success' : 'warning'}
                    size="small"
                  />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TimeIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">This Period</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {timeStats.totalHours.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Avg: {timeStats.averageDaily.toFixed(1)}h/day
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <MoneyIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Earnings</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  ${timeStats.totalEarnings.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Rate: ${worker.workerProfile?.hourlyRate || 0}/hr
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TaskIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Active Tasks</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {assignments.filter(a => a.status === 'in_progress').length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total: {assignments.length} assignments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
              <Tab label="Time Tracking" />
              <Tab label="Work Assignments" />
              <Tab label="Performance" />
            </Tabs>
          </Box>

          {/* Time Tracking Tab */}
          {selectedTab === 0 && (
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Time Tracking</Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <Button
                    variant={timeFilters.period === 'week' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handlePeriodChange('week')}
                  >
                    This Week
                  </Button>
                  <Button
                    variant={timeFilters.period === 'month' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handlePeriodChange('month')}
                  >
                    This Month
                  </Button>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={timeFilters.startDate}
                      onChange={(date) => setTimeFilters(prev => ({ ...prev, startDate: date, period: 'custom' }))}
                      renderInput={(params) => <TextField {...params} size="small" />}
                    />
                    <DatePicker
                      label="End Date"
                      value={timeFilters.endDate}
                      onChange={(date) => setTimeFilters(prev => ({ ...prev, endDate: date, period: 'custom' }))}
                      renderInput={(params) => <TextField {...params} size="small" />}
                    />
                  </LocalizationProvider>
                </Box>
              </Box>

              {timeLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : timeEntries.length === 0 ? (
                <Alert severity="info">
                  No time entries found for the selected period.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Hours</TableCell>
                        <TableCell>Work Order</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Earnings</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timeEntries.map((entry) => {
                        const hours = entry.endTime && entry.startTime ? 
                          (new Date(entry.endTime) - new Date(entry.startTime)) / (1000 * 60 * 60) : 0;
                        const earnings = hours * (worker.workerProfile?.hourlyRate || 0);
                        
                        return (
                          <TableRow key={entry._id}>
                            <TableCell>
                              {format(parseISO(entry.startTime), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              {format(parseISO(entry.startTime), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              {entry.endTime ? format(parseISO(entry.endTime), 'HH:mm') : 'In Progress'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {hours.toFixed(2)}h
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {entry.workOrder?.title || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {entry.workOrder?.building?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="success.main" fontWeight="bold">
                                ${earnings.toFixed(2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          )}

          {/* Work Assignments Tab */}
          {selectedTab === 1 && (
            <CardContent>
              <Typography variant="h6" gutterBottom>Work Assignments</Typography>
              {assignmentsLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : assignments.length === 0 ? (
                <Alert severity="info">
                  No work assignments found for this worker.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Work Order</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Progress</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment._id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {assignment.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {assignment.description}
                            </Typography>
                          </TableCell>
                          <TableCell>{assignment.building?.name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={assignment.status} 
                              color={
                                assignment.status === 'completed' ? 'success' :
                                assignment.status === 'in_progress' ? 'primary' :
                                assignment.status === 'pending' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={assignment.priority} 
                              color={
                                assignment.priority === 'urgent' ? 'error' :
                                assignment.priority === 'high' ? 'warning' :
                                assignment.priority === 'medium' ? 'info' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {assignment.dueDate ? 
                              format(parseISO(assignment.dueDate), 'MMM dd, yyyy') : 'No due date'
                            }
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {assignment.progress || 0}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          )}

          {/* Performance Tab */}
          {selectedTab === 2 && (
            <CardContent>
              <Typography variant="h6" gutterBottom>Performance Summary</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Work Statistics</Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Total Assignments:</Typography>
                        <Typography fontWeight="bold">{assignments.length}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Completed:</Typography>
                        <Typography fontWeight="bold" color="success.main">
                          {assignments.filter(a => a.status === 'completed').length}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>In Progress:</Typography>
                        <Typography fontWeight="bold" color="primary.main">
                          {assignments.filter(a => a.status === 'in_progress').length}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Completion Rate:</Typography>
                        <Typography fontWeight="bold">
                          {assignments.length > 0 ? 
                            ((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100).toFixed(1) : 0
                          }%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Skills & Ratings</Typography>
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Skills:</Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {worker.workerProfile?.skills?.map((skill) => (
                            <Chip key={skill} label={skill} size="small" />
                          )) || <Typography variant="body2" color="textSecondary">No skills listed</Typography>}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Experience Level:</Typography>
                        <Typography variant="body2">
                          {worker.workerProfile?.experienceLevel || 'Not specified'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          )}
        </Card>

        {/* Employment Letter Dialog */}
        <Dialog open={letterDialog} onClose={() => setLetterDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Generate Employment Reference Letter</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Employment Start Date"
                    value={letterData.startDate}
                    onChange={(date) => setLetterData(prev => ({ ...prev, startDate: date }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Employment End Date"
                    value={letterData.endDate}
                    onChange={(date) => setLetterData(prev => ({ ...prev, endDate: date }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Work Description"
                  value={letterData.workDescription}
                  onChange={(e) => setLetterData(prev => ({ ...prev, workDescription: e.target.value }))}
                  placeholder="Describe the type of work performed..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Performance Rating</InputLabel>
                  <Select
                    value={letterData.performanceRating}
                    label="Performance Rating"
                    onChange={(e) => setLetterData(prev => ({ ...prev, performanceRating: e.target.value }))}
                  >
                    <MenuItem value="excellent">Excellent</MenuItem>
                    <MenuItem value="good">Good</MenuItem>
                    <MenuItem value="satisfactory">Satisfactory</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLetterDialog(false)}>Cancel</Button>
            <Button 
              onClick={generateEmploymentLetter} 
              variant="contained"
              startIcon={<PrintIcon />}
            >
              Generate & Print Letter
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default WorkerManagement;
