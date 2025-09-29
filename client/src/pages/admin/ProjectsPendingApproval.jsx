import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery,
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
  Tooltip
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  PhotoCamera as PhotoIcon,
  Business as BuildingIcon,
  Delete as DeleteIcon,
  Transform as ConvertIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetProjectEstimatesQuery,
  useGetPendingProjectApprovalsQuery,
  useApproveProjectEstimateMutation,
  useDeleteProjectEstimateMutation,
  useConvertToWorkOrderMutation,
  useGetProjectEstimateStatsQuery
} from '../../features/projectEstimates/projectEstimatesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const ProjectsPendingApproval = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    building: '',
    targetYear: new Date().getFullYear(),
    priority: ''
  });

  // API queries
  const { data: projectsData, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useGetProjectEstimatesQuery(filters);
  const { data: pendingData, isLoading: pendingLoading, error: pendingError, refetch: refetchPending } = useGetPendingProjectApprovalsQuery();
  const { data: statsData, isLoading: statsLoading } = useGetProjectEstimateStatsQuery({ targetYear: filters.targetYear });
  const { data: buildingsData } = useGetBuildingsQuery();

  // Mutations
  const [approveProject, { isLoading: isApproving }] = useApproveProjectEstimateMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectEstimateMutation();
  const [convertToWorkOrder, { isLoading: isConverting }] = useConvertToWorkOrderMutation();

  const projects = projectsData?.data?.projectEstimates || [];
  const pendingProjects = pendingData?.data?.projectEstimates || [];
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
    // Handle both populated and non-populated building data
    if (project.building && typeof project.building === 'object') {
      // Building is populated as an object
      return project.building.name || 'Unknown Building';
    }
    
    // Check if buildingId exists and is populated
    if (project.buildingId && typeof project.buildingId === 'object') {
      return project.buildingId.name || 'Unknown Building';
    }
    
    // Building is just an ID, find it in the buildings list
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

  const handleApproval = async (projectId, approved, reason = '') => {
    try {
      const result = await approveProject({
        id: projectId,
        approved,
        rejectionReason: reason
      }).unwrap();

      toast.success(`Project ${approved ? 'approved' : 'rejected'} successfully`);
      setApprovalDialog(false);
      setRejectionReason('');
      refetchPending();
      refetchProjects();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} project: ${error?.data?.message || error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (projectId) => {
    try {
      const confirmed = window.confirm('Delete this project estimate? This action cannot be undone.');
      if (!confirmed) return;

      await deleteProject(projectId).unwrap();
      toast.success('Project estimate deleted successfully');
      refetchProjects();
      refetchPending();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete project estimate: ${error?.data?.message || error?.message || 'Unknown error'}`);
    }
  };

  const handleConvert = async (projectId) => {
    try {
      const confirmed = window.confirm('Convert this project estimate to a work order?');
      if (!confirmed) return;

      await convertToWorkOrder(projectId).unwrap();
      toast.success('Project estimate converted to work order successfully');
      refetchProjects();
      refetchPending();
    } catch (error) {
      console.error('Convert error:', error);
      toast.error(`Failed to convert project estimate: ${error?.data?.message || error?.message || 'Unknown error'}`);
    }
  };

  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setDetailsDialog(true);
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
          <Avatar sx={{ bgcolor: `${color}.main` }}>
            {icon}
          </Avatar>
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
            Pending Project Approval
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                refetchProjects();
                refetchPending();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              href="/project-estimates/new"
            >
              New Project
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Approval"
              value={pendingProjects.length}
              icon={<AssignmentIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Projects"
              value={stats.totalProjects || 0}
              icon={<BuildingIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Estimated Value"
              value={`$${(stats.totalEstimatedValue || 0).toFixed(0)}`}
              icon={<MoneyIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Target Year"
              value={filters.targetYear}
              icon={<CalendarIcon />}
              color="info"
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
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Target Year"
                  type="number"
                  value={filters.targetYear}
                  onChange={(e) => handleFilterChange('targetYear', parseInt(e.target.value))}
                  inputProps={{ min: 2024, max: 2030 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab 
              label={
                <Badge badgeContent={pendingProjects.length} color="error">
                  Pending Approval
                </Badge>
              } 
            />
            <Tab label="All Projects" />
            <Tab label="Statistics" />
          </Tabs>
        </Box>

        {/* Content */}
        {selectedTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Projects Pending Approval
              </Typography>
              {pendingLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : pendingError ? (
                <Alert severity="error">
                  Error loading pending projects: {pendingError?.data?.message || pendingError?.message || 'Unknown error'}
                </Alert>
              ) : pendingProjects.length === 0 ? (
                <Alert severity="info">
                  No projects pending approval. Create project estimates from your building visits to get started.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Estimated Price</TableCell>
                        <TableCell>Estimated Cost</TableCell>
                        <TableCell>Profit</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Visit Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingProjects.map((project) => (
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
                            <Chip 
                              label={project.priority} 
                              color={getPriorityColor(project.priority)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {format(parseISO(project.visitDate), 'MMM dd, yyyy')}
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
                            {project.photos && project.photos.length > 0 && (
                              <Tooltip title={`${project.photos.length} Photos`}>
                                <IconButton size="small">
                                  <PhotoIcon color="primary" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Button
                              size="small"
                              startIcon={<ApproveIcon />}
                              color="success"
                              onClick={() => handleApproval(project._id, true)}
                              disabled={isApproving}
                              sx={{ ml: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              startIcon={<RejectIcon />}
                              color="error"
                              onClick={() => {
                                setSelectedProject(project);
                                setApprovalDialog(true);
                              }}
                              disabled={isApproving}
                              sx={{ ml: 1 }}
                            >
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All Project Estimates
              </Typography>
              {projectsLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : projectsError ? (
                <Alert severity="error">
                  Error loading projects: {projectsError?.data?.message || projectsError?.message || 'Unknown error'}
                </Alert>
              ) : projects.length === 0 ? (
                <Alert severity="info">
                  No project estimates found. Start by visiting buildings and creating estimates.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Estimated Price</TableCell>
                        <TableCell>Target Year</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project._id}>
                          <TableCell>{project.title}</TableCell>
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
                          <TableCell>{project.targetYear}</TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewDetails(project)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {project.status === 'approved' && (
                              <Tooltip title="Convert to Work Order">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleConvert(project._id)}
                                  disabled={isConverting}
                                >
                                  <ConvertIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {project.status !== 'converted' && (
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
        )}

        {selectedTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Financial Overview ({filters.targetYear})
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Total Estimated Revenue:</Typography>
                    <Typography variant="h6" color="success.main">
                      ${(stats.totalEstimatedValue || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Total Estimated Cost:</Typography>
                    <Typography variant="h6" color="warning.main">
                      ${(stats.totalEstimatedCost || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Estimated Profit:</Typography>
                    <Typography variant="h6" color="primary.main">
                      ${(stats.totalEstimatedProfit || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Status Breakdown
                  </Typography>
                  {Object.entries(stats.byStatus || {}).map(([status, data]) => (
                    <Box key={status} display="flex" justifyContent="space-between" mb={1}>
                      <Typography>{status.charAt(0).toUpperCase() + status.slice(1)}:</Typography>
                      <Typography>{data.count} projects (${data.value?.toFixed(2) || '0.00'})</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

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
                  <Typography>{format(parseISO(selectedProject.visitDate), 'MMM dd, yyyy')}</Typography>
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

        {/* Rejection Dialog */}
        <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
          <DialogTitle>Reject Project Estimate</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Rejection Reason"
              fullWidth
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => handleApproval(selectedProject?._id, false, rejectionReason)}
              color="error"
              disabled={!rejectionReason.trim() || isApproving}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ProjectsPendingApproval;
