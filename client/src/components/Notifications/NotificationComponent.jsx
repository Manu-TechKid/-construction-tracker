import React, { useState } from 'react';
import { 
  Badge, 
  IconButton, 
  Menu, 
  MenuItem, 
  Typography, 
  Box, 
  Divider,
  ListItemIcon,
  ListItemText,
  Button,
  Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationComponent = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAllNotifications,
    simulateNotification
  } = useNotifications();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };
  
  const handleRemove = (id, event) => {
    event.stopPropagation();
    removeNotification(id);
  };

  const getIcon = (icon) => {
    switch(icon) {
      case 'info':
        return <InfoIcon color="info" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };
  
  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          size="large"
          aria-controls={open ? 'notifications-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          color="inherit"
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            width: 320,
            maxHeight: 400,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={markAllAsRead} disabled={unreadCount === 0}>
                <MarkEmailReadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear all">
              <IconButton size="small" onClick={clearAllNotifications} disabled={notifications.length === 0}>
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider />
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <>
            {notifications.map((notification) => (
              <MenuItem 
                key={notification.id} 
                onClick={() => handleMarkAsRead(notification.id)}
                sx={{ 
                  backgroundColor: notification.read ? 'inherit' : 'rgba(0, 0, 0, 0.04)',
                  py: 1,
                  px: 2
                }}
              >
                <ListItemIcon>
                  {getIcon(notification.icon)}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="subtitle2" noWrap>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          mb: 0.5
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </Typography>
                    </>
                  }
                />
                <IconButton 
                  size="small" 
                  onClick={(e) => handleRemove(notification.id, e)}
                  sx={{ ml: 1 }}
                >
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </MenuItem>
            ))}
          </>
        )}
        
        <Divider />
        
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Button 
            size="small" 
            onClick={() => simulateNotification('info')}
            sx={{ mx: 0.5 }}
          >
            Test Info
          </Button>
          <Button 
            size="small" 
            onClick={() => simulateNotification('success')}
            sx={{ mx: 0.5 }}
          >
            Test Success
          </Button>
          <Button 
            size="small" 
            onClick={() => simulateNotification('warning')}
            sx={{ mx: 0.5 }}
          >
            Test Warning
          </Button>
          <Button 
            size="small" 
            onClick={() => simulateNotification('error')}
            sx={{ mx: 0.5 }}
          >
            Test Error
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationComponent;