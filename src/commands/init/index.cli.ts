import { Command } from 'commander';
import { initCommand } from './index.js';

export const initCommandGroup = new Command('init')
  .description('Initialize AIT³ for Claude Code integration')
  .action(async (options) => {
    const result = await initCommand(options);
    
    console.log(result.message);
    if (!result.success) {
      process.exit(1);
    }
  });