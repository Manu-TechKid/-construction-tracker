import { Box, useMediaQuery, useTheme } from '@mui/material';

/**
 * A responsive container component that adjusts padding and layout based on screen size
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {Object} props.sx - Additional MUI sx props to apply
 * @returns {JSX.Element} Responsive container
 */
const ResponsiveContainer = ({ children, sx = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  return (
    <Box
      sx={{
        padding: isMobile ? 1 : isTablet ? 2 : 3,
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;