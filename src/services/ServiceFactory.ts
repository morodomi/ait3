import type { Services } from '../common/types.js';
import type { TicketService } from './interfaces/TicketService.js';
import type { GitService } from './interfaces/GitService.js';
import { LocalTicketService } from './implementations/LocalTicketService.js';
import { SimpleGitService } from './implementations/SimpleGitService.js';

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
    
    return {
      ticketService: this.createTicketService(ticketsPath, gitService),
      gitService
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
}