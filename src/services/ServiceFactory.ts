import type { Services, BackendConfig } from '../common/types.js';
import type { TicketService } from './interfaces/TicketService.js';
import type { GitService } from './interfaces/GitService.js';
import type { ProjectAnalyzer } from './interfaces/ProjectAnalyzer.js';
import { LocalTicketService } from './implementations/LocalTicketService.js';
import { GitHubTicketService } from './implementations/GitHubTicketService.js';
import { SimpleGitService } from './implementations/SimpleGitService.js';
import { DefaultProjectAnalyzer } from './implementations/DefaultProjectAnalyzer.js';
import { LinguistLanguageDetector } from './implementations/LinguistLanguageDetector.js';
import { ConfigBasedCommandDetector } from './implementations/ConfigBasedCommandDetector.js';
import { DirectoryStructureAnalyzer } from './implementations/DirectoryStructureAnalyzer.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * ServiceFactory provides dependency injection for all services
 * This ensures commands depend on interfaces, not implementations
 */
export class ServiceFactory {
  /**
   * Create default services for production use
   */
  static async createServices(): Promise<Services> {
    const config = await this.loadConfig();
    const gitService = this.createGitService();
    const projectAnalyzer = this.createProjectAnalyzer();
    
    return {
      ticketService: this.createTicketService(config, gitService),
      gitService,
      projectAnalyzer
    };
  }

  /**
   * Create services for test environments
   * Disables Git operations to avoid conflicts
   */
  static createTestServices(ticketsPath: string): Services {
    const config: BackendConfig = {
      backend: 'local',
      local: { path: ticketsPath }
    };
    
    return {
      ticketService: this.createTicketService(config, undefined),
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
   * Create TicketService instance based on backend configuration
   */
  private static createTicketService(
    config: BackendConfig,
    gitService?: GitService
  ): TicketService {
    if (config.backend === 'github') {
      if (!config.github) {
        throw new Error('GitHub backend configuration missing');
      }
      return new GitHubTicketService(config.github);
    }
    
    // Default to local backend
    const ticketsPath = process.env.TICKETS_DIR || config.local?.path || '.tickets';
    return new LocalTicketService(ticketsPath, gitService);
  }

  /**
   * Load backend configuration from .tickets/config.json
   */
  private static async loadConfig(): Promise<BackendConfig> {
    try {
      const ticketsPath = process.env.TICKETS_DIR || '.tickets';
      const configPath = join(process.cwd(), ticketsPath, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      return {
        backend: config.backend || 'local',
        local: config.local || { path: ticketsPath },
        github: config.github
      };
    } catch {
      // Fallback to local backend if config file doesn't exist or is invalid
      return {
        backend: 'local',
        local: { path: process.env.TICKETS_DIR || '.tickets' }
      };
    }
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