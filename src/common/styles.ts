import chalk from 'chalk';

// Force colors for consistent output in tests
chalk.level = 3;

/**
 * Simplified style system for AIT³ commands
 * Uses semantic 5-color system for consistency and maintainability
 */
export const STYLES = {
  // Semantic 5-color system
  success: chalk.green,    // Success operations (created, completed, passed)
  info: chalk.blue,        // Information display (paths, IDs, stats)
  warning: chalk.yellow,   // Warnings and notices (manual steps needed)
  danger: chalk.red,       // Errors and failures (validation errors, exceptions)
  muted: chalk.gray,       // Muted text (commands, hints, secondary info)
  
  // Minimal decorations
  bold: chalk.bold,        // Emphasis (titles, headers)
  code: chalk.gray         // Code and commands (same as muted for consistency)
} as const;

export type StylesType = typeof STYLES;

/**
 * Helper function to migrate from old FLOW_STYLES to new STYLES
 * Maps old style names to new semantic names
 */
export function migrateStyle(oldStyle: string): keyof StylesType {
  const migrationMap: Record<string, keyof StylesType> = {
    // Direct mappings
    'success': 'success',
    'warning': 'warning',
    'info': 'info',
    
    // Error to danger
    'error': 'danger',
    
    // Git styles
    'gitSuccess': 'success',
    'gitWarning': 'warning',
    'gitInfo': 'info',
    'gitCommand': 'muted',
    
    // Content styles
    'dim': 'muted',
    'code': 'muted',
    'path': 'info',
    'count': 'info',
    'command': 'info',
    'option': 'info',
    
    // Bold styles
    'title': 'bold',
    'section': 'bold',
    
    // Feature/progress to success
    'feature': 'success',
    'progress': 'success',
    
    // Ticket styles - no styling
    'ticketId': 'code',  // Will return plain text
    'ticketTitle': 'code',
    'ticketStatus': 'code',
    'statusTransition': 'muted',
    
    // Default
    'text': 'code'
  };
  
  return migrationMap[oldStyle] || 'code';
}