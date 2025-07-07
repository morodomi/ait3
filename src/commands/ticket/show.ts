import type { ShowTicketArgs, Services, CLIResult } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { getStatusColor, getPriorityColor } from '../../common/table-utils.js';
import { TimeUtils, IDUtils } from '../../common/utils.js';
import { UI_CONSTANTS } from '../../common/constants.js';
import chalk from 'chalk';

// Force colors for consistent output in tests
chalk.level = 3;

export async function showTicket(
  args: ShowTicketArgs,
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
    const ticket = await services.ticketService.getTicket(args.id);

    if (!ticket) {
      throw new TicketNotFoundError(args.id);
    }

    // Generate formatted output
    const messageParts = [
      // Header
      chalk.bold(`${UI_CONSTANTS.EMOJIS.TICKET} Ticket #${ticket.id}: ${ticket.title}`),
      '',
      
      // Metadata section
      chalk.bold(`${UI_CONSTANTS.EMOJIS.DETAILS} Details:`),
      formatMetadataField('Status', ticket.status, getStatusColor(ticket.status)),
      formatMetadataField('Priority', ticket.priority, getPriorityColor(ticket.priority)),
      formatMetadataField('Created', TimeUtils.formatDate(ticket.created)),
      formatMetadataField('Updated', TimeUtils.formatDate(ticket.updated)),
    ];

    // Optional metadata fields
    if (ticket.assignee) {
      messageParts.push(formatMetadataField('Assignee', ticket.assignee));
    }

    const labelsText = ticket.labels.length > 0 
      ? ticket.labels.join(', ')
      : '(none)';
    messageParts.push(formatMetadataField('Labels', labelsText));

    // Separator
    messageParts.push('');
    messageParts.push(chalk.gray(UI_CONSTANTS.SEPARATORS.SECTION));
    
    // Description section
    messageParts.push('');
    messageParts.push(chalk.bold(`${UI_CONSTANTS.EMOJIS.DESCRIPTION} Description:`));
    messageParts.push('');

    const description = ticket.description || '(No description provided)';
    messageParts.push(description);

    return {
      success: true,
      message: messageParts.join('\n'),
      data: ticket
    };

  } catch (error) {
    // Error handling - convert service layer errors to appropriate CLI errors
    if (error instanceof ValidationError || error instanceof TicketNotFoundError) {
      throw error; // Re-throw validation and not found errors as-is
    }
    
    // Wrap other errors with context
    throw new Error(`Failed to show ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper functions
function formatMetadataField(label: string, value: string, colorFn?: (text: string) => string): string {
  const formattedValue = colorFn ? colorFn(value) : chalk.white(value);
  return `   ${chalk.gray(label + ':')} ${formattedValue}`;
}