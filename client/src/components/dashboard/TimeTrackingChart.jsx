import { Box, Typography, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const TimeTrackingChart = ({ totalHours, geofenceViolations }) => {
  const theme = useTheme();
  
  // Calculate compliance percentage
  const complianceHours = Math.max(0, totalHours - geofenceViolations);
  const compliancePercentage = totalHours > 0 
    ? Math.round((complianceHours / totalHours) * 100) 
    : 100;
  
  const data = [
    { name: 'Compliant', value: complianceHours, color: theme.palette.success.main },
    { name: 'Violations', value: geofenceViolations, color: theme.palette.error.main }
  ].filter(item => item.value > 0);

  if (totalHours === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography variant="body1" color="text.secondary">
          No time tracking data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value} hours`, 'Time']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="h6" color="text.primary">
          {compliancePercentage}% Geofence Compliance
        </Typography>
      </Box>
    </Box>
  );
};

export default TimeTrackingChart;