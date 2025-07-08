import chalk from 'chalk';

/**
 * Common styling constants for all AIT³ commands
 * Provides consistent visual styling across flow and ticket commands
 */
export const FLOW_STYLES = {
  // Core status styles
  title: chalk.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  
  // Content styles
  text: chalk.white,
  dim: chalk.gray,
  code: chalk.gray,
  path: chalk.cyan,
  count: chalk.magenta,
  
  // Flow command specific
  feature: chalk.green,
  section: chalk.bold,
  command: chalk.cyan,
  option: chalk.cyan,
  progress: chalk.green,
  
  // Git operations
  gitSuccess: chalk.green,
  gitWarning: chalk.yellow,
  gitInfo: chalk.blue,
  gitCommand: chalk.gray,
  
  // Ticket operations
  ticketId: chalk.white,
  ticketTitle: chalk.white,
  ticketStatus: chalk.white,
  statusTransition: chalk.gray
} as const;

export type FlowStylesType = typeof FLOW_STYLES;