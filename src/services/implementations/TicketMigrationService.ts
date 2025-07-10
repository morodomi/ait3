import type { MigrationService, ValidationResult, MigrationResult } from '../interfaces/MigrationService.js';
import type { TicketService } from '../interfaces/TicketService.js';

export class TicketMigrationService implements MigrationService {
  /**
   * Parse ticket filter string into array of local ticket IDs
   * Supports formats: "1,3,5", "1-10", "1,3-5"
   * Always returns local format: ["0001", "0003", "0005"]
   */
  parseTicketFilter(filter: string): string[] {
    const result: string[] = [];
    
    // Split by comma first
    const parts = filter.split(',').map(s => s.trim());
    
    for (const part of parts) {
      // Check if it's a range (contains '-')
      if (part.includes('-') && !part.startsWith('-')) {
        const [start, end] = part.split('-').map(s => s.trim());
        
        // Extract numbers
        const startNum = parseInt(start, 10);
        const endNum = parseInt(end, 10);
        
        if (isNaN(startNum) || isNaN(endNum)) {
          throw new Error(`Invalid range format: ${part}`);
        }
        
        if (startNum > endNum) {
          throw new Error(`Invalid range: start (${startNum}) must be <= end (${endNum})`);
        }
        
        // Generate range with local format (zero-padded)
        for (let i = startNum; i <= endNum; i++) {
          result.push(i.toString().padStart(4, '0'));
        }
      } else {
        // Single ID - convert to local format
        const num = parseInt(part, 10);
        if (isNaN(num)) {
          throw new Error(`Invalid ticket ID format: ${part}`);
        }
        result.push(num.toString().padStart(4, '0'));
      }
    }
    
    return result;
  }
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
  async migrateLocalToGitHub(localService: TicketService, githubService: TicketService, ticketFilter?: string[]): Promise<MigrationResult> {
    try {
      let ticketsToMigrate: string[] = [];
      
      if (ticketFilter && ticketFilter.length > 0) {
        // Use provided filter
        ticketsToMigrate = ticketFilter;
      } else {
        // Get all tickets
        const localTickets = await localService.listTickets();
        ticketsToMigrate = localTickets.map(t => t.id);
      }
      
      if (ticketsToMigrate.length === 0) {
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
      
      for (const ticketId of ticketsToMigrate) {
        try {
          // Get full ticket details including description
          const fullTicket = await localService.getTicket(ticketId);
          if (!fullTicket) {
            failedCount++;
            errors.push(`Failed to get full details for ticket ${ticketId}`);
            continue;
          }

          const createdTicket = await githubService.createTicket(fullTicket.title, {
            priority: fullTicket.priority,
            labels: fullTicket.labels,
            description: fullTicket.description,
            assignee: fullTicket.assignee
          });
          
          // Update status based on original ticket
          try {
            if (fullTicket.status === 'done') {
              await githubService.completeTicket(createdTicket.id);
            } else if (fullTicket.status === 'doing') {
              await githubService.startTicket(createdTicket.id);
            }
          } catch {
            // Status update failure should not fail the migration
            // The ticket was created successfully, just not in the right status
          }
          
          migratedCount++;
        } catch (error: unknown) {
          failedCount++;
          errors.push(`Failed to migrate ticket ${ticketId}: ${error instanceof Error ? error.message : String(error)}`);
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