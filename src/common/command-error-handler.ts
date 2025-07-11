import { STYLES } from './styles.js';
import { 
  ValidationError, 
  TicketNotFoundError, 
  TicketAlreadyInProgressError,
  TicketAlreadyCompletedError,
  TicketNotStartedError 
} from './errors.js';

export interface ErrorContext {
  action: string;  // e.g., "create ticket", "start RED phase"
  tips?: Record<string, string[]>;  // Field-specific tips
}

export function handleCommandError(error: unknown, context: ErrorContext): never {
  if (error instanceof ValidationError) {
    console.error(STYLES.danger('ERROR:'), error.message);
    
    // Show field-specific tips if available
    if (error.field && context.tips?.[error.field]) {
      context.tips[error.field].forEach(tip => 
        console.error(STYLES.warning('TIP:'), tip)
      );
    }
  } else if (error instanceof TicketNotFoundError) {
    console.error(STYLES.danger('ERROR:'), error.message);
    console.error(STYLES.warning('TIP:'), 'Use "ait3 ticket list" to see available tickets');
  } else if (error instanceof TicketAlreadyInProgressError) {
    console.error(STYLES.danger('ALREADY IN PROGRESS:'), error.message);
    console.error(STYLES.warning('TIP:'), 'This ticket is already being worked on');
  } else if (error instanceof TicketAlreadyCompletedError) {
    console.error(STYLES.danger('ALREADY COMPLETED:'), error.message);
    console.error(STYLES.warning('TIP:'), 'This ticket has already been completed');
  } else if (error instanceof TicketNotStartedError) {
    console.error(STYLES.danger('NOT STARTED:'), error.message);
    console.error(STYLES.warning('TIP:'), 'You must start the ticket before completing it');
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(STYLES.danger('ERROR:'), `Failed to ${context.action}: ${message}`);
  }
  
  process.exit(1);
}

// Common tip definitions
export const COMMON_TIPS = {
  ticketId: ['Use local format (0001) or GitHub format (#70, 70)'],
  priority: ['Valid priorities: low, medium, high, critical'],
  status: ['Valid statuses: todo, doing, done'],
  title: ['Provide a descriptive title for your ticket'],
  focus: ['Valid areas: duplication, mocks, types, organization'],
  assignee: ['Provide a valid email address for the assignee'],
  labels: ['Use comma-separated values for multiple labels']
};

// Result handler for consistent exit codes
export interface CLIResult {
  success: boolean;
  message?: string;
  exitCode?: number;
}

export function handleCommandResult(result: CLIResult): void {
  if (result.message) {
    console.log(result.message);
  }
  process.exit(result.exitCode ?? (result.success ? 0 : 1));
}

// Wrapper for async command actions with error handling
export function withErrorHandling<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
  errorContext: ErrorContext
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await action(...args);
    } catch (error) {
      handleCommandError(error, errorContext);
    }
  };
}