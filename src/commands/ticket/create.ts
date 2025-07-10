import type { CreateTicketArgs, Services, CLIResult } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import { TICKET_CONSTANTS } from '../../common/constants.js';
import { STYLES } from '../../common/styles.js';
import { formatTicketLocation } from '../../common/utils/location-utils.js';

export async function createTicket(
  args: CreateTicketArgs,
  services: Services
): Promise<CLIResult> {
  // Input validation
  if (!args.title || args.title.trim().length === 0) {
    throw new ValidationError('Ticket title cannot be empty', 'title');
  }

  if (args.title.length > TICKET_CONSTANTS.VALIDATION.TITLE_MAX_LENGTH) {
    throw new ValidationError(
      `Ticket title cannot exceed ${TICKET_CONSTANTS.VALIDATION.TITLE_MAX_LENGTH} characters`,
      'title'
    );
  }

  // Priority validation
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (args.priority && !validPriorities.includes(args.priority)) {
    throw new ValidationError(
      `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      'priority'
    );
  }

  try {
    // Execute business logic through service layer
    const ticket = await services.ticketService.createTicket(args.title, {
      priority: args.priority,
      assignee: args.assignee,
      labels: args.labels || []
    });

    // Create user-friendly colored output
    const messageParts = [
      STYLES.success('SUCCESS: Ticket created successfully'),
      `   ID: #${ticket.id}`,
      `   Title: ${ticket.title}`,
      `   Priority: ${ticket.priority}`,
      `   Status: ${ticket.status}`
    ];

    // Add optional fields only if they exist
    if (ticket.assignee) {
      messageParts.push(`   Assignee: ${ticket.assignee}`);
    }

    if (ticket.labels.length > 0) {
      messageParts.push(`   Labels: ${ticket.labels.join(', ')}`);
    }

    // Add location (Local file or GitHub URL)
    const locationDisplay = formatTicketLocation(ticket, services.ticketService);
    messageParts.push(
      STYLES.muted(`   Location: ${locationDisplay}`)
    );

    return {
      success: true,
      message: messageParts.join('\n'),
      data: ticket
    };

  } catch (error) {
    // Error handling - convert service layer errors to appropriate CLI errors
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors as-is
    }
    
    // Wrap other errors with context
    throw new Error(`Failed to create ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}