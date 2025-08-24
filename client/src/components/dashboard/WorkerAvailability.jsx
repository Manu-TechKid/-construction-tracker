import { Box, Typography, Avatar, Paper, LinearProgress, useTheme } from '@mui/material';
import { Person, CheckCircle, Warning, Error } from '@mui/icons-material';

const statusConfig = {
  available: {
    icon: <CheckCircle color="success" />,
    color: 'success.main',
    label: 'Available',
  },
  busy: {
    icon: <Warning color="warning" />,
    color: 'warning.main',
    label: 'Busy',
  },
  on_leave: {
    icon: <Error color="error" />,
    color: 'error.main',
    label: 'On Leave',
  },
};

const WorkerCard = ({ worker }) => {
  const theme = useTheme();
  const { name, status = 'available', assignedWorkOrders = 0 } = worker;
  const config = statusConfig[status] || statusConfig.available;
  
  // Calculate workload percentage (max 100%)
  const workload = Math.min(100, (assignedWorkOrders / 5) * 100);
  
  // Determine workload color
  const getWorkloadColor = () => {
    if (workload > 80) return 'error.main';
    if (workload > 50) return 'warning.main';
    return 'success.main';
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          boxShadow: theme.shadows[2],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, mr: 2 }}>
          {name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ color: config.color, mr: 1, display: 'flex' }}>
              {config.icon}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {config.label}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Workload
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {assignedWorkOrders} {assignedWorkOrders === 1 ? 'task' : 'tasks'}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={workload}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              backgroundColor: getWorkloadColor(),
            },
          }}
        />
      </Box>
    </Paper>
  );
};

const WorkerAvailability = ({ workers = [] }) => {
  if (workers.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No worker data available
        </Typography>
      </Box>
    );
  }

  // Group workers by status
  const groupedWorkers = workers.reduce((acc, worker) => {
    const status = worker.status || 'available';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(worker);
    return acc;
  }, {});

  // Sort by status: available -> busy -> on_leave
  const statusOrder = ['available', 'busy', 'on_leave'];
  const sortedStatus = Object.keys(groupedWorkers).sort(
    (a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b)
  );

  return (
    <Box>
      {sortedStatus.map((status) => {
        const config = statusConfig[status] || statusConfig.available;
        return (
          <Box key={status} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ color: config.color, mr: 1, display: 'flex' }}>
                {config.icon}
              </Box>
              <Typography variant="subtitle1" fontWeight={500}>
                {config.label} ({groupedWorkers[status].length})
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
              }}
            >
              {groupedWorkers[status].map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default WorkerAvailability;
