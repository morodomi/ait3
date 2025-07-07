import type { StartTicketArgs, Services, CLIResult } from '../../common/types.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '../../common/errors.js';
import { IDUtils } from '../../common/utils.js';
import { UI_CONSTANTS } from '../../common/constants.js';
import chalk from 'chalk';

// Force colors for consistent output in tests
chalk.level = 3;

export async function startTicket(
  args: StartTicketArgs,
  services: Services
): Promise<CLIResult> {
  // Input validation - ID format
  if (!args.id || !IDUtils.isValidTicketId(args.id)) {
    throw new ValidationError(
      'Invalid ticket ID format. Must be a 4-digit number (e.g., 0001)',
      'id'
    );
  }

  try {
    // Execute business logic through service layer
    await services.ticketService.startTicket(args.id);

    // Get ticket details for better user feedback
    const ticket = await services.ticketService.getTicket(args.id);

    // Generate formatted success output
    const messageParts = [
      chalk.green(`✅ Started ticket #${args.id}`) + (ticket ? `: ${ticket.title}` : ''),
      '',
      chalk.gray('   Status updated: ') + chalk.blue('todo') + chalk.gray(' → ') + chalk.yellow('doing'),
      chalk.gray('   Moved from todo → doing'),
      ''
    ];

    return {
      success: true,
      message: messageParts.join('\n')
    };

  } catch (error) {
    // Error handling - convert service layer errors to appropriate CLI errors
    if (error instanceof ValidationError || 
        error instanceof TicketNotFoundError ||
        error instanceof TicketAlreadyInProgressError ||
        error instanceof TicketAlreadyCompletedError) {
      throw error; // Re-throw specific errors as-is
    }
    
    // Wrap other errors with context
    throw new Error(`Failed to start ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}