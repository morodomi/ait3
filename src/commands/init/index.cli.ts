import { Command } from 'commander';
import { initCommand } from './index.js';

export const initCommandGroup = new Command('init')
  .description('Initialize AIT³ for Claude Code integration')
  .arguments('[subcommand]')
  .action(async (subcommand, options) => {
    const result = await initCommand({ ...options, subcommand });
    
    console.log(result.message);
    if (!result.success) {
      process.exit(1);
    }
  });