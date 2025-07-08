import type { ListTicketsArgs, Services, CLIResult } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import { ERROR_MESSAGES, VALID_STATUSES, VALID_PRIORITIES } from '../../common/constants.js';
import { 
  padString, 
  truncateString, 
  getStatusColor, 
  getPriorityColor, 
  createTableHeader 
} from '../../common/table-utils.js';
import chalk from 'chalk';

export async function listTickets(
  args: ListTicketsArgs,
  services: Services
): Promise<CLIResult> {
  // Input validation
  if (args.status && !VALID_STATUSES.includes(args.status as any)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_STATUS, 'status');
  }

  if (args.priority && !VALID_PRIORITIES.includes(args.priority as any)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_PRIORITY, 'priority');
  }

  try {
    // Execute business logic through service layer
    const tickets = await services.ticketService.listTickets({
      status: args.status,
      priority: args.priority
    });

    if (tickets.length === 0) {
      return {
        success: true,
        message: chalk.yellow('LIST: No tickets found'),
        data: tickets
      };
    }

    // Generate table output
    const columns = [
      { title: 'ID', width: 6 },
      { title: 'Title', width: 40 },
      { title: 'Status', width: 10 },
      { title: 'Priority', width: 10 }
    ];

    const messageParts = [
      chalk.green(`LIST: Found ${tickets.length} tickets`),
      '',
      ...createTableHeader(columns)
    ];

    // Sort tickets by ID for consistent display
    const sortedTickets = tickets.sort((a, b) => a.id.localeCompare(b.id));

    for (const ticket of sortedTickets) {
      const statusColor = getStatusColor(ticket.status);
      const priorityColor = getPriorityColor(ticket.priority);
      
      const row = 
        chalk.white(padString(`#${ticket.id}`, 6)) +
        chalk.white(padString(truncateString(ticket.title, 38), 40)) +
        statusColor(padString(ticket.status, 10)) +
        priorityColor(padString(ticket.priority, 10));
      
      messageParts.push(row);
    }

    return {
      success: true,
      message: messageParts.join('\n'),
      data: tickets
    };

  } catch (error) {
    // Error handling - convert service layer errors to appropriate CLI errors
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors as-is
    }
    
    // Wrap other errors with context
    throw new Error(`Failed to list tickets: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Table formatting utilities extracted to common/table-utils.ts