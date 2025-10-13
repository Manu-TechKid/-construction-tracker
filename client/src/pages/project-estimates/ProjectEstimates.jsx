import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Transform as ConvertIcon,
  Receipt as InvoiceIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Business as BuildingIcon
} from '@mui/icons-material';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetProjectEstimatesQuery,
  useDeleteProjectEstimateMutation,
  useConvertToInvoiceMutation,
  useGetProjectEstimateStatsQuery
} from '../../features/projectEstimates/projectEstimatesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const ProjectEstimates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    building: '',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    priority: ''
  });

  // API queries
  const { data: projectsData, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useGetProjectEstimatesQuery(filters);
  const { data: statsData, isLoading: statsLoading } = useGetProjectEstimateStatsQuery(filters);
  const { data: buildingsData } = useGetBuildingsQuery();

  // Mutations
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectEstimateMutation();
  const [convertToInvoice, { isLoading: isConverting }] = useConvertToInvoiceMutation();

  const projects = projectsData?.data?.projectEstimates || [];
  const stats = statsData?.data?.stats || {};
  const buildings = buildingsData?.data?.buildings || [];

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'info';
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'converted': return 'primary';
      case 'invoiced': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getBuildingName = (project) => {
    if (project.building && typeof project.building === 'object') {
      return project.building.name || 'Unknown Building';
    }
    
    if (project.buildingId && typeof project.buildingId === 'object') {
      return project.buildingId.name || 'Unknown Building';
    }
    
    const buildingId = project.building || project.buildingId;
    const building = buildings.find(b => b._id === buildingId);
    return building?.name || 'Unknown Building';
  };

  const calculateProfit = (price, cost) => {
    return (price || 0) - (cost || 0);
  };

  const calculateProfitMargin = (price, cost) => {
    if (!price || price === 0) return 0;
    const profit = calculateProfit(price, cost);
    return ((profit / price) * 100).toFixed(1);
  };

  // Event handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (projectId) => {
    try {
      const confirmed = window.confirm('Delete this project estimate? This action cannot be undone.');
      if (!confirmed) return;

      await deleteProject(projectId).unwrap();
      toast.success('Project estimate deleted successfully');
      refetchProjects();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete project estimate: ${error?.data?.message || error?.message || 'Unknown error'}`);
    }
  };

  const handleConvertToInvoice = async (projectId) => {
    try {
      const confirmed = window.confirm('Convert this project estimate to an invoice?');
      if (!confirmed) return;

      const result = await convertToInvoice(projectId).unwrap();
      toast.success('Project estimate converted to invoice successfully');
      refetchProjects();
      
      // Navigate to the new invoice
      if (result?.data?.invoice?._id) {
        navigate(`/invoices/${result.data.invoice._id}`);
      }
    } catch (error) {
      console.error('Convert error:', error);
      toast.error(`Failed to convert project estimate: ${error?.data?.message || error?.message || 'Unknown error'}`);
    }
  };

  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setDetailsDialog(true);
  };

  const handleEdit = (projectId) => {
    navigate(`/project-estimates/edit/${projectId}`);
  };

  // Quick filter buttons for months
  const setMonthFilter = (monthsAgo) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    setFilters(prev => ({
      ...prev,
      startDate: start,
      endDate: end
    }));
  };

  // Statistics cards
  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: `${color}.main`, color: 'white', p: 1, borderRadius: 1 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Project Estimates
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetchProjects()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/project-estimates/new')}
            >
              New Estimate
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Estimates"
              value={projects.length}
              icon={<BuildingIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Value"
              value={`$${(stats.totalEstimatedValue || 0).toLocaleString()}`}
              icon={<MoneyIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Approved"
              value={projects.filter(p => p.status === 'approved').length}
              icon={<CalendarIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending"
              value={projects.filter(p => p.status === 'pending').length}
              icon={<CalendarIcon />}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filters
            </Typography>
            
            {/* Quick Month Buttons */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>Quick Filters:</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter(0)}
                >
                  This Month
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter(1)}
                >
                  Last Month
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter(2)}
                >
                  2 Months Ago
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter(3)}
                >
                  3 Months Ago
                </Button>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="submitted">Submitted</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="converted">Converted</MenuItem>
                    <MenuItem value="invoiced">Invoiced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={filters.building}
                    label="Building"
                    onChange={(e) => handleFilterChange('building', e.target.value)}
                  >
                    <MenuItem value="">All Buildings</MenuItem>
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filters.priority}
                    label="Priority"
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Project Estimates Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Project Estimates ({projects.length})
            </Typography>
            {projectsLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : projectsError ? (
              <Alert severity="error">
                Error loading project estimates: {projectsError?.data?.message || projectsError?.message || 'Unknown error'}
              </Alert>
            ) : projects.length === 0 ? (
              <Alert severity="info">
                No project estimates found for the selected filters. Create a new estimate to get started.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Building</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Estimated Price</TableCell>
                      <TableCell>Estimated Cost</TableCell>
                      <TableCell>Profit</TableCell>
                      <TableCell>Visit Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">{project.title}</Typography>
                            {project.apartmentNumber && (
                              <Typography variant="caption" color="textSecondary">
                                Apt: {project.apartmentNumber}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{getBuildingName(project)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={project.status} 
                            color={getStatusColor(project.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={project.priority} 
                            color={getPriorityColor(project.priority)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>${(project.estimatedPrice || 0).toFixed(2)}</TableCell>
                        <TableCell>${(project.estimatedCost || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Typography 
                            color={calculateProfit(project.estimatedPrice, project.estimatedCost) >= 0 ? 'success.main' : 'error.main'}
                          >
                            ${calculateProfit(project.estimatedPrice, project.estimatedCost).toFixed(2)}
                            <br />
                            <Typography variant="caption">
                              ({calculateProfitMargin(project.estimatedPrice, project.estimatedCost)}%)
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {project.visitDate ? format(parseISO(project.visitDate), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewDetails(project)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Estimate">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEdit(project._id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {project.status === 'approved' && project.status !== 'invoiced' && (
                            <Tooltip title="Convert to Invoice">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleConvertToInvoice(project._id)}
                                disabled={isConverting}
                              >
                                <InvoiceIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {project.status !== 'converted' && project.status !== 'invoiced' && (
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDelete(project._id)}
                                disabled={isDeleting}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Project Details Dialog */}
        <Dialog 
          open={detailsDialog} 
          onClose={() => setDetailsDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Project Estimate Details</DialogTitle>
          <DialogContent>
            {selectedProject && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">{selectedProject.title}</Typography>
                  <Typography color="textSecondary">{selectedProject.description}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Building</Typography>
                  <Typography>{getBuildingName(selectedProject)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Apartment</Typography>
                  <Typography>{selectedProject.apartmentNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Estimated Price</Typography>
                  <Typography>${(selectedProject.estimatedPrice || 0).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Estimated Cost</Typography>
                  <Typography>${(selectedProject.estimatedCost || 0).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Visit Date</Typography>
                  <Typography>
                    {selectedProject.visitDate ? format(parseISO(selectedProject.visitDate), 'MMM dd, yyyy') : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Target Year</Typography>
                  <Typography>{selectedProject.targetYear}</Typography>
                </Grid>
                {selectedProject.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Notes</Typography>
                    <Typography>{selectedProject.notes}</Typography>
                  </Grid>
                )}
                {selectedProject.photos && selectedProject.photos.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Photos ({selectedProject.photos.length})</Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                      {selectedProject.photos.map((photo, index) => (
                        <img 
                          key={index}
                          src={`${process.env.REACT_APP_API_URL}${photo.url}`}
                          alt={photo.caption || `Photo ${index + 1}`}
                          style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ProjectEstimates;
