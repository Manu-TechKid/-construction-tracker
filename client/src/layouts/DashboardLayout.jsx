import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  NotificationsActive as ReminderIcon,
  Note as NoteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Work as WorkIcon,
  CheckCircle as ApprovalIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
  Approval as ProjectApprovalIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';
import BuildingSelector from '../components/common/BuildingSelector';
import MobileNavigation from '../components/layout/MobileNavigation';
import NotificationComponent from '../components/Notifications/NotificationComponent';

const drawerWidth = 240;

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, hasPermission, isWorker, canAccessMainDashboard, canAccessWorkerDashboard } = useAuth();

  // Redirect workers to their dashboard if they try to access main dashboard
  useEffect(() => {
    if (isWorker && location.pathname === '/dashboard' && !canAccessMainDashboard()) {
      navigate('/worker-dashboard');
    }
  }, [isWorker, location.pathname, canAccessMainDashboard, navigate]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const items = [];

    // Worker Dashboard - only for workers
    if (isWorker && canAccessWorkerDashboard()) {
      items.push({
        text: 'My Assignments',
        icon: <WorkIcon />,
        path: '/worker-dashboard',
        permission: 'view:dashboard:worker'
      });
    }

    // Main Dashboard - for non-workers
    if (canAccessMainDashboard()) {
      items.push({
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        permission: 'read:all'
      });
    }

    // Buildings
    if (hasPermission(['read:buildings'])) {
      items.push({
        text: 'Buildings',
        icon: <BusinessIcon />,
        path: '/buildings',
        permission: 'read:buildings'
      });
    }

    // Work Orders - only for non-workers (admin, manager, supervisor)
    if (!isWorker && hasPermission(['read:workorders'])) {
      items.push({
        text: 'Work Orders',
        icon: <AssignmentIcon />,
        path: '/work-orders',
        permission: 'read:workorders'
      });
    }

    // Work Progress - only for non-workers
    if (!isWorker && hasPermission(['read:workorders'])) {
      items.push({
        text: 'Work Progress',
        icon: <WorkIcon />,
        path: '/work-orders/progress',
        permission: 'read:workorders'
      });
    }

    // Workers - not for workers themselves
    if (!isWorker && hasPermission(['read:workers'])) {
      items.push({
        text: 'Workers',
        icon: <PeopleIcon />,
        path: '/workers',
        permission: 'read:workers'
      });
    }

    // Worker Schedules - for scheduling workers
    if (!isWorker && hasPermission(['read:schedules'])) {
      items.push({
        text: 'Worker Schedules',
        icon: <ScheduleIcon />,
        path: '/worker-schedules',
        permission: 'read:schedules'
      });
    }

    // Time Management - for admins/managers
    if (!isWorker && hasPermission(['view:costs', 'manage:users'])) {
      items.push({
        text: 'Time Management',
        icon: <TimeIcon />,
        path: '/time-tracking-management',
        permission: 'view:costs'
      });
    }

    // User Management - for admins (comprehensive user management)
    if (!isWorker && hasPermission(['manage:users'])) {
      items.push({
        text: 'User Management',
        icon: <PeopleIcon />,
        path: '/user-management',
        permission: 'manage:users'
      });
    }

    // Admin Worker Management - for admins (worker-specific management)
    if (!isWorker && hasPermission(['manage:users'])) {
      items.push({
        text: 'Worker Management',
        icon: <PeopleIcon />,
        path: '/admin-worker-management',
        permission: 'manage:users'
      });
    }

    // Project Estimates - for viewing and managing estimates
    if (!isWorker && hasPermission(['view:costs', 'manage:users'])) {
      items.push({
        text: 'Project Estimates',
        icon: <AssignmentIcon />,
        path: '/project-estimates',
        permission: 'view:costs'
      });
    }

    // Pending Project Approval - for admins/managers
    if (!isWorker && hasPermission(['view:costs', 'manage:users'])) {
      items.push({
        text: 'Pending Project Approval',
        icon: <ProjectApprovalIcon />,
        path: '/projects-pending-approval',
        permission: 'view:costs'
      });
    }

    // Work Order Approval - for admins/managers
    if (!isWorker && hasPermission(['view:costs', 'manage:users'])) {
      items.push({
        text: 'Work Order Approval',
        icon: <ProjectApprovalIcon />,
        path: '/work-order-approval',
        permission: 'view:costs'
      });
    }

    // Invoices - not for workers
    if (!isWorker && hasPermission(['read:invoices'])) {
      items.push({
        text: 'Invoices',
        icon: <ReceiptIcon />,
        path: '/invoices',
        permission: 'read:invoices'
      });
    }

    // Reminders
    if (hasPermission(['read:reminders'])) {
      items.push({
        text: 'Reminders',
        icon: <ReminderIcon />,
        path: '/reminders',
        permission: 'read:reminders'
      });
    }

    // Notes
    if (hasPermission(['read:notes'])) {
      items.push({
        text: 'Notes',
        icon: <NoteIcon />,
        path: '/notes',
        permission: 'read:notes'
      });
    }

    // Schedule
    if (hasPermission(['read:schedules'])) {
      items.push({
        text: 'Schedule',
        icon: <ScheduleIcon />,
        path: '/schedule',
        permission: 'read:schedules'
      });
    }

    // Apartment Search - available to all users
    items.push({
      text: 'Apartment Search',
      icon: <SearchIcon />,
      path: '/apartment-search',
      permission: 'read:all'
    });

    // System Setup - Admin only
    if (hasPermission(['manage:system'])) {
      items.push({
        text: 'System Setup',
        icon: <SettingsIcon />,
        path: '/setup',
        permission: 'manage:system'
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Construction Tracker
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/profile')}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/settings')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" noWrap component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {isWorker ? 'Worker Dashboard' : 'Construction Management'}
            </Typography>
            {!isWorker && <BuildingSelector />}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationComponent />
            <Chip
              label={user?.role?.toUpperCase() || 'USER'}
              color="secondary"
              size="small"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
            />
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          mb: { xs: 7, sm: 0 }, // Add bottom margin on mobile for the bottom navigation
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
      >
        <MenuItem onClick={() => handleNavigation('/profile')}>
          <PersonIcon sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => handleNavigation('/settings')}>
          <SettingsIcon sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DashboardLayout;
