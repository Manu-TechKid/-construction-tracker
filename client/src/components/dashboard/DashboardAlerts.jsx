import React, { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Tooltip,
} from '@mui/material';
import { Warning as WarningIcon, Call as CallIcon, NotificationsActive as BellIcon } from '@mui/icons-material';
import { useGetRemindersQuery } from '../../features/reminders/remindersApiSlice';
import { useGetCallsQuery } from '../../features/calls/callsApiSlice';
import { format, isBefore, isToday, startOfDay, endOfDay, subDays } from 'date-fns';

const DashboardAlerts = () => {
  const today = new Date();
  const startToday = startOfDay(today);
  const endToday = endOfDay(today);

  const { data: remindersData } = useGetRemindersQuery({
    page: 1,
    limit: 100,
    status: '',
    priority: '',
    building: '',
    search: '',
  });

  const { data: callsData } = useGetCallsQuery({
    startDate: subDays(today, 90).toISOString(),
    limit: 200,
  });

  const reminders = remindersData?.data?.reminders || [];
  const calls = callsData?.data?.callLogs || [];

  const { overdueReminders, todayReminders, upcomingReminders } = useMemo(() => {
    const overdue = [];
    const todayList = [];
    const upcomingList = [];

    reminders.forEach((rem) => {
      if (!rem.dueDate) return;
      if (rem.status === 'completed') return;
      const due = new Date(rem.dueDate);
      if (isBefore(due, startToday)) {
        overdue.push(rem);
      } else if (isToday(due)) {
        todayList.push(rem);
      } else {
        upcomingList.push(rem);
      }
    });

    return {
      overdueReminders: overdue,
      todayReminders: todayList,
      upcomingReminders: upcomingList,
    };
  }, [reminders, startToday]);

  const pendingCalls = useMemo(() => {
    return calls.filter((c) => {
      if (!c.nextAction?.date) return false;
      const nextDate = new Date(c.nextAction.date);
      return nextDate <= endToday;
    });
  }, [calls, endToday]);

  const hasAlerts =
    overdueReminders.length > 0 || todayReminders.length > 0 || pendingCalls.length > 0;

  return (
    <Card elevation={3}>
      <CardHeader
        avatar={<BellIcon color={hasAlerts ? 'error' : 'disabled'} />}
        title="Today's Alerts"
        subheader={
          hasAlerts
            ? 'Overdue / due-today reminders and pending call follow-ups'
            : 'No critical alerts for today'
        }
      />
      <CardContent>
        {!hasAlerts && (
          <Typography variant="body2" color="text.secondary">
            You're all caught up. No overdue reminders or pending follow-up calls.
          </Typography>
        )}

        {hasAlerts && (
          <Box>
            {/* Reminders section */}
            <Box mb={2}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <WarningIcon color="error" fontSize="small" />
                <Typography variant="subtitle2">Reminders</Typography>
                <Chip
                  size="small"
                  label={`${overdueReminders.length} overdue, ${todayReminders.length} today`}
                  color={overdueReminders.length ? 'error' : 'default'}
                />
              </Stack>

              {overdueReminders.slice(0, 3).map((rem) => (
                <Tooltip
                  key={rem._id}
                  title={rem.description || ''}
                  placement="top-start"
                  arrow
                >
                  <Box mb={0.5}>
                    <Typography variant="body2" color="error">
                      {format(new Date(rem.dueDate), 'MMM dd')} – {rem.title}{' '}
                      {rem.building?.name ? `@ ${rem.building.name}` : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}

              {todayReminders.slice(0, 3).map((rem) => (
                <Tooltip
                  key={rem._id}
                  title={rem.description || ''}
                  placement="top-start"
                  arrow
                >
                  <Box mb={0.5}>
                    <Typography variant="body2" color="warning.main">
                      Today – {rem.title}
                      {rem.building?.name ? ` @ ${rem.building.name}` : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}

              {overdueReminders.length + todayReminders.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No overdue or due-today reminders.
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Pending calls section */}
            <Box mt={1}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <CallIcon color={pendingCalls.length ? 'primary' : 'disabled'} fontSize="small" />
                <Typography variant="subtitle2">Pending Call Follow-Ups</Typography>
                <Chip
                  size="small"
                  label={`${pendingCalls.length} due`}
                  color={pendingCalls.length ? 'primary' : 'default'}
                />
              </Stack>

              {pendingCalls.slice(0, 3).map((c) => (
                <Tooltip
                  key={c._id}
                  title={c.nextAction?.note || c.notes || ''}
                  placement="top-start"
                  arrow
                >
                  <Box mb={0.5}>
                    <Typography variant="body2">
                      {c.isProspect
                        ? c.prospect?.companyName || 'Prospect'
                        : c.building?.name || 'Building'}
                      {c.nextAction?.date &&
                        ` – follow-up ${format(new Date(c.nextAction.date), 'MMM dd')}`}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}

              {pendingCalls.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No pending follow-up calls due up to today.
                </Typography>
              )}
            </Box>

            {(overdueReminders.length + todayReminders.length + upcomingReminders.length > 3 ||
              pendingCalls.length > 3) && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                View full details in Reminders and Calls pages.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardAlerts;
