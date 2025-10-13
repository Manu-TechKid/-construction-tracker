import React, { useState } from 'react';
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
  Close as CloseIcon
} from '@mui/icons-material';

const MobileNavigation = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Only render on mobile devices
  if (!isMobile) return null;
  
  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };
  
  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.includes('/buildings')) return 'buildings';
    if (path.includes('/work-orders')) return 'workOrders';
    if (path.includes('/workers')) return 'workers';
    if (path.includes('/time-tracking')) return 'timeTracking';
    return 'dashboard';
  };
  
  const navigationItems = [
    { label: 'Dashboard', value: 'dashboard', icon: <DashboardIcon />, path: '/' },
    { label: 'Buildings', value: 'buildings', icon: <BuildingIcon />, path: '/buildings' },
    { label: 'Work Orders', value: 'workOrders', icon: <WorkOrderIcon />, path: '/work-orders' },
    { label: 'Workers', value: 'workers', icon: <WorkerIcon />, path: '/workers' },
    { label: 'Time Tracking', value: 'timeTracking', icon: <TimeTrackingIcon />, path: '/time-tracking' }
  ];
  
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
          {navigationItems.slice(0, 4).map(item => (
            <BottomNavigationAction 
              key={item.value}
              label={item.label} 
              value={item.value} 
              icon={item.icon} 
            />
          ))}
          <BottomNavigationAction 
            label="Menu" 
            value="menu" 
            icon={<MenuIcon />} 
          />
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