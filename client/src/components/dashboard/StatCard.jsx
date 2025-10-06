import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const StatCard = ({ title, value, icon, color, subtitle, trend, trendColor, onClick }) => {
  const theme = useTheme();

  return (
    <Box
      onClick={onClick}
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        p: 3,
        height: '100%',
        boxShadow: theme.shadows[2],
        transition: 'transform 0.2s, box-shadow 0.2s, cursor 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: onClick ? 'translateY(-4px)' : 'none',
          boxShadow: onClick ? theme.shadows[4] : theme.shadows[2],
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: theme.palette.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            backgroundColor: `${color}15`,
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            lineHeight: 1.2,
            mb: 0.5,
          }}
        >
          {value}
        </Typography>

        {(subtitle || trend) && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend && (
              <Typography
                variant="caption"
                sx={{
                  color: trendColor || theme.palette.success.main,
                  display: 'flex',
                  alignItems: 'center',
                  mr: 1,
                  fontWeight: 600,
                }}
              >
                {trend}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StatCard;
