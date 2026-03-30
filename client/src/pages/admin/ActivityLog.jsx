import React, { useState } from 'react';
import { useGetActivityLogQuery } from '../../features/activityLog/activityLogApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress, 
  Alert,
  Chip,
  IconButton,
  Tooltip,
  TablePagination
} from '@mui/material';
import { 
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const ActivityLog = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { data, isLoading, error, refetch } = useGetActivityLogQuery();

  if (user.role !== 'superuser' && user.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load activity log.</Alert>
      </Box>
    );
  }

  const activities = data?.data?.activities || [];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'success';
      case 'update': return 'info';
      case 'delete': return 'error';
      case 'login': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon color="primary" sx={{ fontSize: 30 }} />
          <Typography variant="h4" component="h1">Activity Log</Typography>
        </Box>
        <IconButton onClick={() => refetch()} color="primary" title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

      <Card elevation={3}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {log.user?.name || 'Unknown User'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {log.user?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.action.toUpperCase()} 
                          size="small" 
                          color={getActionColor(log.action)}
                          sx={{ fontWeight: 'bold', minWidth: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                          {log.entity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ 
                            fontFamily: 'monospace',
                            backgroundColor: 'grey.100',
                            p: 0.5,
                            borderRadius: 1
                          }}>
                            ID: {log.entityId?.substring(log.entityId.length - 6) || 'N/A'}
                          </Typography>
                          {log.details?.path && (
                            <Tooltip title={log.details.path}>
                              <IconButton size="small">
                                <InfoIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                {activities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="textSecondary italic">
                        No activity records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={activities.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default ActivityLog;
