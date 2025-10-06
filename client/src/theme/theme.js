import { createTheme } from '@mui/material/styles';

// Common theme settings
const commonTheme = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiModal: {
      defaultProps: {
        disableAutoFocus: true,
        disableEnforceFocus: true,
        disableEscapeKeyDown: true,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          minHeight: 36,
          '@media (max-width: 768px)': {
            minHeight: 44,
            padding: '12px 20px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            minWidth: 48,
            minHeight: 48,
            padding: 12,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          '@media (max-width: 768px)': {
            minWidth: 200,
            '& .MuiMenuItem-root': {
              minHeight: 48,
              padding: '12px 16px',
              fontSize: '1rem',
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            minHeight: 48,
            padding: '12px 16px',
            fontSize: '1rem',
          },
        },
      },
    },
    // Time Picker specific fixes
    MuiClock: {
      styleOverrides: {
        root: {
          display: 'flex !important',
          '@media (max-width: 768px)': {
            width: '100%',
            maxWidth: 280,
          },
        },
      },
    },
    MuiClockPointer: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
            },
          },
        },
      },
    },
    MuiPickersLayout: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            '& .MuiPickersLayout-contentWrapper': {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            },
          },
        },
      },
    },
    MuiDateCalendar: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            width: '100%',
            maxWidth: 320,
          },
        },
      },
    },
    // Table responsiveness
    MuiTable: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            '& .MuiTableCell-root': {
              padding: '8px 4px',
              fontSize: '0.875rem',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            padding: '8px 4px',
            fontSize: '0.875rem',
            '&:first-of-type': {
              paddingLeft: 8,
            },
            '&:last-of-type': {
              paddingRight: 8,
            },
          },
        },
      },
    },
  },
};

// Light theme
const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#ffffff',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
});

// Dark theme
const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    secondary: {
      main: '#ce93d8',
      light: '#f3e5f5',
      dark: '#ab47bc',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffa726',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: '#29b6f6',
      light: '#4fc3f7',
      dark: '#0288d1',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    success: {
      main: '#66bb6a',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
});

// Function to create app theme based on mode
export const createAppTheme = (mode = 'light') => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export { lightTheme, darkTheme };
