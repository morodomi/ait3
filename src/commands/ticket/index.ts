import { Command, Option } from 'commander';
import { createTicket } from './create.js';
import { listTickets } from './list.js';
import { showTicket } from './show.js';
import { startTicket } from './start.js';
import { completeTicket } from './complete.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';
import { SimpleGitService } from '../../services/implementations/SimpleGitService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError, TicketNotStartedError } from '../../common/errors.js';
import type { Services } from '../../common/types.js';
import { STYLES } from '../../common/styles.js';

// Service container - centralized dependency injection
// Support test environment override with TICKETS_DIR
const ticketsPath = process.env.TICKETS_DIR || '.tickets';
const services: Services = {
  ticketService: new LocalTicketService(ticketsPath),
  // GitService is optional - disable in test environments to avoid git conflicts
  gitService: process.env.NODE_ENV !== 'test' && !process.env.VITEST ? new SimpleGitService() : undefined
};

export const ticketCommand = new Command('ticket')
  .description('Ticket management commands')
  .addHelpText('after', `
Examples:
  $ ait3 ticket create "Fix authentication bug"
  $ ait3 ticket create "Add dark mode" --priority high --assignee "john@example.com"
  $ ait3 ticket create "Feature request" --labels "feature,backend,urgent"
  
Future commands:
  $ ait3 ticket list
  $ ait3 ticket show 001
  $ ait3 ticket start 001
  $ ait3 ticket complete 001
  `);

// ticket create subcommand
ticketCommand
  .command('create <title>')
  .description('Create a new ticket')
  .addOption(new Option('-p, --priority <priority>', 'Set priority level').choices(['low', 'medium', 'high', 'critical']).default('medium'))
  .option('-a, --assignee <assignee>', 'Assign ticket to user')
  .option('-l, --labels <labels>', 'Comma-separated labels (e.g., "feature,backend,urgent")')
  .action(async (title: string, options) => {
    try {
      // Parse labels
      const labels = options.labels?.split(',').map((l: string) => l.trim()).filter(Boolean) || [];
      
      const result = await createTicket(
        {
          title,
          priority: options.priority,
          assignee: options.assignee,
          labels
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling with better UX
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('ERROR:'), error.message);
        
        // Provide helpful suggestions for common validation errors
        if (error.field === 'priority') {
          console.error(STYLES.warning('TIP: Valid priorities: low, medium, high, critical'));
        }
        if (error.field === 'title') {
          console.error(STYLES.warning('TIP: Provide a descriptive title for your ticket'));
        }
      } else {
        console.error(STYLES.danger('ERROR creating ticket:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// ticket list subcommand
ticketCommand
  .command('list')
  .description('List tickets')
  .addOption(new Option('-s, --status <status>', 'Filter by status').choices(['todo', 'doing', 'done']))
  .addOption(new Option('-p, --priority <priority>', 'Filter by priority').choices(['low', 'medium', 'high', 'critical']))
  .action(async (options) => {
    try {
      const result = await listTickets(options, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling with better UX
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('ERROR:'), error.message);
        
        // Provide helpful suggestions for common validation errors
        if (error.field === 'status') {
          console.error(STYLES.warning('TIP: Valid statuses: todo, doing, done'));
        }
        if (error.field === 'priority') {
          console.error(STYLES.warning('TIP: Valid priorities: low, medium, high, critical'));
        }
      } else {
        console.error(STYLES.danger('ERROR listing tickets:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// ticket show subcommand
ticketCommand
  .command('show <id>')
  .description('Show ticket details')
  .action(async (id: string) => {
    try {
      const result = await showTicket({ id }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling with better UX
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('ERROR:'), error.message);
        console.error(STYLES.warning('TIP: Ticket ID must be a 4-digit number (e.g., 0001, 0042, 1234)'));
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else {
        console.error(STYLES.danger('ERROR showing ticket:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// ticket start subcommand
ticketCommand
  .command('start <id>')
  .description('Start working on a ticket')
  .action(async (id: string) => {
    try {
      const result = await startTicket({ id }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling with better UX
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('ERROR:'), error.message);
        console.error(STYLES.warning('TIP: Ticket ID must be a 4-digit number (e.g., 0001, 0042, 1234)'));
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else if (error instanceof TicketAlreadyInProgressError) {
        console.error(STYLES.danger('ALREADY IN PROGRESS:'), error.message);
        console.error(STYLES.warning('TIP: This ticket is already being worked on'));
      } else if (error instanceof TicketAlreadyCompletedError) {
        console.error(STYLES.danger('ALREADY COMPLETED:'), error.message);
        console.error(STYLES.warning('TIP: This ticket has already been completed'));
      } else {
        console.error(STYLES.danger('ERROR starting ticket:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// ticket complete subcommand
ticketCommand
  .command('complete <id>')
  .description('Complete a ticket')
  .action(async (id: string) => {
    try {
      const result = await completeTicket({ id }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling with better UX
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('ERROR:'), error.message);
        console.error(STYLES.warning('TIP: Ticket ID must be a 4-digit number (e.g., 0001, 0042, 1234)'));
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else if (error instanceof TicketNotStartedError) {
        console.error(STYLES.danger('NOT STARTED:'), error.message);
        console.error(STYLES.warning('TIP: You must start the ticket before completing it'));
      } else if (error instanceof TicketAlreadyCompletedError) {
        console.error(STYLES.danger('ALREADY COMPLETED:'), error.message);
        console.error(STYLES.warning('TIP: This ticket has already been completed'));
      } else {
        console.error(STYLES.danger('ERROR completing ticket:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });