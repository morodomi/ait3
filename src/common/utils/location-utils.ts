import type { TicketService } from '../../services/interfaces/TicketService.js';
import type { Ticket } from '../types.js';
import { GitHubTicketService } from '../../services/implementations/GitHubTicketService.js';

/**
 * Check if service is GitHubTicketService
 */
export function isGitHubTicketService(service: TicketService): service is GitHubTicketService {
  return service instanceof GitHubTicketService || 
         (typeof (service as unknown as { getConfig?: () => unknown }).getConfig === 'function');
}

/**
 * Format ticket location display based on service type
 */
export function formatTicketLocation(ticket: Ticket, service: TicketService): string {
  if (isGitHubTicketService(service)) {
    const config = service.getConfig();
    const issueNumber = ticket.id.replace('#', '');
    return `https://github.com/${config.owner}/${config.repo}/issues/${issueNumber}`;
  }
  
  // Local backend - use existing location or generate default
  if (ticket.location?.path) {
    return ticket.location.path;
  }
  
  // Generate default local path
  const slugTitle = ticket.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `.tickets/${ticket.status}/${ticket.id}-${slugTitle}.md`;
}