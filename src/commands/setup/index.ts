import { Command } from 'commander';
import type { Services } from '../../common/types.js';
import { setupTicketGitHub } from './ticket/github.js';
import { setupTicketLocal } from './ticket/local.js';

export function createSetupCommand(services: Services): Command {
  const setupCommand = new Command('setup')
    .description('Configure AIT³ settings');

  // Create ticket subcommand
  const ticketCommand = new Command('ticket')
    .description('Configure ticket backend');

  // GitHub subcommand
  const githubCommand = new Command('github')
    .description('Configure GitHub as ticket backend')
    .argument('[repository]', 'GitHub repository in owner/repo format')
    .option('--force', 'Force reconfiguration even if already set up')
    .action(async (repository: string | undefined, options) => {
      const result = await setupTicketGitHub(
        { ...options, repository },
        services,
        { cwd: process.cwd() }
      );

      if (result.success) {
        console.log(result.message);
        if (result.data?.details) {
          console.log(result.data.details);
        }
      } else {
        console.error(`ERROR: ${result.message}`);
        if (result.data?.details) {
          console.error(result.data.details);
        }
        process.exit(1);
      }
    });

  // Local subcommand
  const localCommand = new Command('local')
    .description('Configure local file system as ticket backend')
    .option('--force', 'Force reconfiguration even if already set up')
    .action(async (options) => {
      const result = await setupTicketLocal(
        options,
        services,
        { cwd: process.cwd() }
      );

      if (result.success) {
        console.log(result.message);
        if (result.data?.details) {
          console.log(result.data.details);
        }
      } else {
        console.error(`ERROR: ${result.message}`);
        if (result.data?.details) {
          console.error(result.data.details);
        }
        process.exit(1);
      }
    });

  ticketCommand.addCommand(githubCommand);
  ticketCommand.addCommand(localCommand);
  setupCommand.addCommand(ticketCommand);

  return setupCommand;
}