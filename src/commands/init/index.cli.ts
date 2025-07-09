import { Command } from 'commander';
import { initCommand } from './index.js';

export const initCommandGroup = new Command('init')
  .description('Initialize AIT³ components')
  .argument('[subcommand]', 'Subcommand to run')
  .option('-f, --force', 'Force overwrite existing files')
  .option('-d, --detailed', 'Include detailed analysis')
  .option('-j, --json', 'Output in JSON format')
  .option('-o, --output <path>', 'Output path for generated file')
  .action(async (subcommand, options) => {
    const result = await initCommand({
      subcommand,
      ...options
    });
    
    console.log(result.message);
    if (!result.success) {
      process.exit(1);
    }
  });