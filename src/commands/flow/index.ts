import { Command, Option } from 'commander';
import { planPhase } from './plan.js';
import { redPhase } from './red.js';
import { greenPhase } from './green.js';
import { refactorPhase } from './refactor.js';
import { squashPhase } from './squash.js';
import { ServiceFactory } from '../../services/ServiceFactory.js';
import { createMissingFlowIdErrorHandler } from '../ticket/error-handler.js';
import { handleCommandError, COMMON_TIPS } from '../../common/command-error-handler.js';

// Service container - centralized dependency injection
// Use ServiceFactory to ensure proper dependency inversion
// Services are created async per command to respect config changes

export const flowCommand = new Command('flow')
  .description('AIT³ workflow commands - AI + Ticket + Test + Tool driven development')
  .addHelpText('after', `
Examples:
  $ ait3 flow plan 0001
  $ ait3 flow plan 0001 --requirements "security,oauth"
  $ ait3 flow plan 0001 --mode express
  $ ait3 flow plan 72 --mode manual
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
  .command('plan <ticketId>')
  .description('PLANNING Phase - Socratic dialogue for approach validation')
  .addOption(new Option('-m, --mode <mode>', 'Planning mode').choices(['guided', 'express', 'manual']).default('guided'))
  .option('-r, --requirements <requirements>', 'Comma-separated requirements (e.g., "security,oauth,jwt")')
  .action(async (ticketId: string, options) => {
    try {
      // Create services for this command execution
      const services = await ServiceFactory.createServices();
      
      // Parse requirements
      const requirements = options.requirements?.split(',').map((r: string) => r.trim()).filter(Boolean) || [];
      
      const result = await planPhase(
        {
          ticketId,
          mode: options.mode,
          requirements: requirements.length > 0 ? requirements : undefined
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      handleCommandError(error, {
        action: 'execute planning phase',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// flow red subcommand
flowCommand
  .command('red <ticketId>')
  .description('RED Phase - Generate failing tests from ticket requirements')
  .addOption(new Option('-t, --type <type>', 'Test type to generate').choices(['unit', 'integration', 'both']).default('unit'))
  .option('-i, --interactive', 'Interactive mode for test customization')
  .option('-d, --dry-run', 'Preview what would be generated without creating files')
  .showHelpAfterError()
  .exitOverride(createMissingFlowIdErrorHandler('red'))
  .action(async (ticketId: string, options) => {
    try {
      // Create services for this command execution
      const services = await ServiceFactory.createServices();
      
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
      handleCommandError(error, {
        action: 'execute RED phase',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// flow green subcommand
flowCommand
  .command('green <ticketId>')
  .description('GREEN Phase - Make tests pass with minimal implementation')
  .option('-s, --strict', 'Enable strict mode for test immutability (default: true)', true)
  .showHelpAfterError()
  .exitOverride(createMissingFlowIdErrorHandler('green'))
  .option('--no-strict', 'Disable strict mode (not recommended)')
  .option('-v, --verbose', 'Show detailed progress and analysis')
  .option('-t, --target <testFile>', 'Focus on specific test file')
  .action(async (ticketId: string, options) => {
    try {
      // Create services for this command execution
      const services = await ServiceFactory.createServices();
      
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
      handleCommandError(error, {
        action: 'execute GREEN phase',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });

// flow refactor subcommand
flowCommand
  .command('refactor <ticketId>')
  .description('REFACTOR Phase - Analyze and suggest code optimizations')
  .option('-v, --verbose', 'Show detailed analysis results')
  .option('-f, --focus <areas>', 'Focus on specific areas (comma-separated: duplication,mocks,types,organization)')
  .showHelpAfterError()
  .exitOverride(createMissingFlowIdErrorHandler('refactor'))
  .action(async (ticketId: string, options) => {
    try {
      // Create services for this command execution
      const services = await ServiceFactory.createServices();
      
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
      handleCommandError(error, {
        action: 'execute REFACTOR phase',
        tips: {
          ticketId: COMMON_TIPS.ticketId,
          focus: COMMON_TIPS.focus
        }
      });
    }
  });

// flow squash subcommand
flowCommand
  .command('squash <ticketId>')
  .description('SQUASH Phase - Git command suggestions for clean commit history')
  .showHelpAfterError()
  .exitOverride(createMissingFlowIdErrorHandler('squash'))
  .option('--pr', 'Include PR creation commands')
  .option('--no-squash', 'Skip squash suggestions, only show merge commands')
  .option('--dry-run', 'Show what would be suggested without analysis')
  .action(async (ticketId: string, options) => {
    try {
      // Create services for this command execution
      const services = await ServiceFactory.createServices();
      
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
      handleCommandError(error, {
        action: 'execute SQUASH phase',
        tips: {
          ticketId: COMMON_TIPS.ticketId
        }
      });
    }
  });