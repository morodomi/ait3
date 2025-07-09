import { Command } from 'commander';
import { analyzeProject } from './project.js';
import { ServiceFactory } from '../../services/ServiceFactory.js';

export const analyzeCommand = new Command('analyze')
  .description('Analyze project structure, languages, and dependencies');

// analyze project command
analyzeCommand
  .command('project')
  .description('Analyze the current project comprehensively')
  .option('-p, --path <path>', 'Path to analyze (defaults to current directory)')
  .option('-f, --format <format>', 'Output format (default or detailed)', 'default')
  .action(async (options) => {
    const services = ServiceFactory.createServices();
    const result = await analyzeProject(
      { path: options.path, format: options.format },
      services
    );
    
    if (result.message) {
      console.log(result.message);
    }
    
    process.exit(result.exitCode || (result.success ? 0 : 1));
  });