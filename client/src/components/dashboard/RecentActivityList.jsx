import React, { useMemo } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Typography, 
  Divider,
  Box,
  Chip
} from '@mui/material';
import {
  Assignment as WorkOrderIcon,
  AccessTime as TimeTrackingIcon,
  CheckCircle as CompletedIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { timeAgo } from '../../utils/dateUtils';

const RecentActivityList = ({ workOrders = [], timeSessions = [] }) => {
  const activities = useMemo(() => {
    return [
      ...workOrders.map(wo => ({
        ...wo,
        type: 'workOrder',
        date: new Date(wo.updatedAt || wo.createdAt)
      })),
      ...timeSessions.map(session => ({
        ...session,
        type: 'timeSession',
        date: new Date(session.updatedAt || session.createdAt)
      }))
    ].sort((a, b) => b.date - a.date).slice(0, 10);
  }, [workOrders, timeSessions]);

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No recent activity
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {activities.map((activity, index) => {
        const isWorkOrder = activity.type === 'workOrder';
        
        // Work Order Item
        if (isWorkOrder) {
          return (
            <React.Fragment key={`${activity.type}-${activity._id}`}>
              {index > 0 && <Divider variant="inset" component="li" />}
              <ListItem alignItems="flex-start">
                <ListItemIcon>
                  <WorkOrderIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Work Order: {activity.title || 'Untitled'}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {activity.description?.substring(0, 60)}
                        {activity.description?.length > 60 ? '...' : ''}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          size="small" 
                          label={activity.status} 
                          color={activity.status === 'completed' ? 'success' : 'primary'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {timeAgo(activity.date)}
                        </Typography>
                      </Box>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          );
        }
        
        // Time Session Item
        return (
          <React.Fragment key={`${activity.type}-${activity._id}`}>
            {index > 0 && <Divider variant="inset" component="li" />}
            <ListItem alignItems="flex-start">
              <ListItemIcon>
                <TimeTrackingIcon color="secondary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle1">
                    Time Session: {activity.worker?.name || 'Unknown Worker'}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {activity.building?.name || 'Unknown Location'}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {activity.geofenceValidated === false ? (
                        <Chip 
                          size="small" 
                          label="Geofence Violation" 
                          color="error"
                          icon={<ErrorIcon />}
                        />
                      ) : (
                        <Chip 
                          size="small" 
                          label="Compliant" 
                          color="success"
                          icon={<CompletedIcon />}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {timeAgo(activity.date)}
                      </Typography>
                    </Box>
                  </>
                }
              />
            </ListItem>
          </React.Fragment>
        );
      })}
    </List>
  );
};

export default RecentActivityList;