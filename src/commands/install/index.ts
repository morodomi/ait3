import { Command } from 'commander';
import { commandCommand } from './command.js';
import { installSecurity } from './security.js';

export const installCommand = new Command('install')
  .description('Install AIT³ components and integrations')
  .addHelpText('after', `
Examples:
  $ ait3 install command          # Install all command guides
  $ ait3 install command ait3     # Install AIT³ command guide only
  $ ait3 install security         # Install security settings for Claude Code
`);

// Add subcommands
installCommand.addCommand(commandCommand);
installCommand.addCommand(
  new Command('security')
    .description('Install security settings for Claude Code')
    .action(async () => {
      const result = await installSecurity();
      console.log(result.message);
      if (!result.success) {
        process.exit(1);
      }
    })
);