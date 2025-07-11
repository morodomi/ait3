import type { TicketService } from '../../services/interfaces/TicketService.js';
import type { Ticket } from '../types.js';
import { GitHubTicketService } from '../../services/implementations/GitHubTicketService.js';

/**
 * Normalize ticket ID by removing # prefix
 */
function normalizeTicketId(ticketId: string): string {
  return ticketId.replace('#', '');
}

/**
 * Create slug from ticket title
 */
function createSlugTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate local ticket file path
 */
function generateLocalTicketPath(ticket: Ticket): string {
  if (ticket.location?.path) {
    return ticket.location.path;
  }
  
  const slugTitle = createSlugTitle(ticket.title);
  return `.tickets/${ticket.status}/${ticket.id}-${slugTitle}.md`;
}

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
    const issueNumber = normalizeTicketId(ticket.id);
    return `https://github.com/${config.owner}/${config.repo}/issues/${issueNumber}`;
  }
  
  return generateLocalTicketPath(ticket);
}

/**
 * Format ticket display for flow commands (enhanced version with description)
 */
export function formatTicketDisplay(ticket: Ticket, service: TicketService): string {
  if (isGitHubTicketService(service)) {
    const issueNumber = normalizeTicketId(ticket.id);
    const description = ticket.description || '(No description provided)';
    
    return `GitHub Issue #${issueNumber} (use: gh issue view ${issueNumber})
Description:
${description}

[操作: gh issue view ${issueNumber} | gh issue edit ${issueNumber}]`;
  }
  
  // Local backend - reuse the same logic as formatTicketLocation
  return generateLocalTicketPath(ticket);
}