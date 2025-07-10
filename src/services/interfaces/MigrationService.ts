import type { TicketService } from './TicketService.js';

export interface ValidationResult {
  success: boolean;
  conflicts: string[];
  warnings: string[];
  errors: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

export interface MigrationService {
  /**
   * Validate migration between two ticket services
   * @param from Source ticket service
   * @param to Target ticket service
   * @returns Validation result with conflicts, warnings, and errors
   */
  validateMigration(from: TicketService, to: TicketService): Promise<ValidationResult>;

  /**
   * Migrate tickets from local service to GitHub service
   * @param localService Source local ticket service
   * @param githubService Target GitHub ticket service
   * @param ticketFilter Optional array of ticket IDs to migrate
   * @returns Migration result with success count and errors
   */
  migrateLocalToGitHub(localService: TicketService, githubService: TicketService, ticketFilter?: string[]): Promise<MigrationResult>;

  /**
   * Get the next available GitHub issue number
   * @param githubService GitHub ticket service
   * @returns Next available issue number
   */
  getNextAvailableGitHubId(githubService: TicketService): Promise<number>;

  /**
   * Parse ticket filter string into array of local ticket IDs
   * @param filter Comma-separated list or range (e.g., "1,3,5" or "1-10" or "1,3-5")
   * @returns Array of local ticket IDs in format ["0001", "0003", "0005"]
   */
  parseTicketFilter(filter: string): string[];
}