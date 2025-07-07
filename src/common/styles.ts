import chalk from 'chalk';

/**
 * Common styling constants for flow commands
 * Provides consistent visual styling across all AIT³ flow phases
 */
export const FLOW_STYLES = {
  title: chalk.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  path: chalk.cyan,
  count: chalk.magenta,
  code: chalk.gray,
  dim: chalk.dim,
  // Additional styles for plan command
  feature: chalk.green,
  section: chalk.bold,
  command: chalk.cyan,
  option: chalk.cyan,
  // Additional styles for green command  
  progress: chalk.green
} as const;

export type FlowStylesType = typeof FLOW_STYLES;