import { useState } from 'react';
import { 
  BottomNavigation, 
  BottomNavigationAction, 
  Paper, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Business as BuildingIcon,
  Assignment as WorkOrderIcon,
  People as WorkerIcon,
  Menu as MenuIcon,
  AccessTime as TimeTrackingIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

const MobileNavigation = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hasPermission, isWorker, canAccessMainDashboard, canAccessWorkerDashboard } = useAuth();
  
  // Only render on mobile devices
  if (!isMobile) return null;
  
  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };
  
  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/worker-dashboard') return 'workerDashboard';
    if (path.includes('/buildings')) return 'buildings';
    if (path.includes('/work-orders')) return 'workOrders';
    if (path.includes('/workers')) return 'workers';
    if (path.includes('/time-tracking')) return 'timeTracking';
    return isWorker ? 'workerDashboard' : 'dashboard';
  };
  
  // Define navigation items based on user permissions
  const getNavigationItems = () => {
    const items = [];

    // Worker Dashboard - only for workers
    if (isWorker && canAccessWorkerDashboard()) {
      items.push({
        label: 'My Tasks',
        value: 'workerDashboard',
        icon: <WorkIcon />,
        path: '/worker-dashboard',
        permission: 'view:dashboard:worker'
      });
    }

    // Main Dashboard - for non-workers
    if (canAccessMainDashboard()) {
      items.push({
        label: 'Dashboard',
        value: 'dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        permission: 'read:all'
      });
    }

    // Buildings - only if user has permission
    if (hasPermission(['read:buildings'])) {
      items.push({
        label: 'Buildings',
        value: 'buildings',
        icon: <BuildingIcon />,
        path: '/buildings',
        permission: 'read:buildings'
      });
    }

    // Work Orders - only for non-workers with permission
    if (!isWorker && hasPermission(['read:workorders'])) {
      items.push({
        label: 'Work Orders',
        value: 'workOrders',
        icon: <WorkOrderIcon />,
        path: '/work-orders',
        permission: 'read:workorders'
      });
    }

    // Workers - not for workers themselves
    if (!isWorker && hasPermission(['read:workers'])) {
      items.push({
        label: 'Workers',
        value: 'workers',
        icon: <WorkerIcon />,
        path: '/workers',
        permission: 'read:workers'
      });
    }

    // Time Tracking - only for admins/managers
    if (!isWorker && hasPermission(['view:costs', 'manage:users'])) {
      items.push({
        label: 'Time Tracking',
        value: 'timeTracking',
        icon: <TimeTrackingIcon />,
        path: '/time-tracking-management',
        permission: 'view:costs'
      });
    }

    // Reports - for admins/managers
    if (hasPermission(['view:costs', 'manage:users'])) {
      items.push({
        label: 'Payroll Report',
        value: 'payrollReport',
        icon: <AssessmentIcon />,
        path: '/reports/payroll',
        permission: 'view:costs'
      });
    }

    return items;
  };

  const navigationItems = getNavigationItems();
  
  return (
    <>
      {/* Bottom Navigation */}
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
          display: { xs: 'block', sm: 'none' }
        }} 
        elevation={3}
      >
        <BottomNavigation
          value={getCurrentValue()}
          onChange={(event, newValue) => {
            const item = navigationItems.find(item => item.value === newValue);
            if (item) navigate(item.path);
            if (newValue === 'menu') setDrawerOpen(true);
          }}
          showLabels
        >
          {/* Show up to 4 navigation items, then menu for the rest */}
          {navigationItems.slice(0, Math.min(4, navigationItems.length)).map(item => (
            <BottomNavigationAction 
              key={item.value}
              label={item.label} 
              value={item.value} 
              icon={item.icon} 
            />
          ))}
          {/* Only show menu button if there are more than 4 items */}
          {navigationItems.length > 4 && (
            <BottomNavigationAction 
              label="Menu" 
              value="menu" 
              icon={<MenuIcon />} 
            />
          )}
        </BottomNavigation>
      </Paper>
      
      {/* Drawer for additional menu items */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}>
            <Box />
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {navigationItems.map((item) => (
              <ListItem 
                button 
                key={item.value}
                onClick={() => handleNavigation(item.path)}
                selected={getCurrentValue() === item.value}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
      {/* Add bottom padding to content to prevent overlap with navigation */}
      <Box sx={{ pb: 7, display: { xs: 'block', sm: 'none' } }} />
    </>
  );
};

export default MobileNavigation;