import type { CLIResult, Services, CompleteTicketArgs } from '../../common/types.js';
import { ValidationError, TicketNotFoundError, TicketNotStartedError, TicketAlreadyCompletedError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';
import { IDUtils } from '../../common/utils.js';

/**
 * Complete a ticket by moving it from 'doing' to 'done' status
 * Pure function that delegates to TicketService
 */
export async function completeTicket(
  args: CompleteTicketArgs,
  services: Services
): Promise<CLIResult> {
  const { id } = args;
  const { ticketService } = services;

  // Validate ID format
  if (!id || !IDUtils.isValidTicketId(id)) {
    throw new ValidationError('Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)');
  }

  try {
    // Attempt to complete the ticket
    await ticketService.completeTicket(id);

    // Get ticket details for success message
    const ticket = await ticketService.getTicket(id);
    const ticketTitle = ticket?.title || 'Unknown';

    // Generate formatted success output
    const messageParts = [
      STYLES.success(`SUCCESS: Completed ticket #${id}`) + (ticket ? `: ${ticketTitle}` : ''),
      '',
      STYLES.muted('   Status updated: ') + STYLES.warning('doing') + STYLES.muted(' → ') + STYLES.success('done'),
      STYLES.muted('   Moved from doing → done'),
      ''
    ];

    return {
      success: true,
      message: messageParts.join('\n')
    };
  } catch (error) {
    // Handle specific error types
    if (error instanceof TicketNotFoundError) {
      throw error;
    }

    if (error instanceof TicketNotStartedError) {
      throw error;
    }

    if (error instanceof TicketAlreadyCompletedError) {
      throw error;
    }

    if (error instanceof ValidationError) {
      throw error;
    }

    // Wrap other errors
    throw new Error(`Failed to complete ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}