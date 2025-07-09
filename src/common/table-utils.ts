import { STYLES } from './styles.js';

/**
 * Utility functions for formatting table output in CLI commands
 */

export function padString(str: string, length: number): string {
  return str.padEnd(length);
}

export function truncateString(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

export function getStatusColor(status: string): (text: string) => string {
  switch (status) {
  case 'todo':
    return STYLES.info;
  case 'doing':
    return STYLES.warning;
  case 'done':
    return STYLES.success;
  default:
    return (text: string) => text; // No styling
  }
}

export function getPriorityColor(priority: string): (text: string) => string {
  switch (priority) {
  case 'critical':
    return (text: string) => STYLES.bold(STYLES.danger(text));
  case 'high':
    return STYLES.danger;
  case 'medium':
    return STYLES.warning;
  case 'low':
    return STYLES.muted;
  default:
    return (text: string) => text; // No styling
  }
}

export function createTableHeader(columns: Array<{ title: string; width: number }>): string[] {
  const header = columns
    .map(col => padString(col.title, col.width))
    .join('');
  
  const separator = '─'.repeat(
    columns.reduce((sum, col) => sum + col.width, 0)
  );

  return [
    STYLES.bold(header),
    STYLES.muted(separator)
  ];
}