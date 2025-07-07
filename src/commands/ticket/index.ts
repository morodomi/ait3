import { Command, Option } from 'commander';
import { createTicket } from './create.js';
import { listTickets } from './list.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';
import { ValidationError } from '../../common/errors.js';
import type { Services } from '../../common/types.js';
import chalk from 'chalk';

// Service container - centralized dependency injection
// Support test environment override with TICKETS_DIR
const ticketsPath = process.env.TICKETS_DIR || '.tickets';
const services: Services = {
  ticketService: new LocalTicketService(ticketsPath)
};

export const ticketCommand = new Command('ticket')
  .description('Ticket management commands')
  .addHelpText('after', `
Examples:
  $ synapse ticket create "Fix authentication bug"
  $ synapse ticket create "Add dark mode" --priority high --assignee "john@example.com"
  $ synapse ticket create "Feature request" --labels "feature,backend,urgent"
  
Future commands:
  $ synapse ticket list
  $ synapse ticket show 001
  $ synapse ticket start 001
  $ synapse ticket complete 001
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
        console.error(chalk.red('❌ Validation Error:'), error.message);
        
        // Provide helpful suggestions for common validation errors
        if (error.field === 'priority') {
          console.error(chalk.yellow('💡 Valid priorities: low, medium, high, critical'));
        }
        if (error.field === 'title') {
          console.error(chalk.yellow('💡 Provide a descriptive title for your ticket'));
        }
      } else {
        console.error(chalk.red('❌ Error creating ticket:'), error instanceof Error ? error.message : String(error));
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
        console.error(chalk.red('❌ Validation Error:'), error.message);
        
        // Provide helpful suggestions for common validation errors
        if (error.field === 'status') {
          console.error(chalk.yellow('💡 Valid statuses: todo, doing, done'));
        }
        if (error.field === 'priority') {
          console.error(chalk.yellow('💡 Valid priorities: low, medium, high, critical'));
        }
      } else {
        console.error(chalk.red('❌ Error listing tickets:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// Future subcommands will be added here:
/*

ticketCommand
  .command('show <id>')
  .description('Show ticket details')
  .action(async (id: string) => {
    const result = await showTicket({ id }, services);
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  });
*/