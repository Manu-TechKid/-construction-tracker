import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Slide,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

// Slide transition for mobile full-screen dialogs
const SlideTransition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * MobileOptimizedDialog - Full-screen on mobile, normal dialog on desktop
 */
const MobileOptimizedDialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
  fullWidth = true,
  showBackButton = false,
  onBack,
  hideCloseButton = false,
  sx = {},
  contentSx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Mobile: Full-screen with AppBar
  if (isMobile) {
    return (
      <Dialog
        fullScreen
        open={open}
        onClose={onClose}
        TransitionComponent={SlideTransition}
        sx={sx}
      >
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar variant="dense">
            {showBackButton ? (
              <IconButton edge="start" onClick={onBack || onClose}>
                <ArrowBackIcon />
              </IconButton>
            ) : !hideCloseButton && (
              <IconButton edge="start" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ ml: 2, flex: 1 }} noWrap>
              {title}
            </Typography>
            {actions && (
              <Box sx={{ ml: 1 }}>
                {actions}
              </Box>
            )}
          </Toolbar>
        </AppBar>
        
        <DialogContent 
          sx={{ 
            p: 2, 
            pt: 2,
            pb: !actions ? 2 : 0,
            ...contentSx 
          }}
        >
          {children}
        </DialogContent>
        
        {!actions && null}
      </Dialog>
    );
  }
  
  // Desktop: Normal dialog
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      sx={sx}
    >
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={contentSx}>
        {children}
      </DialogContent>
      
      {actions && (
        <DialogActions>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default MobileOptimizedDialog;
