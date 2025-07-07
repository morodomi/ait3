import { Command, Option } from 'commander';
import { planPhase } from './plan.js';
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

export const flowCommand = new Command('flow')
  .description('AIT³ workflow commands - AI + Ticket + Test + Tool driven development')
  .addHelpText('after', `
Examples:
  $ ait3 flow plan "user-auth" --requirements "security,oauth"
  $ ait3 flow plan "feature-name" --mode guided
  $ ait3 flow plan "quick-feature" --mode express
  $ ait3 flow plan "manual-feature" --mode manual
  
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
        console.error(chalk.red('❌ Validation Error:'), error.message);
      } else {
        console.error(chalk.red('❌ Error in planning phase:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });