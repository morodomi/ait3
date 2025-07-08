import { Command, Option } from 'commander';
import { planPhase } from './plan.js';
import { redPhase } from './red.js';
import { greenPhase } from './green.js';
import { refactorPhase } from './refactor.js';
import { squashPhase } from './squash.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import type { Services } from '../../common/types.js';
import { STYLES } from '../../common/styles.js';

// Service container - centralized dependency injection
// Support test environment override with TICKETS_DIR
const ticketsPath = process.env.TICKETS_DIR || '.tickets';
const services: Services = {
  ticketService: new LocalTicketService(ticketsPath)
};

export const flowCommand = new Command('flow')
  .description('AIT³ workflow commands - AI + Ticket + Test + Tool driven development')
  .addHelpText('after', `
Examples:
  $ ait3 flow plan "user-auth" --requirements "security,oauth"
  $ ait3 flow plan "feature-name" --mode guided
  $ ait3 flow plan "quick-feature" --mode express
  $ ait3 flow plan "manual-feature" --mode manual
  $ ait3 flow red 0001
  $ ait3 flow red 0001 --type both --interactive
  $ ait3 flow green 0001
  $ ait3 flow green 0001 --verbose --strict
  $ ait3 flow refactor 0001
  $ ait3 flow refactor 0001 --verbose --focus mocks,duplication
  $ ait3 flow squash 0001
  $ ait3 flow squash 0001 --pr --no-squash
  
Philosophy:
  Claude proposes → Gemini refutes → Human decides
  `);

// flow plan subcommand
flowCommand
  .command('plan <featureName>')
  .description('PLANNING Phase - Socratic dialogue for approach validation')
  .addOption(new Option('-m, --mode <mode>', 'Planning mode').choices(['guided', 'express', 'manual']).default('guided'))
  .option('-r, --requirements <requirements>', 'Comma-separated requirements (e.g., "security,oauth,jwt")')
  .option('-t, --ticket <ticketId>', 'Associate with specific ticket ID')
  .action(async (featureName: string, options) => {
    try {
      // Parse requirements
      const requirements = options.requirements?.split(',').map((r: string) => r.trim()).filter(Boolean) || [];
      
      const result = await planPhase(
        {
          featureName,
          mode: options.mode,
          requirements: requirements.length > 0 ? requirements : undefined,
          ticketId: options.ticket
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('VALIDATION ERROR:'), error.message);
      } else {
        console.error(STYLES.danger('ERROR in planning phase:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// flow red subcommand
flowCommand
  .command('red <ticketId>')
  .description('RED Phase - Generate failing tests from ticket requirements')
  .addOption(new Option('-t, --type <type>', 'Test type to generate').choices(['unit', 'integration', 'both']).default('unit'))
  .option('-i, --interactive', 'Interactive mode for test customization')
  .option('-d, --dry-run', 'Preview what would be generated without creating files')
  .action(async (ticketId: string, options) => {
    try {
      const result = await redPhase(
        {
          ticketId,
          type: options.type,
          interactive: options.interactive || false,
          dryRun: options.dryRun || false
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('VALIDATION ERROR:'), error.message);
        if (error.field === 'ticketId') {
          console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
        }
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else {
        console.error(STYLES.danger('ERROR in RED phase:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// flow green subcommand
flowCommand
  .command('green <ticketId>')
  .description('GREEN Phase - Make tests pass with minimal implementation')
  .option('-s, --strict', 'Enable strict mode for test immutability (default: true)', true)
  .option('--no-strict', 'Disable strict mode (not recommended)')
  .option('-v, --verbose', 'Show detailed progress and analysis')
  .option('-t, --target <testFile>', 'Focus on specific test file')
  .action(async (ticketId: string, options) => {
    try {
      const result = await greenPhase(
        {
          ticketId,
          strict: options.strict,
          verbose: options.verbose || false,
          target: options.target
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('VALIDATION ERROR:'), error.message);
        if (error.field === 'ticketId') {
          console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
        }
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else {
        console.error(STYLES.danger('ERROR in GREEN phase:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// flow refactor subcommand
flowCommand
  .command('refactor <ticketId>')
  .description('REFACTOR Phase - Analyze and suggest code optimizations')
  .option('-v, --verbose', 'Show detailed analysis results')
  .option('-f, --focus <areas>', 'Focus on specific areas (comma-separated: duplication,mocks,types,organization)')
  .action(async (ticketId: string, options) => {
    try {
      const result = await refactorPhase(
        {
          ticketId,
          verbose: options.verbose || false,
          focus: options.focus
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('VALIDATION ERROR:'), error.message);
        if (error.field === 'ticketId') {
          console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
        } else if (error.field === 'focus') {
          console.error(STYLES.warning('TIP: Valid areas: duplication, mocks, types, organization'));
        }
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else {
        console.error(STYLES.danger('ERROR in REFACTOR phase:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

// flow squash subcommand
flowCommand
  .command('squash <ticketId>')
  .description('SQUASH Phase - Git command suggestions for clean commit history')
  .option('--pr', 'Include PR creation commands')
  .option('--no-squash', 'Skip squash suggestions, only show merge commands')
  .option('--dry-run', 'Show what would be suggested without analysis')
  .action(async (ticketId: string, options) => {
    try {
      const result = await squashPhase(
        {
          ticketId,
          pr: options.pr || false,
          noSquash: options.squash === false, // Commander sets squash: false for --no-squash
          dryRun: options.dryRun || false
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      // Enhanced error handling
      if (error instanceof ValidationError) {
        console.error(STYLES.danger('VALIDATION ERROR:'), error.message);
        if (error.field === 'ticketId') {
          console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
        }
      } else if (error instanceof TicketNotFoundError) {
        console.error(STYLES.danger('TICKET NOT FOUND:'), error.message);
        console.error(STYLES.warning('TIP: Use "ait3 ticket list" to see available tickets'));
      } else {
        console.error(STYLES.danger('ERROR in SQUASH phase:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });