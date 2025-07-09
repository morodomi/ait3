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
   * @returns Migration result with success count and errors
   */
  migrateLocalToGitHub(localService: TicketService, githubService: TicketService): Promise<MigrationResult>;

  /**
   * Get the next available GitHub issue number
   * @param githubService GitHub ticket service
   * @returns Next available issue number
   */
  getNextAvailableGitHubId(githubService: TicketService): Promise<number>;
}