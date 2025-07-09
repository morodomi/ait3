import type { MigrateArgs, Services, CLIResult } from '../../common/types.js';
import { TicketMigrationService } from '../../services/implementations/TicketMigrationService.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';
import { GitHubTicketService } from '../../services/implementations/GitHubTicketService.js';
import { ValidationError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';

export async function migrateCommand(
  args: MigrateArgs,
  services: Services
): Promise<CLIResult> {
  // Validate required arguments
  if (!args.from || !args.to) {
    return {
      success: false,
      message: STYLES.danger('ERROR: --from and --to flags are required')
    };
  }

  // Validate supported migration directions
  if (args.from === args.to) {
    return {
      success: false,
      message: STYLES.danger('ERROR: Source and target backends cannot be the same')
    };
  }

  if (args.to !== 'github' && args.to !== 'local') {
    return {
      success: false,
      message: STYLES.danger('ERROR: Unsupported migration direction. Only "local" and "github" are supported')
    };
  }

  // Validate GitHub configuration
  if (args.to === 'github' && (!args.owner || !args.repo)) {
    return {
      success: false,
      message: STYLES.danger('ERROR: GitHub owner and repo are required for GitHub migration')
    };
  }

  // Validate GitHub owner format
  if (args.owner && !/^[a-zA-Z0-9-]+$/.test(args.owner)) {
    return {
      success: false,
      message: STYLES.danger('ERROR: Invalid GitHub owner format. Use alphanumeric characters and hyphens only')
    };
  }

  try {
    // Create migration service
    const migrationService = new TicketMigrationService();
    
    // Create services based on migration direction
    const fromService = createServiceFromType(args.from, services, args);
    const toService = createServiceFromType(args.to, services, args);

    // Handle validation mode
    if (args.validate) {
      const validation = await migrationService.validateMigration(fromService, toService);
      
      if (!validation.success) {
        const messageParts = [
          STYLES.danger('Validation failed'),
          '',
          ...validation.conflicts.map(c => STYLES.danger(`  • ${c}`)),
          ...validation.errors.map(e => STYLES.danger(`  • ${e}`))
        ];
        
        return {
          success: false,
          message: messageParts.join('\n')
        };
      }
      
      const messageParts = [
        STYLES.success('Validation completed'),
        '',
        ...validation.warnings.map(w => STYLES.warning(`  • ${w}`))
      ];
      
      return {
        success: true,
        message: messageParts.join('\n')
      };
    }

    // Handle dry run mode
    if (args.dryRun) {
      const validation = await migrationService.validateMigration(fromService, toService);
      const fromTickets = await fromService.listTickets();
      
      const messageParts = [
        STYLES.success('Dry run completed'),
        '',
        STYLES.info(`${fromTickets.length} tickets will be migrated`),
        '',
        ...fromTickets.map(ticket => `  • ${ticket.title}`),
        '',
        ...validation.warnings.map(w => STYLES.warning(`  • ${w}`))
      ];
      
      return {
        success: true,
        message: messageParts.join('\n')
      };
    }

    // Perform actual migration
    if (args.from === 'local' && args.to === 'github') {
      const result = await migrationService.migrateLocalToGitHub(fromService, toService);
      
      if (result.success) {
        return {
          success: true,
          message: STYLES.success(`Migration completed successfully. ${result.migratedCount} tickets migrated.`)
        };
      } else {
        const messageParts = [
          result.migratedCount > 0 
            ? STYLES.warning(`Migration completed with errors. ${result.migratedCount} tickets migrated, ${result.failedCount} tickets failed.`)
            : STYLES.danger('Migration failed'),
          '',
          ...result.errors.map(e => STYLES.danger(`  • ${e}`))
        ];
        
        return {
          success: false,
          message: messageParts.join('\n')
        };
      }
    }

    return {
      success: false,
      message: STYLES.danger('ERROR: Migration direction not implemented yet')
    };

  } catch (error) {
    if (error instanceof Error && error.message.includes('GitHub service creation failed')) {
      return {
        success: false,
        message: STYLES.danger('ERROR: Failed to create GitHub service. Check your configuration.')
      };
    }
    
    return {
      success: false,
      message: STYLES.danger(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
    };
  }
}

/**
 * Create appropriate service based on type
 */
function createServiceFromType(
  type: 'local' | 'github',
  services: Services,
  args: MigrateArgs
) {
  if (type === 'local') {
    return services.ticketService; // Use existing local service
  }
  
  if (type === 'github') {
    if (!args.owner || !args.repo) {
      throw new Error('GitHub owner and repo are required');
    }
    
    return new GitHubTicketService({
      owner: args.owner,
      repo: args.repo
    });
  }
  
  throw new Error(`Unsupported service type: ${type}`);
}