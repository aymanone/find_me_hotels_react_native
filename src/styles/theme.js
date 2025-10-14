// theme.js - Complete Design System for Travel App with Responsive Support
// Import this file across all your screens for consistent styling

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Screen size breakpoints
export const breakpoints = {
  xs: 320,   // Very small phones
  sm: 350,   // Small phones (iPhone SE, etc) 375 old
  md: 414,   // Medium phones (iPhone 11, etc)
  lg: 768,   // Tablets
  xl: 1024,  // Large tablets / small desktops
};

// Screen size helpers
export const screenSize = {
  width,
  height,
  isXSmall: width < breakpoints.sm,
  isSmall: width >= breakpoints.sm && width < breakpoints.md,
  isMedium: width >= breakpoints.md && width < breakpoints.lg,
  isLarge: width >= breakpoints.lg && width < breakpoints.xl,
  isXLarge: width >= breakpoints.xl,
  isMobile: width < breakpoints.lg,
  isTablet: width >= breakpoints.lg && width < breakpoints.xl,
  isDesktop: width >= breakpoints.xl,
};

// Responsive value helper function
export const responsive = (xs, sm, md, lg, xl) => {
  if (width < breakpoints.sm) return xs;
  if (width < breakpoints.md) return sm || xs;
  if (width < breakpoints.lg) return md || sm || xs;
  if (width < breakpoints.xl) return lg || md || sm || xs;
  return xl || lg || md || sm || xs;
};

export const theme = {
  // Color Palette - Professional & Easy on Eyes
  colors: {

    // Danger zone colors
     dangerCard: '#dc3545',
     dangerTitle: '#dc3545',
     dangerText: '#555555',
    // Label colors
    labelText: '#555555',
    // Status colors for offers
   statusViewed: '#17a2b8',      // blue for viewed status
   statusNotViewed: '#ffc107',   // yellow for not viewed status

  // Outdated/disabled colors
  outdated: '#6c757d',          // gray for outdated items
  outdatedBackground: '#f8f9fa', // light gray background
  outdatedBorder: '#dee2e6',    // light gray border
  outdatedText: '#999999',      // gray text for outdated items
  //primary colors
    primary: '#2089dc',           // Calm blue for main actions
    primaryDark: '#1a6fb8',       // Darker blue for pressed states
    primaryLight: '#e3f2fd',      // Light blue for backgrounds
    
    // Secondary Colors
    secondary: '#28a745',         // Success green
    secondaryDark: '#218838',     // Darker green
    secondaryLight: '#d4edda',    // Light green background
    
    // Accent Colors
    accent: '#ffc107',            // Warning/highlight yellow
    accentDark: '#e0a800',
    accentLight: '#fff3cd',
    
    // Status Colors
    error: '#dc3545',             // Error red
    errorLight: '#f8d7da',
    success: '#28a745',
    successLight: '#d4edda',
    warning: '#FFA500',           // Orange for status indicators
    warningLight: '#fff3cd',
    info: '#17a2b8',
    infoLight: '#d1ecf1',
    
    // Neutral Colors - Easy on eyes
    background: '#f8f9fa',        // Main background (soft gray)
    backgroundWhite: '#ffffff',   // Card/form background
    backgroundGray: '#f5f5f5',    // Alternative background
    
    // Text Colors
    text: '#212529',              // Primary text (dark gray, not pure black)
    textSecondary: '#6c757d',     // Secondary text
    textLight: '#adb5bd',         // Light text/placeholders
    textWhite: '#ffffff',         // White text on dark backgrounds
    
    // Border Colors
    border: '#dee2e6',            // Default border
    borderLight: '#e9ecef',       // Light border
    borderDark: '#ced4da',        // Darker border for focus
    
    // Disabled States
    disabled: '#e9ecef',
    disabledText: '#adb5bd',
    // notifications
    notification: '#FF9500',        // Orange for notification badges
    notificationLight: '#FFF5E6',   // Light orange background
    // Warning container colors
    warningContainer: '#FFF3CD',
    warningBorder: '#FFEEBA',
    warningIcon: '#856404',
    warningTitle: '#856404',
    // Status indicator colors
    statusActive: '#4CAF50',
    statusInactive: '#F44336',
  },
  
  // Typography
  typography: {
    pickerLabel: {
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 5,
  color: '#212529',
},
confirmTitle: {
  fontSize: 20,
  fontWeight: '700',
  marginBottom: 15,
  textAlign: 'center',
  color: '#212529',
},
confirmMessage: {
  fontSize: 16,
  color: '#333',
  marginBottom: 20,
  textAlign: 'center',
},
    dangerTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#dc3545',
  marginBottom: 15,
},
overlayTitle: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 15,
  textAlign: 'center',
  color: '#212529',
},
overlayText: {
  fontSize: 16,
  marginBottom: 20,
  textAlign: 'center',
  color: '#212529',
},
    warningTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#856404',
  marginBottom: 10,
},
warningText: {
  fontSize: 16,
  color: '#856404',
  textAlign: 'center',
  lineHeight: 24,
},
warningIcon: {
  fontSize: 48,
  marginBottom: 10,
},
    statValue: {
  fontSize: 24,
  fontWeight: '700',
  color: '#333',
},
statLabel: {
  fontSize: 16,
  fontWeight: '400',
  color: '#555',
},
    // Font Sizes
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
    },
    
    // Font Weights
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // Line Heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    
    // Pre-built Text Styles
    h1: {
      fontSize: 28,
      fontWeight: '700',
      color: '#212529',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      color: '#212529',
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      color: '#212529',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      color: '#212529',
      lineHeight: 1.3,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: '#212529',
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      color: '#6c757d',
      lineHeight: 1.5,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: '#495057',
      marginBottom: 8,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      color: '#6c757d',
      lineHeight: 1.4,
    },
  },
  
  // Spacing System (multiples of 4)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  },
  
  // Responsive spacing (smaller on small screens)
  responsiveSpacing: {
    xs: responsive(2, 4, 4, 4, 4),
    sm: responsive(4, 8, 8, 8, 8),
    md: responsive(8, 12, 12, 12, 12),
    lg: responsive(12, 16, 16, 16, 16),
    xl: responsive(16, 20, 20, 20, 20),
    xxl: responsive(20, 24, 24, 24, 24),
    xxxl: responsive(24, 32, 32, 32, 32),
  },
  
  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },
  
  // Shadows (for elevation)
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
  },
  
  // Component-specific sizes
  components: {
    confirmOverlay: {
  borderRadius: 10,
  padding: 20,
  widthPercentage: 0.9,
},
    statusIndicator: {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginRight: 8,
},
    warningBox: {
  borderRadius: 8,
  padding: 20,
  borderWidth: 1,
},
    overlay: {
  borderRadius: 10,
  padding: 20,
  widthPercentage: 0.8,
},
statItem: {
  widthPercentage: 0.33,
},
    statusBadge: {
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 15,
  fontSize: 12,
  fontWeight: '700',
},
    badge: {
  padding: 2,
  fontSize: 14,
  fontWeight: '700',
},
    input: {
      height: 50,
      fontSize: 16,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    button: {
      height: 45,
      borderRadius: 8,
      paddingHorizontal: 20,
    },
    card: {
      borderRadius: 8,
      padding: 16,
    },
    tag: {
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
  },
  
  // Responsive typography (smaller on small screens)
  responsiveTypography: {
    fontSize: {
      xs: responsive(10, 12, 12, 12, 12),
      sm: responsive(12, 14, 14, 14, 14),
      md: responsive(14, 16, 16, 16, 16),
      lg: responsive(16, 18, 18, 18, 18),
      xl: responsive(18, 20, 20, 20, 20),
      xxl: responsive(20, 24, 24, 24, 24),
      xxxl: responsive(24, 28, 28, 28, 28),
    },
    pickerLabel: {
  fontSize: responsive(14, 16, 16, 16, 16),
  fontWeight: '700',
  marginBottom: responsive(4, 5, 5, 5, 5),
  color: '#212529',
},
confirmTitle: {
  fontSize: responsive(18, 20, 20, 22, 22),
  fontWeight: '700',
  marginBottom: responsive(12, 15, 15, 15, 15),
  textAlign: 'center',
  color: '#212529',
},
confirmMessage: {
  fontSize: responsive(14, 16, 16, 16, 16),
  color: '#333',
  marginBottom: responsive(16, 20, 20, 20, 20),
  textAlign: 'center',
},
    dangerTitle: {
  fontSize: responsive(16, 18, 18, 20, 20),
  fontWeight: '700',
  color: '#dc3545',
  marginBottom: responsive(12, 15, 15, 15, 15),
},
overlayTitle: {
  fontSize: responsive(16, 18, 18, 20, 20),
  fontWeight: '700',
  marginBottom: responsive(12, 15, 15, 15, 15),
  textAlign: 'center',
  color: '#212529',
},
overlayText: {
  fontSize: responsive(14, 16, 16, 16, 16),
  marginBottom: responsive(16, 20, 20, 20, 20),
  textAlign: 'center',
  color: '#212529',
},
    // Responsive text styles
    h1: {
      fontSize: responsive(24, 28, 28, 32, 32),
      fontWeight: '700',
      color: '#212529',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: responsive(20, 24, 24, 26, 26),
      fontWeight: '600',
      color: '#212529',
      lineHeight: 1.2,
    },
    h3: {
      fontSize: responsive(18, 20, 20, 22, 22),
      fontWeight: '600',
      color: '#212529',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: responsive(16, 18, 18, 20, 20),
      fontWeight: '600',
      color: '#212529',
      lineHeight: 1.3,
    },
    body: {
      fontSize: responsive(14, 16, 16, 16, 16),
      fontWeight: '400',
      color: '#212529',
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: responsive(12, 14, 14, 14, 14),
      fontWeight: '400',
      color: '#6c757d',
      lineHeight: 1.5,
    },
    label: {
      fontSize: responsive(12, 14, 14, 14, 14),
      fontWeight: '500',
      color: '#495057',
      marginBottom: responsive(6, 8, 8, 8, 8),
    },
    statValue: {
  fontSize: responsive(20, 24, 24, 24, 24),
  fontWeight: '700',
  color: '#333',
},
statLabel: {
  fontSize: responsive(14, 16, 16, 16, 16),
  fontWeight: '400',
  color: '#555',
},
warningTitle: {
  fontSize: responsive(18, 20, 20, 22, 22),
  fontWeight: '700',
  color: '#856404',
  marginBottom: responsive(8, 10, 10, 10, 10),
},
warningText: {
  fontSize: responsive(14, 16, 16, 16, 16),
  color: '#856404',
  textAlign: 'center',
  lineHeight: responsive(20, 24, 24, 24, 24),
},
warningIcon: {
  fontSize: responsive(40, 48, 48, 48, 48),
  marginBottom: responsive(8, 10, 10, 10, 10),
},
  },
  
  // Responsive component sizes
  responsiveComponents: {
    confirmOverlay: {
  borderRadius: responsive(8, 10, 10, 10, 10),
  padding: responsive(16, 20, 20, 20, 20),
  widthPercentage: 0.9,
},
    statusIndicator: {
  width: responsive(10, 12, 12, 12, 12),
  height: responsive(10, 12, 12, 12, 12),
  borderRadius: 6,
  marginRight: responsive(6, 8, 8, 8, 8),
},
    warningBox: {
  borderRadius: responsive(6, 8, 8, 8, 8),
  padding: responsive(16, 20, 20, 20, 20),
  borderWidth: 1,
},
    overlay: {
  borderRadius: responsive(8, 10, 10, 10, 10),
  padding: responsive(16, 20, 20, 20, 20),
  widthPercentage: 0.8,
},
statItem: {
  minWidth: responsive(80, 100, 100, 100, 100),
  marginHorizontal: responsive(4, 8, 8, 8, 8),
  marginVertical: responsive(8, 10, 10, 10, 10),
},
    statusBadge: {
  paddingHorizontal: responsive(8, 10, 10, 10, 10),
  paddingVertical: responsive(4, 5, 5, 5, 5),
  borderRadius: 15,
  fontSize: responsive(11, 12, 12, 12, 12),
  fontWeight: '700',
},
    badge: {
  padding: 2,
  fontSize: responsive(12, 14, 14, 14, 14),
  fontWeight: '700',
},
    input: {
      height: responsive(44, 50, 50, 50, 50),
      fontSize: responsive(14, 16, 16, 16, 16),
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: responsive(10, 12, 12, 12, 12),
    },
    button: {
      height: responsive(40, 45, 45, 45, 45),
      borderRadius: 8,
      paddingHorizontal: responsive(16, 20, 20, 20, 20),
    },
    card: {
      borderRadius: 8,
      padding: responsive(12, 16, 16, 16, 16),
    },
    tag: {
      borderRadius: 16,
      paddingVertical: responsive(4, 6, 6, 6, 6),
      paddingHorizontal: responsive(10, 12, 12, 12, 12),
    },
    icon: {
      small: responsive(12, 14, 16, 16, 16),
      medium: responsive(16, 18, 20, 20, 20),
      large: responsive(20, 24, 28, 28, 28),
    },
  },
};

// Common Styles - Ready-to-use component styles
export const commonStyles = {



  absoluteTopRight: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.xl,
    zIndex: 1,
  },

  responsiveAbsoluteTopRight: {
    position: 'absolute',
    top: responsive(10, 15, 15, 15, 15),
    right: responsive(15, 20, 20, 20, 20),
    zIndex: 1,
  },

  // Hint text (for helper text under inputs)
  hintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },

  responsiveHintText: {
    fontSize: theme.responsiveTypography.fontSize.xs,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.sm,
    marginBottom: responsive(12, 15, 15, 15, 15),
  },

  // Form container
  form: {
    flex: 1,
  },

  // Dropdown item (for custom dropdown rendering)
  dropdownItemContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  dropdownItemText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },

  // Info row for displaying labeled data
  infoRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },

  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },

  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    flex: 1,
    color: theme.colors.text,
  },

  // Responsive versions
  responsiveInfoRow: {
    flexDirection: 'row',
    marginBottom: responsive(8, 10, 10, 10, 10),
    alignItems: 'flex-start',
  },

  responsiveInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: responsive(90, 100, 100, 110, 110),
  },

  // Collapsible section header (for ClientOfferDetailsScreen)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },

  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },

  sectionContent: {
    marginTop: theme.spacing.sm,
  },

  // Responsive versions
  responsiveSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive(8, 10, 10, 10, 10),
  },

  responsiveSectionTitle: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },

  // Info display with columns (for multi-column layouts)
  infoColumn: {
    flex: 1,
  },

  fullWidth: {
    flex: 2,
  },

  // Detail row (for list items with icons)
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },

  detailText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
  },

  detailLabel: {
    fontWeight: theme.typography.fontWeight.bold,
  },

  // Link text
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
    fontSize: theme.typography.fontSize.md,
  },

  // Contact hint (for messaging app hints)
  contactButtonContent: {
    flexDirection: 'column',
  },

  contactHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },

  contactHintText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing.xs,
    fontStyle: 'italic',
  },

// Hint text (for helper text under inputs)
hintText: {
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.textLight,
  marginLeft: theme.spacing.sm,
  marginBottom: theme.spacing.lg,
},

responsiveHintText: {
  fontSize: theme.responsiveTypography.fontSize.xs,
  color: theme.colors.textLight,
  marginLeft: theme.spacing.sm,
  marginBottom: responsive(12, 15, 15, 15, 15),
},

// Form container
form: {
  flex: 1,
},

// Dropdown item (for custom dropdown rendering)
dropdownItemContainer: {
  padding: theme.spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.borderLight,
},

dropdownItemText: {
  fontSize: theme.typography.fontSize.md,
  color: theme.colors.text,
},
// Absolute positioned container (useful for overlays, language selectors, etc.)
absoluteTopRight: {
  position: 'absolute',
  top: theme.spacing.lg,
  right: theme.spacing.xl,
  zIndex: 1,
},

responsiveAbsoluteTopRight: {
  position: 'absolute',
  top: responsive(10, 15, 15, 15, 15),
  right: responsive(15, 20, 20, 20, 20),
  zIndex: 1,
},
// Info row for displaying labeled data
infoRow: {
  flexDirection: 'row',
  marginBottom: theme.spacing.sm,
  alignItems: 'flex-start',
},

infoItem: {
  flexDirection: 'row',
  alignItems: 'center',
  width: 100,
},

infoLabel: {
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  marginLeft: theme.spacing.xs,
},

infoValue: {
  fontSize: theme.typography.fontSize.sm,
  flex: 1,
  color: theme.colors.text,
},

// Responsive versions
responsiveInfoRow: {
  flexDirection: 'row',
  marginBottom: responsive(8, 10, 10, 10, 10),
  alignItems: 'flex-start',
},

responsiveInfoItem: {
  flexDirection: 'row',
  alignItems: 'center',
  width: responsive(90, 100, 100, 110, 110),
},
  // Containers
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  
  scrollContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: 50,
  },
  
  // Responsive container
  responsiveContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: responsive(12, 16, 16, 20, 24),
  },
  
  // Cards
  card: {
    backgroundColor: theme.colors.backgroundWhite,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  
  cardElevated: {
    backgroundColor: theme.colors.backgroundWhite,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.lg,
  },
  
  // Responsive card
  responsiveCard: {
    backgroundColor: theme.colors.backgroundWhite,
    borderRadius: theme.borderRadius.md,
    padding: responsive(12, 16, 16, 20, 20),
    marginBottom: responsive(10, 12, 12, 16, 16),
    ...theme.shadows.md,
  },
  
  // Form Layouts
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  
  // Responsive row (stacks on very small screens)
  responsiveRow: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: responsive(12, 16, 16, 16, 16),
    gap: responsive(8, 12, 12, 12, 12),
  },
  
  halfWidth: {
    flex: 1,
    minWidth: '45%',
  },
  
  fullWidth: {
    width: '100%',
    flex:2,
  },
  
  // Text Styles
  title: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  
  sectionTitle: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionContent: {
    marginTop: theme.spacing.sm,
  },

  // Responsive versions
  responsiveSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive(8, 10, 10, 10, 10),
  },
   responsiveSectionTitle: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  
  label: {
    ...theme.typography.label,
  },
  
  // Responsive text
  responsiveText: {
    fontSize: responsive(14, 16, 16, 16, 16),
    color: theme.colors.text,
    lineHeight: 1.5,
  },
  
  // Responsive label
  responsiveLabel: {
    fontSize: responsive(12, 14, 14, 14, 14),
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: responsive(6, 8, 8, 8, 8),
  },
  
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  infoColumn: {
    flex: 1,
  },
  
  // Dropdown (for react-native-element-dropdown)
  dropdown: {
    height: theme.components.input.height,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundWhite,
    marginBottom: theme.spacing.lg,
  },
  
  dropdownDisabled: {
    backgroundColor: theme.colors.disabled,
    borderColor: theme.colors.borderLight,
    opacity: 0.6,
  },
  
  placeholderStyle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textLight,
  },
  
  selectedTextStyle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  
  // Input (for react-native-elements Input)
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  
  inputContainerStyle: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xs,
  },
  
  inputStyle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.sm,
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  
  // Responsive button
  responsiveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: responsive(10, 12, 12, 14, 14),
    paddingHorizontal: responsive(16, 20, 20, 24, 24),
    ...theme.shadows.sm,
  },
  
  buttonText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  
  outlineButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  
  // Tags/Badges
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  
  tagSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  
  tagText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.fontSize.sm,
    marginRight: theme.spacing.xs,
  },
  
  removeTagButton: {
    backgroundColor: theme.colors.error,
    padding: 2,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.xs,
  },
  
  // Data Display (for lists)
  dataRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  
  dataLabel: {
    fontWeight: theme.typography.fontWeight.semibold,
    width: 100,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  
  dataValue: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  
  // Checkbox (for react-native-elements)
  checkbox: {
    margin: theme.spacing.xs,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: theme.spacing.sm,
  },
  
  // Empty States
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.huge,
  },
  
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.lg,
  },
  
  // Status Indicators
  statusBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  
  statusSuccess: {
    backgroundColor: theme.colors.successLight,
  },
  
  statusWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  
  statusError: {
    backgroundColor: theme.colors.errorLight,
  },
  
  statusInfo: {
    backgroundColor: theme.colors.infoLight,
  },
  
  // Offer Card (for ClientTravelRequestDetailsScreen)
  offerCard: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    padding: 0,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  
  // Action Button (for ClientTravelRequestDetailsScreen)
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
  },
};

// Export default for easy import
export default { theme, commonStyles, screenSize, responsive, breakpoints };