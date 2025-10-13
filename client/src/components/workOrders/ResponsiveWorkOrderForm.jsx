import React from 'react';
import { 
  Box, 
  Grid, 
  useMediaQuery, 
  useTheme,
  Paper,
  Typography
} from '@mui/material';
import ResponsiveContainer from '../layout/ResponsiveContainer';

/**
 * A responsive wrapper for work order forms that adjusts layout based on screen size
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} props.title - Form title
 * @returns {JSX.Element} Responsive work order form container
 */
const ResponsiveWorkOrderForm = ({ children, title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <ResponsiveContainer>
      <Paper 
        elevation={2} 
        sx={{ 
          p: isMobile ? 2 : 3,
          mb: 3
        }}
      >
        {title && (
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            gutterBottom
            sx={{ mb: 3 }}
          >
            {title}
          </Typography>
        )}
        
        <Box component="form" sx={{ width: '100%' }}>
          <Grid container spacing={isMobile ? 2 : 3}>
            {children}
          </Grid>
        </Box>
      </Paper>
    </ResponsiveContainer>
  );
};

export default ResponsiveWorkOrderForm;