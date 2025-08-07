import { Command, Option } from 'commander';
import { createTicket } from './create.js';
import { listTickets } from './list.js';
import { showTicket } from './show.js';
import { startTicket } from './start.js';
import { completeTicket } from './complete.js';
import { undoTicket } from './undo.js';
import { deleteTicket } from './delete.js';
import { ServiceFactory } from '../../services/ServiceFactory.js';
import { createMissingIdErrorHandler } from './error-handler.js';
import { handleCommandError, COMMON_TIPS } from '../../common/command-error-handler.js';

// Service container will be created per command to respect config changes

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
      // Create services for this command execution
      const services = await ServiceFactory.createServices();
      
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
      handleCommandError(error, {
        action: 'create ticket',
        tips: {
          priority: COMMON_TIPS.priority,
          title: COMMON_TIPS.title
        }
      });
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
      const services = await ServiceFactory.createServices();
      const result = await listTickets(options, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'list tickets',
        tips: {
          status: COMMON_TIPS.status,
          priority: COMMON_TIPS.priority
        }
      });
    }
  });

// ticket show subcommand
ticketCommand
  .command('show <id>')
  .description('Show ticket details')
  .showHelpAfterError()
  .exitOverride(createMissingIdErrorHandler('show'))
  .action(async (id: string) => {
    try {
      const services = await ServiceFactory.createServices();
      const result = await showTicket({ id }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'show ticket',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// ticket start subcommand
ticketCommand
  .command('start <id>')
  .description('Start working on a ticket')
  .option('--no-branch', 'Skip Git branch creation/switching')
  .showHelpAfterError()
  .exitOverride(createMissingIdErrorHandler('start'))
  .action(async (id: string, options) => {
    try {
      const services = await ServiceFactory.createServices();
      const result = await startTicket({ id, noBranch: options.branch === false }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'start ticket',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// ticket complete subcommand
ticketCommand
  .command('complete <id>')
  .description('Complete a ticket')
  .showHelpAfterError()
  .exitOverride(createMissingIdErrorHandler('complete'))
  .action(async (id: string) => {
    try {
      const services = await ServiceFactory.createServices();
      const result = await completeTicket({ id }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'complete ticket',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// ticket undo subcommand
ticketCommand
  .command('undo <id>')
  .description('Undo ticket to previous state')
  .option('--dry-run', 'Preview changes without executing')
  .showHelpAfterError()
  .exitOverride(createMissingIdErrorHandler('undo'))
  .action(async (id: string, options) => {
    try {
      const services = await ServiceFactory.createServices();
      const result = await undoTicket({ id, dryRun: options.dryRun }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'undo ticket',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// ticket delete subcommand
ticketCommand
  .command('delete <id>')
  .description('Delete a ticket')
  .option('--dry-run', 'Preview deletion without executing')
  .showHelpAfterError()
  .exitOverride(createMissingIdErrorHandler('delete'))
  .action(async (id: string, options) => {
    try {
      const services = await ServiceFactory.createServices();
      const result = await deleteTicket({ id, dryRun: options.dryRun }, services);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'delete ticket',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });