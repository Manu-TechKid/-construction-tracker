import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
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
  MenuItem,
  Tooltip,
  Badge,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  Receipt as LetterIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  AttachMoney as PayrollIcon,
  Assignment as TaskIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import WeeklyHoursReport from '../../components/timeTracking/WeeklyHoursReport';

const AdminWorkerManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [letterDialog, setLetterDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    search: ''
  });
  const [expandedWorker, setExpandedWorker] = useState(null);

  // API queries
  const { data: usersData, isLoading, refetch } = useGetUsersQuery();
  
  const users = usersData?.data?.users || [];
  
  // Filter workers (exclude admins and managers)
  const workers = useMemo(() => {
    return users.filter(user => 
      user.role === 'worker' || user.role === 'employee'
    ).filter(worker => {
      const statusMatch = !filters.status || worker.status === filters.status;
      const searchMatch = !filters.search || 
        worker.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        worker.email.toLowerCase().includes(filters.search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [users, filters]);

  // Generate employment letter
  const generateEmploymentLetter = (worker) => {
    const letterContent = {
      workerName: worker.name,
      companyName: 'Construction Management Company',
      position: 'Construction Worker',
      startDate: format(new Date(worker.createdAt), 'MMMM dd, yyyy'),
      currentDate: format(new Date(), 'MMMM dd, yyyy'),
      managerName: user.name,
      managerTitle: 'Operations Manager'
    };

    const letterHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1976d2; margin-bottom: 10px;">EMPLOYMENT REFERENCE LETTER</h1>
          <p style="color: #666; margin: 0;">Construction Management Company</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p><strong>Date:</strong> ${letterContent.currentDate}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p><strong>To Whom It May Concern:</strong></p>
        </div>
        
        <div style="line-height: 1.6; margin-bottom: 30px;">
          <p>This letter serves to confirm that <strong>${letterContent.workerName}</strong> has been employed with ${letterContent.companyName} as a ${letterContent.position} in the Operations department since ${letterContent.startDate}.</p>
          
          <p>During their employment, ${letterContent.workerName} has demonstrated dedication and reliability in their work assignments. They have consistently shown:</p>
          
          <ul>
            <li>Punctuality and regular attendance</li>
            <li>Professional conduct and teamwork</li>
            <li>Adherence to safety protocols and regulations</li>
            <li>Quality workmanship and attention to detail</li>
            <li>Willingness to learn and adapt to new tasks</li>
          </ul>
          
          <p>${letterContent.workerName} has been a valuable member of our construction team and has contributed positively to various projects under our management.</p>
          
          <p>This letter is issued upon request for official purposes. Should you require any additional information, please feel free to contact our office.</p>
        </div>
        
        <div style="margin-top: 50px;">
          <p><strong>Sincerely,</strong></p>
          <br>
          <p><strong>${letterContent.managerName}</strong><br>
          ${letterContent.managerTitle}<br>
          Construction Management Company<br>
          Phone: (555) 123-4567<br>
          Email: ${user.email}</p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p>This letter was generated electronically and is valid without signature.</p>
          <p>Generated on: ${letterContent.currentDate}</p>
        </div>
      </div>
    `;

    // Create and download the letter
    const blob = new Blob([letterHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employment_Letter_${worker.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Employment letter generated for ${worker.name}`);
  };

  const handleWorkerExpand = (workerId) => {
    setExpandedWorker(expandedWorker === workerId ? null : workerId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon color="primary" />
          Worker Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage workers, generate employment letters, and track performance
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={workers.filter(w => w.status === 'active').length} color="success">
                <ActiveIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              </Badge>
              <Typography variant="h6">Active Workers</Typography>
              <Typography variant="body2" color="text.secondary">
                Currently employed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={workers.length} color="primary">
                <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              </Badge>
              <Typography variant="h6">Total Workers</Typography>
              <Typography variant="body2" color="text.secondary">
                All registered workers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TimeIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">Time Tracking</Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor work hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LetterIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">Employment Letters</Typography>
              <Typography variant="body2" color="text.secondary">
                Generate official letters
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label="All Workers" />
          <Tab label="Weekly Hours" />
          <Tab label="Employment Letters" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Card>
          <CardContent>
            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search Workers"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by name or email..."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/workers/create')}
                  fullWidth
                >
                  Add New Worker
                </Button>
              </Grid>
            </Grid>

            {/* Workers List */}
            {workers.length === 0 ? (
              <Alert severity="info">No workers found matching your criteria.</Alert>
            ) : (
              workers.map((worker) => (
                <Accordion 
                  key={worker._id}
                  expanded={expandedWorker === worker._id}
                  onChange={() => handleWorkerExpand(worker._id)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {worker.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">{worker.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {worker.email}
                        </Typography>
                      </Box>
                      <Chip 
                        label={worker.status || 'active'}
                        color={getStatusColor(worker.status)}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Role:</strong> {worker.role || 'Worker'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Email:</strong> {worker.email}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Joined:</strong> {format(new Date(worker.createdAt), 'MMM dd, yyyy')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => navigate(`/workers/${worker._id}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/workers/${worker._id}/edit`)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            startIcon={<TimeIcon />}
                            onClick={() => navigate(`/time-tracking-management?worker=${worker._id}`)}
                          >
                            Time Tracking
                          </Button>
                          <Button
                            size="small"
                            startIcon={<LetterIcon />}
                            onClick={() => generateEmploymentLetter(worker)}
                            color="warning"
                          >
                            Generate Letter
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {selectedTab === 1 && (
        <WeeklyHoursReport />
      )}

      {selectedTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Employment Letters Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generate official employment reference letters for workers
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Joined Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow key={worker._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {worker.name.charAt(0).toUpperCase()}
                          </Avatar>
                          {worker.name}
                        </Box>
                      </TableCell>
                      <TableCell>{worker.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={worker.status || 'active'}
                          color={getStatusColor(worker.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{format(new Date(worker.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Generate Employment Letter">
                          <IconButton
                            onClick={() => generateEmploymentLetter(worker)}
                            color="primary"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default AdminWorkerManagement;
