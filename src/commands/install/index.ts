import { Command } from 'commander';
import { commandCommand } from './command.js';

export const installCommand = new Command('install')
  .description('Install AIT³ components and integrations')
  .addHelpText('after', `
Examples:
  $ ait3 install command          # Install all command guides
  $ ait3 install command ait3     # Install AIT³ command guide only
  $ ait3 install command all      # Install all command guides (explicit)
`);

// Add subcommands
installCommand.addCommand(commandCommand);