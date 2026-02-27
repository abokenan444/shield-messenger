/**
 * Shield Messenger Color Palette
 * Matches the Android Kotlin app's Material 3 dark theme
 */

export const Colors = {
  // Primary brand colors
  primary: '#4FC3F7',        // Light blue accent
  primaryDark: '#0288D1',    // Darker blue
  primaryLight: '#B3E5FC',   // Light blue surface

  // Background hierarchy
  background: '#0A0A0A',     // True dark background
  surface: '#1A1A1A',        // Card/surface background
  surfaceVariant: '#2A2A2A', // Elevated surface
  surfaceHigh: '#333333',    // Highest elevation

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#707070',
  textOnPrimary: '#000000',

  // Status colors
  success: '#4CAF50',        // Green — connected, delivered
  warning: '#FF9800',        // Orange — connecting, pending
  error: '#F44336',          // Red — failed, disconnected
  info: '#2196F3',           // Blue — informational

  // Tor status colors
  torConnected: '#4CAF50',
  torConnecting: '#FF9800',
  torDisconnected: '#F44336',

  // Chat bubble colors
  bubbleOutgoing: '#1A3A4A', // Dark blue-tinted for sent messages
  bubbleIncoming: '#2A2A2A', // Dark gray for received messages
  bubbleTimestamp: '#808080',

  // Borders and dividers
  border: '#333333',
  divider: '#1F1F1F',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  scrim: 'rgba(0, 0, 0, 0.32)',

  // Destructive
  destructive: '#FF5252',
  destructiveBackground: '#2A1515',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  title: 28,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
