import { Command } from 'commander';
import { analyzeProject } from './project.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';
import { SimpleGitService } from '../../services/implementations/SimpleGitService.js';
import { DefaultProjectAnalyzer } from '../../services/implementations/DefaultProjectAnalyzer.js';
import { LinguistLanguageDetector } from '../../services/implementations/LinguistLanguageDetector.js';
import { ConfigBasedCommandDetector } from '../../services/implementations/ConfigBasedCommandDetector.js';
import { DirectoryStructureAnalyzer } from '../../services/implementations/DirectoryStructureAnalyzer.js';
import type { Services } from '../../common/types.js';

export const analyzeCommand = new Command('analyze')
  .description('Analyze project structure, languages, and dependencies');

// analyze project command
analyzeCommand
  .command('project')
  .description('Analyze the current project comprehensively')
  .option('-p, --path <path>', 'Path to analyze (defaults to current directory)')
  .option('-f, --format <format>', 'Output format (default or detailed)', 'default')
  .action(async (options) => {
    const services = createServices();
    const result = await analyzeProject(
      { path: options.path, format: options.format },
      services
    );
    
    if (result.message) {
      console.log(result.message);
    }
    
    process.exit(result.exitCode || (result.success ? 0 : 1));
  });

// Helper function to create services
function createServices(): Services {
  const ticketsDir = process.env.TICKETS_DIR || '.tickets';
  const rootPath = process.cwd();
  
  // Create base services
  const ticketService = new LocalTicketService(ticketsDir);
  const gitService = new SimpleGitService();
  
  // Create project analyzer with dependencies
  const languageDetector = new LinguistLanguageDetector(rootPath);
  const commandDetector = new ConfigBasedCommandDetector(rootPath);
  const structureAnalyzer = new DirectoryStructureAnalyzer(rootPath);
  const projectAnalyzer = new DefaultProjectAnalyzer(
    rootPath,
    languageDetector,
    commandDetector,
    structureAnalyzer
  );
  
  return {
    ticketService,
    gitService,
    projectAnalyzer
  };
}