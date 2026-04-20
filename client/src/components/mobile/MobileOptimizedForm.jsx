import React from 'react';
import {
  Grid,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';

/**
 * MobileOptimizedForm - Responsive form layout
 * Stacks fields vertically on mobile, uses grid on desktop
 */
const MobileOptimizedForm = ({
  children,
  spacing = 2,
  mobileSpacing = 2,
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (isMobile) {
    return (
      <Box 
        component="form" 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: mobileSpacing,
          width: '100%',
          ...sx 
        }}
      >
        {children}
      </Box>
    );
  }
  
  // Desktop: Use Grid
  return (
    <Grid container spacing={spacing} sx={sx}>
      {children}
    </Grid>
  );
};

/**
 * MobileFormField - A form field that takes full width on mobile
 */
export const MobileFormField = ({
  children,
  xs = 12,
  sm = 6,
  md = 4,
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (isMobile) {
    return (
      <Box sx={{ width: '100%', ...sx }}>
        {children}
      </Box>
    );
  }
  
  return (
    <Grid item xs={xs} sm={sm} md={md} sx={sx}>
      {children}
    </Grid>
  );
};

/**
 * MobileFormSection - Section title and divider for mobile forms
 */
export const MobileFormSection = ({ title, children, sx = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Box sx={{ mb: isMobile ? 2 : 3, ...sx }}>
      {title && (
        <Typography 
          variant={isMobile ? "subtitle1" : "h6"} 
          fontWeight="bold" 
          sx={{ mb: isMobile ? 1.5 : 2 }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

export default MobileOptimizedForm;
