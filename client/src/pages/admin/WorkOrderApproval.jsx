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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  Business as BuildingIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetWorkOrdersQuery,
  useUpdateWorkOrderMutation
} from '../../features/workOrders/workOrdersApiSlice';

const WorkOrderApproval = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // API queries - get work orders that need approval (completed but not approved for billing)
  const { 
    data: pendingData, 
    isLoading: isPendingLoading, 
    error: pendingError,
    refetch: refetchPending 
  } = useGetWorkOrdersQuery({ 
    status: 'completed',
    billingStatus: 'pending'
  });
  
  const { 
    data: approvedData, 
    isLoading: isApprovedLoading,
    error: approvedError 
  } = useGetWorkOrdersQuery({ 
    billingStatus: 'invoiced'
  });

  // Mutations
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();

  const pendingWorkOrders = pendingData?.data?.workOrders || [];
  const approvedWorkOrders = approvedData?.data?.workOrders || [];

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getBillingStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'invoiced': return 'info';
      case 'paid': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // Event handlers
  const handleApproval = async (workOrderId, approved, reason = '') => {
    try {
      const updateData = {
        billingStatus: approved ? 'invoiced' : 'cancelled',
        ...(reason && { rejectionReason: reason })
      };

      await updateWorkOrder({
        id: workOrderId,
        ...updateData
      }).unwrap();
      
      toast.success(`Work order ${approved ? 'approved for billing' : 'rejected'} successfully`);
      setApprovalDialog(false);
      setRejectionReason('');
      refetchPending();
    } catch (error) {
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} work order`);
    }
  };

  const handleViewDetails = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setDetailsDialog(true);
  };

  const calculateProfit = (price, cost) => {
    const profit = (price || 0) - (cost || 0);
    return profit;
  };

  const calculateProfitMargin = (price, cost) => {
    if (!price || price === 0) return 0;
    const profit = calculateProfit(price, cost);
    return ((profit / price) * 100).toFixed(1);
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
          <Box sx={{ color: `${color}.main` }}>
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
            Work Order Approval
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refetchPending();
            }}
          >
            Refresh
          </Button>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Approval"
              value={pendingWorkOrders.length}
              icon={<AssignmentIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Approved Today"
              value={approvedWorkOrders.filter(wo => 
                format(new Date(wo.updatedAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              ).length}
              icon={<ApproveIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Cost"
              value={`$${pendingWorkOrders.reduce((sum, wo) => sum + (wo.price || 0), 0).toFixed(2)}`}
              icon={<MoneyIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Approved Cost"
              value={`$${approvedWorkOrders.reduce((sum, wo) => sum + (wo.price || 0), 0).toFixed(2)}`}
              icon={<MoneyIcon />}
              color="primary"
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab 
              label={
                <Badge badgeContent={pendingWorkOrders.length} color="error">
                  Pending Approval
                </Badge>
              } 
            />
            <Tab label="Approved Sessions" />
            <Tab label="Statistics" />
          </Tabs>
        </Box>

        {/* Content */}
        {selectedTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Work Orders Pending Approval
              </Typography>
              {isPendingLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : pendingError ? (
                <Alert severity="error">
                  Error loading pending work orders: {pendingError?.data?.message || pendingError?.message || 'Unknown error'}
                </Alert>
              ) : pendingWorkOrders.length === 0 ? (
                <Alert severity="info">
                  No work orders pending approval. Work orders must be completed before they can be approved for billing.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Assigned To</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Cost</TableCell>
                        <TableCell>Profit</TableCell>
                        <TableCell>Margin</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingWorkOrders.map((workOrder) => (
                        <TableRow key={workOrder._id}>
                          <TableCell>{workOrder.title}</TableCell>
                          <TableCell>{workOrder.building?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {workOrder.assignedTo?.map(assignment => 
                              assignment.worker?.name || assignment.worker?.email
                            ).join(', ') || 'Unassigned'}
                          </TableCell>
                          <TableCell>${(workOrder.price || 0).toFixed(2)}</TableCell>
                          <TableCell>${(workOrder.cost || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Typography 
                              color={calculateProfit(workOrder.price, workOrder.cost) >= 0 ? 'success.main' : 'error.main'}
                            >
                              ${calculateProfit(workOrder.price, workOrder.cost).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              color={calculateProfitMargin(workOrder.price, workOrder.cost) >= 20 ? 'success.main' : 'warning.main'}
                            >
                              {calculateProfitMargin(workOrder.price, workOrder.cost)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={workOrder.status} 
                              color={getStatusColor(workOrder.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewDetails(workOrder)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Button
                              size="small"
                              startIcon={<ApproveIcon />}
                              color="success"
                              onClick={() => handleApproval(workOrder._id, true)}
                              disabled={isUpdating}
                              sx={{ ml: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              startIcon={<RejectIcon />}
                              color="error"
                              onClick={() => {
                                setSelectedWorkOrder(workOrder);
                                setApprovalDialog(true);
                              }}
                              disabled={isUpdating}
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
                Approved Work Orders
              </Typography>
              {isApprovedLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : approvedError ? (
                <Alert severity="error">
                  Error loading approved work orders: {approvedError?.data?.message || approvedError?.message || 'Unknown error'}
                </Alert>
              ) : approvedWorkOrders.length === 0 ? (
                <Alert severity="info">
                  No approved work orders found. Work orders will appear here after being approved for billing.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Building</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Billing Status</TableCell>
                        <TableCell>Approved Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {approvedWorkOrders.map((workOrder) => (
                        <TableRow key={workOrder._id}>
                          <TableCell>{workOrder.title}</TableCell>
                          <TableCell>{workOrder.building?.name || 'N/A'}</TableCell>
                          <TableCell>${(workOrder.price || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={workOrder.billingStatus} 
                              color={getBillingStatusColor(workOrder.billingStatus)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {format(new Date(workOrder.updatedAt), 'MMM dd, yyyy')}
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
                    Financial Overview
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Total Pending Revenue:</Typography>
                    <Typography variant="h6" color="warning.main">
                      ${pendingWorkOrders.reduce((sum, wo) => sum + (wo.price || 0), 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Total Approved Revenue:</Typography>
                    <Typography variant="h6" color="success.main">
                      ${approvedWorkOrders.reduce((sum, wo) => sum + (wo.price || 0), 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Average Profit Margin:</Typography>
                    <Typography variant="h6">
                      {pendingWorkOrders.length > 0 
                        ? (pendingWorkOrders.reduce((sum, wo) => 
                            sum + parseFloat(calculateProfitMargin(wo.price, wo.cost)), 0
                          ) / pendingWorkOrders.length).toFixed(1)
                        : 0
                      }%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Work Order Details Dialog */}
        <Dialog 
          open={detailsDialog} 
          onClose={() => setDetailsDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Work Order Details</DialogTitle>
          <DialogContent>
            {selectedWorkOrder && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">{selectedWorkOrder.title}</Typography>
                  <Typography color="textSecondary">{selectedWorkOrder.description}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Building</Typography>
                  <Typography>{selectedWorkOrder.building?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Apartment</Typography>
                  <Typography>{selectedWorkOrder.apartmentNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Price</Typography>
                  <Typography>${(selectedWorkOrder.price || 0).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Cost</Typography>
                  <Typography>${(selectedWorkOrder.cost || 0).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Profit</Typography>
                  <Typography 
                    color={calculateProfit(selectedWorkOrder.price, selectedWorkOrder.cost) >= 0 ? 'success.main' : 'error.main'}
                  >
                    ${calculateProfit(selectedWorkOrder.price, selectedWorkOrder.cost).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Profit Margin</Typography>
                  <Typography>{calculateProfitMargin(selectedWorkOrder.price, selectedWorkOrder.cost)}%</Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
          <DialogTitle>Reject Work Order</DialogTitle>
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
              onClick={() => handleApproval(selectedWorkOrder?._id, false, rejectionReason)}
              color="error"
              disabled={!rejectionReason.trim() || isUpdating}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default WorkOrderApproval;
