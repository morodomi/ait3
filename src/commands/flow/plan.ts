import type { Services, CLIResult, Ticket } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';
import { IDUtils } from '../../common/utils.js';
import { getTicketLocation, generateCommitMessage, formatTicketHeader } from '../../common/flow-utils.js';

const INVALID_TICKET_ID_MESSAGE = 'Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)';

/**
 * Convert ticket title to kebab-case feature name
 */
function titleToFeatureName(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-');
}

export interface PlanArgs {
  ticketId: string;
  mode?: 'guided' | 'express' | 'manual';
  requirements?: string[];
}

export async function planPhase(
  args: PlanArgs,
  services: Services
): Promise<CLIResult> {
  const { ticketId, mode = 'guided', requirements } = args;
  
  // Validate ticket ID format
  if (!IDUtils.isValidTicketId(ticketId)) {
    throw new ValidationError(INVALID_TICKET_ID_MESSAGE, 'ticketId');
  }
  
  // Fetch ticket to get feature name
  const ticket = await services.ticketService.getTicket(ticketId);
  if (!ticket) {
    throw new TicketNotFoundError(ticketId);
  }
  
  // Use ticket title as feature name
  const featureName = titleToFeatureName(ticket.title);

  // Create ticket info for display
  const ticketInfo = `\n${STYLES.info('LIST: Ticket #' + ticketId)}: ${ticket.title}`;

  switch (mode) {
  case 'express':
    return expressPlan(ticketId, featureName, ticket, requirements, ticketInfo);
  case 'manual':
    return manualPlan(ticketId, featureName, ticket, ticketInfo);
  case 'guided':
  default:
    return guidedPlan(ticketId, featureName, ticket, requirements, ticketInfo);
  }
}

function expressPlan(ticketId: string, featureName: string, ticket: Ticket, requirements?: string[], _ticketInfo?: string): CLIResult {
  const requirementsText = requirements?.length 
    ? `\n${STYLES.info('LIST: Requirements')}: ${requirements.join(', ')}`
    : '';
  const ticketLocation = getTicketLocation(ticketId, featureName, 'doing', ticket);

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, featureName, 'PLANNING Phase (Express)')}${requirementsText}

${STYLES.bold('BRAIN: Claude Code Quick Analysis')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Analyze existing patterns in codebase
3. Propose minimal viable implementation
4. Skip Gemini analysis (express mode)

${STYLES.info('Next Action')}:
├─ Quick analysis:
│  └─ Read ${STYLES.info(ticketLocation)}
├─ Rapid proposal:
│  └─ Minimal viable approach
└─ Fast commit:
   └─ ${STYLES.code(`git commit -m "${generateCommitMessage('planning', ticketId, featureName)}"`)}

${STYLES.muted('Express mode: ait3 flow red after quick approval')}
`
  };
}

function manualPlan(ticketId: string, featureName: string, ticket: Ticket, _ticketInfo?: string): CLIResult {
  const ticketLocation = getTicketLocation(ticketId, featureName, 'doing', ticket);

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, featureName, 'PLANNING Phase (Manual)')}

${STYLES.bold('CYCLE: Dialectical Process')}:
├─ ${STYLES.info('Claude proposes')} → Generate technical approach with clear rationale
├─ ${STYLES.danger('Gemini refutes')} → Challenge assumptions and identify alternatives  
└─ ${STYLES.success('Human decides')} → Synthesize evidence and make informed decisions

${STYLES.bold('LIST: Manual Planning Steps')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Research existing approaches and patterns
3. Consult: ${STYLES.info(`gemini -p "@src/ @CLAUDE.md @.tickets/doing/${ticketId}-*.md Critique approach"`)}
4. Document architectural decisions
5. Update ticket with reasoning

${STYLES.info('Next Action')}:
├─ Research approaches:
│  └─ Investigate existing patterns
├─ Create proposal:
│  └─ Document design decisions
├─ Get dialectical critique:
│  └─ ${STYLES.code('gemini -p "@src/ @CLAUDE.md Critique"')}
├─ Synthesize decision:
│  └─ Weigh arguments and choose
└─ Document reasoning:
   └─ ${STYLES.code(`git commit -m "${generateCommitMessage('planning', ticketId, featureName)}"`)}

${STYLES.muted('Manual mode: Proceed to ait3 flow red after decision')}
`
  };
}

function guidedPlan(ticketId: string, featureName: string, ticket: Ticket, requirements?: string[], _ticketInfo?: string): CLIResult {
  const requirementsSection = requirements?.length 
    ? `\n${STYLES.info('LIST: Requirements')}: ${requirements.join(', ')}`
    : '';
  const ticketLocation = getTicketLocation(ticketId, featureName, 'doing', ticket);

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, featureName, 'PLANNING Phase')}${requirementsSection}

${STYLES.bold('Claude Code Instructions')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Analyze and propose:
   ├─ Purpose & Goals
   ├─ Implementation approach
   ├─ Test scenarios
   ├─ Edge cases
   ├─ Technical considerations
   └─ Dependencies & Integration points

3. (Optional) Gemini analysis:
   ${STYLES.info(`$ gemini -p "@src/ @CLAUDE.md @.tickets/doing/${ticketId}-*.md Critique this approach"`)}
   ${STYLES.muted('Note: @src/ includes relevant source files. For full codebase use @./')}

4. Present proposal for human decision

${STYLES.info('Next Action')}:
├─ Analyze ticket:
│  └─ Read ${STYLES.info(ticketLocation)}
├─ Research codebase:
│  └─ Understand existing patterns
├─ Propose approach:
│  └─ Document technical design
├─ Validate with Gemini (optional):
│  └─ ${STYLES.code('gemini -p "@src/ Critique approach"')}
└─ Commit design:
   └─ ${STYLES.code(`git commit -m "${generateCommitMessage('planning', ticketId, featureName)}"`)}

${STYLES.muted('After approval: ait3 flow red')}
`
  };
}

