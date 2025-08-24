import { Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Typography, Avatar, Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatDate } from '../../utils/dateUtils';

const statusColors = {
  completed: 'success',
  in_progress: 'warning',
  pending: 'error',
  on_hold: 'info',
  cancelled: 'default',
};

const priorityColors = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const WorkOrderList = ({ workOrders, maxHeight = 400 }) => {
  const theme = useTheme();

  if (!workOrders || workOrders.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No work orders found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      elevation={0}
      sx={{ 
        maxHeight,
        '& .MuiTableCell-root': {
          borderBottom: `1px solid ${theme.palette.divider}`,
        }
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Building</TableCell>
            <TableCell>Assigned To</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Priority</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {workOrders.map((workOrder) => (
            <TableRow 
              key={workOrder._id}
              hover
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <TableCell>
                <Typography variant="body2" noWrap>
                  {workOrder.workOrderNumber || `#${workOrder._id.slice(-4)}`}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" noWrap>
                  {workOrder.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {workOrder.type}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap>
                  {workOrder.building?.name || 'N/A'}
                </Typography>
                {workOrder.apartment && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Apt {workOrder.apartment}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {workOrder.assignedTo && workOrder.assignedTo.length > 0 ? (
                    <>
                      <Avatar 
                        alt={workOrder.assignedTo[0].worker?.name}
                        src={workOrder.assignedTo[0].worker?.avatar}
                        sx={{ width: 32, height: 32, mr: 1, fontSize: '0.75rem' }}
                      >
                        {workOrder.assignedTo[0].worker?.name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" noWrap>
                          {workOrder.assignedTo[0].worker?.name}
                        </Typography>
                        {workOrder.assignedTo.length > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            +{workOrder.assignedTo.length - 1} more
                          </Typography>
                        )}
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap>
                  {formatDate(workOrder.dueDate, 'short')}
                </Typography>
                <Typography 
                  variant="caption" 
                  color={new Date(workOrder.dueDate) < new Date() ? 'error' : 'text.secondary'}
                  noWrap
                >
                  {new Date(workOrder.dueDate) < new Date() ? 'Overdue' : 'Due'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={workOrder.status.replace('_', ' ')}
                  color={statusColors[workOrder.status] || 'default'}
                  size="small"
                  sx={{ 
                    textTransform: 'capitalize',
                    minWidth: 80,
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={workOrder.priority}
                  color={priorityColors[workOrder.priority] || 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    textTransform: 'capitalize',
                    minWidth: 70,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WorkOrderList;
