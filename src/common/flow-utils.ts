import { SlugUtils } from './utils.js';
import { FLOW_STYLES } from './styles.js';

/**
 * Common utilities for flow commands to reduce code duplication
 */

export type TicketStatus = 'todo' | 'doing' | 'done';
export type FlowPhase = 'planning' | 'test' | 'feat' | 'refactor';

/**
 * Generate ticket file location based on status and ticket info
 */
export function getTicketLocation(ticketId: string, title: string, status: TicketStatus = 'doing'): string {
  const ticketSlug = SlugUtils.titleToSlug(title);
  return `.tickets/${status}/${ticketId}-${ticketSlug}.md`;
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
export function formatTicketHeader(ticketId: string, title: string, phase: string, status: TicketStatus = 'doing'): string {
  const ticketLocation = getTicketLocation(ticketId, title, status);
  return `${FLOW_STYLES.title(phase)} for Ticket #${ticketId}: ${title}\n${FLOW_STYLES.info('Location')}: ${FLOW_STYLES.path(ticketLocation)}`;
}

/**
 * Generate commit action for Next Action sections
 */
export function formatCommitAction(phase: FlowPhase, ticketId: string, title: string): string {
  const commitMessage = generateCommitMessage(phase, ticketId, title);
  return `└─ Commit ${phase}:\n   └─ ${FLOW_STYLES.code(`git commit -m "${commitMessage}"`)}`;
}