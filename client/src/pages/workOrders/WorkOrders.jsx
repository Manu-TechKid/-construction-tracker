import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { format } from 'date-fns';

const WorkOrders = () => {
  const navigate = useNavigate();
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading work orders.</Alert>;
  }

  const workOrders = workOrdersData?.data || [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Work Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/work-orders/new')}
        >
          Create Work Order
        </Button>
      </Box>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Scheduled Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders.map((workOrder) => (
                <TableRow key={workOrder._id} hover>
                  <TableCell>{workOrder.title}</TableCell>
                  <TableCell>{workOrder.building?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip label={workOrder.status} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={workOrder.priority} size="small" />
                  </TableCell>
                  <TableCell>
                    {format(new Date(workOrder.scheduledDate), 'MM/dd/yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => navigate(`/work-orders/${workOrder._id}`)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default WorkOrders;
