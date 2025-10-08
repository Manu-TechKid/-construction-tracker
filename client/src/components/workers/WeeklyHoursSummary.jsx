import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Schedule as TimeIcon,
  TrendingUp as TrendingIcon,
  CalendarToday as CalendarIcon,
  AccessTime as ClockIcon,
  Business as BuildingIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useGetTimeSessionsQuery, useGetTimeStatsQuery } from '../../features/timeTracking/timeTrackingApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const WeeklyHoursSummary = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  // State for date range
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }), // Monday start
      end: endOfWeek(now, { weekStartsOn: 1 })
    };
  });

  // API calls
  const { data: sessionsData, isLoading: sessionsLoading } = useGetTimeSessionsQuery({
    workerId: user?.id,
    startDate: selectedWeek.start.toISOString(),
    endDate: selectedWeek.end.toISOString()
  });

  const { data: statsData, isLoading: statsLoading } = useGetTimeStatsQuery({
    workerId: user?.id,
    startDate: selectedWeek.start.toISOString(),
    endDate: selectedWeek.end.toISOString()
  });

  const { data: buildingsData } = useGetBuildingsQuery();

  const sessions = sessionsData?.data?.sessions || [];
  const stats = statsData?.data?.stats || {};
  const buildings = buildingsData?.data?.buildings || [];

  // Calculate daily hours
  const dailyHours = useMemo(() => {
    const days = eachDayOfInterval({ start: selectedWeek.start, end: selectedWeek.end });

    return days.map(day => {
      const daySessions = sessions.filter(session => {
        const sessionDate = parseISO(session.clockInTime);
        return format(sessionDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      const totalHours = daySessions.reduce((sum, session) => sum + (session.totalHours || 0), 0);

      return {
        date: day,
        sessions: daySessions,
        totalHours,
        isToday: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      };
    });
  }, [sessions, selectedWeek]);

  // Calculate weekly summary
  const weeklySummary = useMemo(() => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalHours = completedSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const totalBreakTime = completedSessions.reduce((sum, s) => sum + (s.breakTime || 0), 0);

    return {
      totalHours,
      totalBreakTime,
      sessionsCount: completedSessions.length,
      averageHoursPerDay: dailyHours.length > 0 ? totalHours / dailyHours.length : 0,
      mostWorkedDay: dailyHours.reduce((max, day) =>
        day.totalHours > max.totalHours ? day : max, dailyHours[0] || { totalHours: 0 }
      )
    };
  }, [sessions, dailyHours]);

  const handleWeekChange = (direction) => {
    const newWeek = direction === 'next'
      ? { start: new Date(selectedWeek.start.getTime() + 7 * 24 * 60 * 60 * 1000), end: new Date(selectedWeek.end.getTime() + 7 * 24 * 60 * 60 * 1000) }
      : { start: new Date(selectedWeek.start.getTime() - 7 * 24 * 60 * 60 * 1000), end: new Date(selectedWeek.end.getTime() - 7 * 24 * 60 * 60 * 1000) };

    setSelectedWeek(newWeek);
  };

  const exportWeeklyReport = () => {
    const reportData = dailyHours.map(day => ({
      Date: format(day.date, 'EEEE, MMMM d, yyyy'),
      'Total Hours': day.totalHours.toFixed(2),
      'Sessions': day.sessions.length,
      'Buildings': day.sessions.map(s => s.building?.name || 'N/A').join(', ')
    }));

    const csv = [
      'Date,Total Hours,Sessions,Buildings',
      ...reportData.map(row => `${row.Date},${row['Total Hours']},${row.Sessions},"${row.Buildings}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-hours-${format(selectedWeek.start, 'yyyy-MM-dd')}-to-${format(selectedWeek.end, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (sessionsLoading || statsLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h1">
              Weekly Hours Summary
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleWeekChange('prev')}
              >
                Previous Week
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleWeekChange('next')}
              >
                Next Week
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={exportWeeklyReport}
              >
                Export
              </Button>
            </Box>
          </Box>

          <Typography variant="body1" color="text.secondary">
            Week of {format(selectedWeek.start, 'MMMM d')} - {format(selectedWeek.end, 'MMMM d, yyyy')}
          </Typography>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ClockIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {weeklySummary.totalHours.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TimeIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {weeklySummary.sessionsCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sessions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {weeklySummary.averageHoursPerDay.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg/Day
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <BuildingIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {weeklySummary.mostWorkedDay?.totalHours?.toFixed(1) || 0}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Best Day
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Breakdown */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Daily Breakdown
          </Typography>

          {dailyHours.length === 0 ? (
            <Alert severity="info">
              No time sessions found for this week. Start tracking your time to see your hours here!
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Sessions</TableCell>
                    <TableCell align="center">Hours</TableCell>
                    <TableCell>Buildings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyHours.map((day) => (
                    <TableRow key={format(day.date, 'yyyy-MM-dd')} sx={{
                      backgroundColor: day.isToday ? theme.palette.primary.main + '10' : 'inherit'
                    }}>
                      <TableCell>
                        <Typography variant={day.isToday ? "subtitle1" : "body1"}>
                          {format(day.date, 'EEEE')}
                          {day.isToday && (
                            <Chip label="Today" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {format(day.date, 'MMM d')}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={day.sessions.length}
                          size="small"
                          color={day.sessions.length > 0 ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant={day.totalHours > 0 ? "subtitle1" : "body2"} color={day.totalHours > 0 ? "primary" : "text.secondary"}>
                          {day.totalHours > 0 ? `${day.totalHours.toFixed(1)}h` : '0h'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {day.sessions.length > 0 ? (
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {Array.from(new Set(day.sessions.map(s => s.building?.name))).map((buildingName, index) => (
                              <Chip
                                key={index}
                                label={buildingName}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No work</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions Summary */}
      {sessions.length > 0 && (
        <Card elevation={2} sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Sessions
            </Typography>
            <Grid container spacing={2}>
              {sessions.slice(0, 3).map((session) => (
                <Grid item xs={12} sm={4} key={session._id}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {format(parseISO(session.clockInTime), 'MMM d, yyyy')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {session.building?.name || 'No building'}
                    </Typography>
                    <Typography variant="body1" color="primary">
                      {session.totalHours?.toFixed(1) || 0}h worked
                    </Typography>
                    <Chip
                      label={session.status}
                      size="small"
                      color={session.status === 'completed' ? 'success' : 'warning'}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default WeeklyHoursSummary;
