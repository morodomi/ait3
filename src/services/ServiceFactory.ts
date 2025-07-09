import type { Services } from '../common/types.js';
import type { TicketService } from './interfaces/TicketService.js';
import type { GitService } from './interfaces/GitService.js';
import type { ProjectAnalyzer } from './interfaces/ProjectAnalyzer.js';
import { LocalTicketService } from './implementations/LocalTicketService.js';
import { SimpleGitService } from './implementations/SimpleGitService.js';
import { DefaultProjectAnalyzer } from './implementations/DefaultProjectAnalyzer.js';
import { LinguistLanguageDetector } from './implementations/LinguistLanguageDetector.js';
import { ConfigBasedCommandDetector } from './implementations/ConfigBasedCommandDetector.js';
import { DirectoryStructureAnalyzer } from './implementations/DirectoryStructureAnalyzer.js';

/**
 * ServiceFactory provides dependency injection for all services
 * This ensures commands depend on interfaces, not implementations
 */
export class ServiceFactory {
  /**
   * Create default services for production use
   */
  static createServices(): Services {
    const ticketsPath = process.env.TICKETS_DIR || '.tickets';
    const gitService = this.createGitService();
    const projectAnalyzer = this.createProjectAnalyzer();
    
    return {
      ticketService: this.createTicketService(ticketsPath, gitService),
      gitService,
      projectAnalyzer
    };
  }

  /**
   * Create services for test environments
   * Disables Git operations to avoid conflicts
   */
  static createTestServices(ticketsPath: string): Services {
    return {
      ticketService: this.createTicketService(ticketsPath, undefined),
      gitService: undefined
    };
  }

  /**
   * Create GitService instance
   * Returns undefined in test environments
   */
  private static createGitService(): GitService | undefined {
    // Disable Git operations in test environments
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return undefined;
    }
    
    return new SimpleGitService();
  }

  /**
   * Create TicketService instance
   */
  private static createTicketService(
    ticketsPath: string,
    gitService?: GitService
  ): TicketService {
    return new LocalTicketService(ticketsPath, gitService);
  }

  /**
   * Create ProjectAnalyzer instance
   */
  private static createProjectAnalyzer(): ProjectAnalyzer {
    const rootPath = process.cwd();
    const languageDetector = new LinguistLanguageDetector(rootPath);
    const commandDetector = new ConfigBasedCommandDetector(rootPath);
    const structureAnalyzer = new DirectoryStructureAnalyzer(rootPath);
    
    return new DefaultProjectAnalyzer(
      rootPath,
      languageDetector,
      commandDetector,
      structureAnalyzer
    );
  }
}