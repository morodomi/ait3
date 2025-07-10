import { CommanderError } from 'commander';
import { STYLES } from '../../common/styles.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get the current backend type from config
 * @returns 'github' or 'local'
 */
function getBackend(): string {
  try {
    const configPath = process.env.TICKETS_DIR ? 
      join(process.env.TICKETS_DIR, 'config.json') : '.tickets/config.json';
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.backend || 'local';
  } catch {
    return 'local'; // Default to local if config read fails
  }
}

/**
 * Display error message for missing ID arguments
 * @param commandType 'ticket' or 'flow'
 * @param commandName The specific command name
 * @param idParam The parameter name ('id' or 'ticketId')
 */
function displayMissingIdError(commandType: string, commandName: string, idParam: string): void {
  const backend = getBackend();
  
  console.error(STYLES.danger('ERROR:'), 'Ticket ID is required');
  console.error('');
  console.error(`Usage: ait3 ${commandType} ${commandName} <${idParam}>`);
  console.error('');
  console.error('Examples:');
  
  if (backend === 'github') {
    console.error(`  ait3 ${commandType} ${commandName} 82      # GitHub issue #82`);
    console.error(`  ait3 ${commandType} ${commandName} 123     # GitHub issue #123`);
    console.error('');
    console.error(STYLES.warning('Note: For GitHub issues, use the number without \'#\' prefix'));
  } else {
    console.error(`  ait3 ${commandType} ${commandName} 0001    # Local ticket`);
    console.error(`  ait3 ${commandType} ${commandName} 0042    # Local ticket`);
  }
  
  process.exit(1);
}

/**
 * Create custom error handler for missing ID arguments
 * @param commandName The name of the command (e.g., 'start', 'complete')
 * @returns Error handler function
 */
export function createMissingIdErrorHandler(commandName: string): (err: CommanderError) => never {
  return (err: CommanderError) => {
    if (err.code === 'commander.missingArgument' && err.message.includes('id')) {
      displayMissingIdError('ticket', commandName, 'id');
    }
    if (err.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    // Re-throw for other error types
    throw err;
  };
}

/**
 * Create custom error handler for missing ticket ID in flow commands
 * @param commandName The name of the flow command (e.g., 'red', 'green')
 * @returns Error handler function
 */
export function createMissingFlowIdErrorHandler(commandName: string): (err: CommanderError) => never {
  return (err: CommanderError) => {
    if (err.code === 'commander.missingArgument' && err.message.includes('ticketId')) {
      displayMissingIdError('flow', commandName, 'ticketId');
    }
    if (err.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    // Re-throw for other error types
    throw err;
  };
}