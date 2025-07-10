import type { CLIResult, Services, UndoTicketArgs } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { IDUtils } from '../../common/utils.js';
import chalk from 'chalk';

/**
 * Undo ticket to previous state
 * State transitions:
 * - doing → todo (remove started timestamp)
 * - done → doing (remove completed timestamp)
 * - todo → error (cannot undo initial state)
 */
export async function undoTicket(
  args: UndoTicketArgs,
  services: Services
): Promise<CLIResult> {
  try {
    // Input validation
    if (!args.id || args.id.trim().length === 0) {
      throw new ValidationError('Ticket ID is required');
    }

    const ticketId = args.id.trim();
    
    // Validate ticket ID format
    if (!IDUtils.isValidTicketId(ticketId)) {
      throw new ValidationError('Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)');
    }

    // Get current ticket to check status and show transition
    const ticket = await services.ticketService.getTicket(ticketId);
    if (!ticket) {
      throw new TicketNotFoundError(ticketId);
    }

    // Determine transition
    let transition: string;
    if (ticket.status === 'todo') {
      throw new ValidationError(`Cannot undo ticket #${ticketId}: already in 'todo' state`);
    } else if (ticket.status === 'doing') {
      transition = 'doing → todo';
    } else if (ticket.status === 'done') {
      transition = 'done → doing';
    } else {
      throw new ValidationError(`Invalid ticket status: ${ticket.status}`);
    }

    // Dry run mode - show preview without executing
    if (args.dryRun) {
      return {
        success: true,
        message: `${chalk.yellow('DRY RUN:')} Would undo ticket #${ticketId}\n` +
                `  Title: ${ticket.title}\n` +
                `  Transition: ${transition}\n` +
                `  ${chalk.dim('Use without --dry-run to execute')}`
      };
    }

    // Execute undo operation
    await services.ticketService.undoTicket(ticketId);

    return {
      success: true,
      message: `${chalk.green('SUCCESS:')} Undid ticket #${ticketId}\n` +
              `  Title: ${ticket.title}\n` +
              `  Transition: ${transition}`
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof TicketNotFoundError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new Error(`Failed to undo ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}