export const COLORS = {
  // Primary brand colors
  primary: '#00E5FF',
  primaryDark: '#00B4D8',
  primaryLight: '#33E8FF',
  
  // Background colors
  background: '#0A0A0A',
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#2A2A2A',
  
  // Surface colors
  surface: '#1E1E1E',
  surfaceElevated: '#2D2D2D',
  surfaceHighlight: '#3A3A3A',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#808080',
  textDisabled: '#505050',
  
  // Accent colors
  accent: '#FF6B35',
  accentSecondary: '#FF9500',
  
  // Status colors
  success: '#00C896',
  warning: '#FFB800',
  error: '#FF5252',
  info: '#2196F3',
  
  // Special colors
  neon: '#39FF14',
  electric: '#7DF9FF',
  robotBlue: '#0066FF',
  
  // Border colors
  border: '#333333',
  borderLight: '#444444',
  borderActive: '#00E5FF',
  
  // Shadow colors
  shadow: 'rgba(0, 229, 255, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.8)',
};

export const TYPOGRAPHY = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    veryslow: 1000,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
};

export const LAYOUT = {
  screen: {
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    height: 60,
    paddingHorizontal: SPACING.md,
  },
  tabBar: {
    height: 80,
    paddingBottom: SPACING.sm,
  },
}; 