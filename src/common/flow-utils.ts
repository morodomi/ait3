import { SlugUtils } from './utils.js';
import { STYLES } from './styles.js';
import { Services, Ticket } from './types.js';
import { TicketNotFoundError, ValidationError } from './errors.js';
import { FLOW_MESSAGES } from './flow-messages.js';
import { formatTicketDisplay } from './utils/location-utils.js';

/**
 * Common utilities for flow commands to reduce code duplication
 */

export type TicketStatus = 'todo' | 'doing' | 'done';
export type FlowPhase = 'planning' | 'test' | 'feat' | 'refactor';

/**
 * Generate ticket file location based on status and ticket info
 * For local tickets: returns file path
 * For GitHub tickets: returns URL
 */
export function getTicketLocation(ticketId: string, title: string, status: TicketStatus = 'doing', ticket?: Ticket): string {
  // If we have a ticket object with location, use that
  if (ticket?.location) {
    return ticket.location.path || ticket.location.url || '';
  }
  
  // Otherwise, generate local path (backward compatibility)
  // Normalize ticket ID to remove # prefix for GitHub IDs
  const normalizedId = ticketId.replace(/^#/, '');
  const ticketSlug = SlugUtils.titleToSlug(title);
  return `.tickets/${status}/${normalizedId}-${ticketSlug}.md`;
}

/**
 * Generate git commit message for flow phases
 */
export function generateCommitMessage(phase: FlowPhase, ticketId: string, title: string): string {
  const lowerTitle = title.toLowerCase();
  
  switch (phase) {
  case 'planning':
    return `planning(#${ticketId}): ${lowerTitle} design`;
  case 'test':
    return `test(#${ticketId}): comprehensive test suite for ${lowerTitle}`;
  case 'feat':
    return `feat(#${ticketId}): implement ${lowerTitle}`;
  case 'refactor':
    return `refactor(#${ticketId}): optimize ${lowerTitle} implementation`;
  default:
    return `${phase}(#${ticketId}): ${lowerTitle}`;
  }
}

/**
 * Generate formatted ticket location header for flow commands
 */
export function formatTicketHeader(ticketId: string, title: string, phase: string, ticket?: Ticket, services?: Services): string {
  let locationDisplay = '';
  if (ticket && services) {
    locationDisplay = formatTicketDisplay(ticket, services.ticketService);
  } else {
    // Fallback to old behavior
    locationDisplay = getTicketLocation(ticketId, title, 'doing');
  }
  return `${STYLES.bold(phase)} for Ticket #${ticketId}: ${title}\n${STYLES.info('LOCATION')}: ${STYLES.info(locationDisplay)}`;
}

/**
 * Generate commit action for Next Action sections
 */
export function formatCommitAction(phase: FlowPhase, ticketId: string, title: string): string {
  const commitMessage = generateCommitMessage(phase, ticketId, title);
  return `└─ Commit ${phase}:\n   └─ ${STYLES.code(`git commit -m "${commitMessage}"`)}`;
}

/**
 * Get a ticket by ID or throw TicketNotFoundError
 */
export async function getTicketOrThrow(
  ticketId: string,
  services: Services
): Promise<Ticket> {
  try {
    const ticket = await services.ticketService.getTicket(ticketId);
    if (!ticket) {
      throw new TicketNotFoundError(ticketId);
    }
    return ticket;
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      throw error;
    }
    throw new TicketNotFoundError(ticketId);
  }
}

/**
 * Validate that a ticket is not completed
 */
export function validateNotCompleted(ticket: Ticket): void {
  if (ticket.status === 'done') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ALREADY_COMPLETED(ticket.id));
  }
}

/**
 * Validate that a ticket is in progress
 */
export function validateInProgress(ticket: Ticket): void {
  if (ticket.status !== 'doing') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_NOT_IN_PROGRESS(ticket.id));
  }
}

/**
 * Validate that a ticket is in progress and not completed
 */
export function validateTicketForFlow(ticket: Ticket): void {
  validateNotCompleted(ticket);
  validateInProgress(ticket);
}