import { Command } from 'commander';
import { migrateCommand } from './index.js';
import { ServiceFactory } from '../../services/ServiceFactory.js';
import { STYLES } from '../../common/styles.js';

// Service container - centralized dependency injection
const services = ServiceFactory.createServices();

export const migrateCommandGroup = new Command('migrate')
  .description('Migrate tickets between local and GitHub backends')
  .addHelpText('after', `
Examples:
  $ ait3 migrate --from local --to github --owner myuser --repo myproject
  $ ait3 migrate --from local --to github --owner myuser --repo myproject --validate
  $ ait3 migrate --from local --to github --owner myuser --repo myproject --dry-run
  `)
  .requiredOption('--from <backend>', 'Source backend (local or github)')
  .requiredOption('--to <backend>', 'Target backend (local or github)')
  .option('--owner <owner>', 'GitHub repository owner')
  .option('--repo <repo>', 'GitHub repository name')
  .option('--validate', 'Validate migration without performing it')
  .option('--dry-run', 'Preview migration without executing')
  .action(async (options) => {
    try {
      const result = await migrateCommand(
        {
          from: options.from,
          to: options.to,
          owner: options.owner,
          repo: options.repo,
          validate: options.validate,
          dryRun: options.dryRun
        },
        services
      );
      
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(STYLES.danger('ERROR:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });