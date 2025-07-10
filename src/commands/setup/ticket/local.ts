import type { CLIResult, Services } from '../../../common/types.js';
import { validateTicketsDirectory, readConfig, writeConfig, buildTicketNotice } from '../common/config-utils.js';

interface SetupOptions {
  force?: boolean;
}

export async function setupTicketLocal(
  options: SetupOptions,
  services: Services,
  context: { cwd: string }
): Promise<CLIResult> {
  // Check if .tickets directory exists
  const dirError = await validateTicketsDirectory(context.cwd);
  if (dirError) return dirError;

  // Read existing configuration
  const existingConfig = await readConfig(context.cwd);
  if (Object.keys(existingConfig).length === 0) {
    return {
      success: false,
      message: 'Failed to read configuration',
      data: {
        details: 'Configuration file may be missing or invalid'
      }
    };
  }

  // Check if already configured
  if (existingConfig.backend === 'local' && !options.force) {
    return {
      success: true,
      message: 'Already configured for local backend',
      data: {
        details: 'Use --force to reconfigure'
      }
    };
  }

  // Check for existing GitHub issues
  let ticketNotice = '';
  if (existingConfig.backend === 'github' && services.ticketService) {
    try {
      const tickets = await services.ticketService.listTickets();
      ticketNotice = buildTicketNotice(tickets?.length || 0, 'github');
    } catch {
      // Ignore errors when checking tickets
    }
  }

  // Update configuration to local
  const newConfig = {
    ...existingConfig,
    backend: 'local'
    // Preserve github config for potential switch back
  };

  await writeConfig(context.cwd, newConfig);

  return {
    success: true,
    message: 'Local ticket backend configured successfully',
    data: {
      details: `Tickets will be stored in: .tickets/${ticketNotice}`
    }
  };
}