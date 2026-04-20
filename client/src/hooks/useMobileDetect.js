import { useState, useEffect, useCallback } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

// Environment detection
const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         (window.Capacitor || 
          (window.androidBridge || window.webkit?.messageHandlers));
};

const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for Capacitor
  if (window.Capacitor?.isNativePlatform?.()) {
    return true;
  }
  
  // Check for mobile user agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android|ios|iphone|ipad|ipod/i.test(userAgent);
};

const isAndroid = () => {
  return typeof window !== 'undefined' && 
         /android/i.test(navigator.userAgent);
};

const isIOS = () => {
  return typeof window !== 'undefined' && 
         /ios|iphone|ipad|ipod/i.test(navigator.userAgent);
};

// Hook for mobile detection
export const useMobileDetect = () => {
  const theme = useTheme();
  
  // Media queries
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  // Platform detection
  const [platform, setPlatform] = useState({
    isCapacitor: false,
    isNative: false,
    isAndroid: false,
    isIOS: false,
    isWeb: true
  });
  
  useEffect(() => {
    setPlatform({
      isCapacitor: isCapacitor(),
      isNative: isNativePlatform(),
      isAndroid: isAndroid(),
      isIOS: isIOS(),
      isWeb: !isNativePlatform() && !isCapacitor()
    });
  }, []);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    ...platform,
    isTouch: isMobile || isTablet || platform.isNative
  };
};

// Hook for responsive values
export const useResponsiveValue = (mobileValue, desktopValue) => {
  const { isMobile } = useMobileDetect();
  return isMobile ? mobileValue : desktopValue;
};

// Hook for conditional rendering
export const useConditionalRender = () => {
  const { isMobile, isDesktop, isNative } = useMobileDetect();
  
  return useCallback(({
    mobile,
    desktop,
    native,
    web,
    all
  }) => {
    if (all) return all;
    if (isNative && native) return native;
    if (!isNative && web) return web;
    if (isMobile && mobile) return mobile;
    if (isDesktop && desktop) return desktop;
    return null;
  }, [isMobile, isDesktop, isNative]);
};

export default useMobileDetect;
