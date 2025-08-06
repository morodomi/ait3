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
import { getProjectRoot } from '../common/utils/project-root-utils.js';
import { promises as fs } from 'fs';
import { join, isAbsolute } from 'path';

/**
 * ServiceFactory provides dependency injection for all services
 * This ensures commands depend on interfaces, not implementations
 */
export class ServiceFactory {
  /**
   * Create default services for production use
   */
  static async createServices(): Promise<Services> {
    // Detect project root once
    const projectRoot = await getProjectRoot();
    
    // Pass project root to all methods that need it
    const config = await this.loadConfig(projectRoot);
    const gitService = this.createGitService();
    const projectAnalyzer = this.createProjectAnalyzer(projectRoot);
    
    return {
      ticketService: this.createTicketService(config, gitService, projectRoot),
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
    gitService?: GitService,
    projectRoot?: string
  ): TicketService {
    if (config.backend === 'github') {
      if (!config.github) {
        throw new Error('GitHub backend configuration missing');
      }
      return new GitHubTicketService(config.github);
    }
    
    // Default to local backend
    const ticketsDir = process.env.TICKETS_DIR || config.local?.path || '.tickets';
    
    // Handle absolute vs relative paths
    const ticketsPath = isAbsolute(ticketsDir)
      ? ticketsDir
      : join(projectRoot || process.cwd(), ticketsDir);
    
    return new LocalTicketService(ticketsPath, gitService);
  }

  /**
   * Load backend configuration from .tickets/config.json
   */
  private static async loadConfig(projectRoot: string): Promise<BackendConfig> {
    try {
      const ticketsDir = process.env.TICKETS_DIR || '.tickets';
      
      // Handle absolute vs relative paths
      const ticketsPath = isAbsolute(ticketsDir)
        ? ticketsDir
        : join(projectRoot, ticketsDir);
      
      const configPath = join(ticketsPath, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      return {
        backend: config.backend || 'local',
        local: config.local || { path: ticketsPath },
        github: config.github
      };
    } catch {
      // Fallback to local backend if config file doesn't exist or is invalid
      const ticketsDir = process.env.TICKETS_DIR || '.tickets';
      const ticketsPath = isAbsolute(ticketsDir)
        ? ticketsDir
        : join(projectRoot, ticketsDir);
        
      return {
        backend: 'local',
        local: { path: ticketsPath }
      };
    }
  }

  /**
   * Create ProjectAnalyzer instance
   */
  private static createProjectAnalyzer(projectRoot: string): ProjectAnalyzer {
    const languageDetector = new LinguistLanguageDetector(projectRoot);
    const commandDetector = new ConfigBasedCommandDetector(projectRoot);
    const structureAnalyzer = new DirectoryStructureAnalyzer(projectRoot);
    
    return new DefaultProjectAnalyzer(
      projectRoot,
      languageDetector,
      commandDetector,
      structureAnalyzer
    );
  }
}