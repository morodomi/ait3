import type { MigrationService, ValidationResult, MigrationResult } from '../interfaces/MigrationService.js';
import type { TicketService } from '../interfaces/TicketService.js';

export class TicketMigrationService implements MigrationService {
  /**
   * Validate migration between two ticket services
   */
  async validateMigration(from: TicketService, to: TicketService): Promise<ValidationResult> {
    try {
      const fromTickets = await from.listTickets();
      const toTickets = await to.listTickets();
      
      const conflicts: string[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];
      
      // Check for ID conflicts
      const toIds = new Set(toTickets.map(ticket => this.extractIdNumber(ticket.id)));
      
      for (const ticket of fromTickets) {
        const idNumber = this.extractIdNumber(ticket.id);
        if (toIds.has(idNumber)) {
          conflicts.push(`ID conflict: local ${ticket.id} vs github #${idNumber}`);
        }
      }
      
      // Add standard warnings only if there are tickets to migrate
      if (fromTickets.length > 0) {
        warnings.push('Local markdown content will be migrated to GitHub issue body');
      }
      
      return {
        success: conflicts.length === 0 && errors.length === 0,
        conflicts,
        warnings,
        errors
      };
    } catch {
      return {
        success: false,
        conflicts: [],
        warnings: [],
        errors: ['Failed to read local tickets']
      };
    }
  }

  /**
   * Migrate tickets from local service to GitHub service
   */
  async migrateLocalToGitHub(localService: TicketService, githubService: TicketService): Promise<MigrationResult> {
    try {
      const localTickets = await localService.listTickets();
      
      if (localTickets.length === 0) {
        return {
          success: true,
          migratedCount: 0,
          failedCount: 0,
          errors: []
        };
      }
      
      let migratedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      for (const ticket of localTickets) {
        try {
          await githubService.createTicket(ticket.title, {
            priority: ticket.priority,
            labels: ticket.labels,
            description: ticket.description,
            assignee: ticket.assignee
          });
          migratedCount++;
        } catch (error: unknown) {
          failedCount++;
          errors.push(`Failed to migrate ticket ${ticket.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return {
        success: failedCount === 0,
        migratedCount,
        failedCount,
        errors
      };
    } catch (error: unknown) {
      return {
        success: false,
        migratedCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Get the next available GitHub issue number
   */
  async getNextAvailableGitHubId(githubService: TicketService): Promise<number> {
    try {
      const tickets = await githubService.listTickets();
      
      if (tickets.length === 0) {
        return 1;
      }
      
      const maxId = Math.max(...tickets.map(ticket => this.extractIdNumber(ticket.id)));
      return maxId + 1;
    } catch {
      return 1;
    }
  }

  /**
   * Extract numeric ID from ticket ID string
   */
  private extractIdNumber(id: string): number {
    // Handle both local format "0001" and GitHub format "#1"
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}