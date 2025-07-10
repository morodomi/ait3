import type { CLIResult, Services, DeleteTicketArgs } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { IDUtils } from '../../common/utils.js';
import { STYLES } from '../../common/styles.js';

export async function deleteTicket(
  args: DeleteTicketArgs,
  services: Services
): Promise<CLIResult> {
  // Validate input
  if (!args.id?.trim()) {
    throw new ValidationError('Ticket ID is required', 'id');
  }

  // Validate ticket ID format
  if (!IDUtils.isValidTicketId(args.id)) {
    throw new ValidationError(
      'Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)',
      'id'
    );
  }

  try {
    // Check if ticket exists before deletion
    const ticket = await services.ticketService.getTicket(args.id);
    if (!ticket) {
      throw new TicketNotFoundError(args.id);
    }

    // Handle dry-run mode
    if (args.dryRun) {
      if (ticket.status === 'doing') {
        return {
          success: true,
          message: `${STYLES.info('[DRY RUN]')} Would delete ticket ${STYLES.info(args.id)}`,
          data: {
            ticketDetails: ticket,
            warning: 'Note: doing status would be blocked in actual deletion'
          }
        };
      }

      return {
        success: true,
        message: `${STYLES.info('[DRY RUN]')} Would delete ticket ${STYLES.info(args.id)}`,
        data: {
          ticketDetails: ticket
        }
      };
    }

    // Block deletion of doing status tickets
    if (ticket.status === 'doing') {
      return {
        success: false,
        message: `Cannot delete ticket #${ticket.id} in 'doing' status.`,
        data: {
          currentTicket: ticket,
          suggestion: `Please complete the ticket first: ait3 ticket complete ${ticket.id}`
        }
      };
    }

    // Delete the ticket
    await services.ticketService.deleteTicket(args.id);

    // Format ticket ID for display
    const displayId = ticket.id.startsWith('#') ? ticket.id : args.id;

    return {
      success: true,
      message: `${STYLES.success('✓')} Ticket ${STYLES.info(displayId)} deleted successfully

Deleted ticket details:
---
ID: ${ticket.id}
Title: ${ticket.title}
Status: ${ticket.status}
Priority: ${ticket.priority}
Created: ${ticket.created}
${ticket.labels.length > 0 ? `Labels: ${ticket.labels.join(', ')}` : ''}
${ticket.location ? `Location: ${ticket.location.path || ticket.location.url || 'N/A'}` : ''}

Full content:
---
${ticket.description || 'No description available'}
---

This information is preserved in your context for potential recovery.`,
      data: {
        deletedTicket: ticket,
        recoveryInfo: 'This information is preserved in your context for potential recovery.'
      }
    };
  } catch (error) {
    if (error instanceof TicketNotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error(`Failed to delete ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}