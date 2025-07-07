import chalk from 'chalk';

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
      return chalk.blue;
    case 'doing':
      return chalk.yellow;
    case 'done':
      return chalk.green;
    default:
      return chalk.white;
  }
}

export function getPriorityColor(priority: string): (text: string) => string {
  switch (priority) {
    case 'critical':
      return chalk.red.bold;
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.gray;
    default:
      return chalk.white;
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
    chalk.bold(header),
    chalk.gray(separator)
  ];
}