import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import { FLOW_STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { SlugUtils } from '../../common/utils.js';
import { getTicketLocation, generateCommitMessage, formatTicketHeader } from '../../common/flow-utils.js';

export interface PlanArgs {
  featureName?: string;
  mode?: 'guided' | 'express' | 'manual';
  requirements?: string[];
  ticketId?: string;
}

export async function planPhase(
  args: PlanArgs,
  services: Services
): Promise<CLIResult> {
  // Validate feature name
  if (!args.featureName) {
    throw new ValidationError(FLOW_MESSAGES.FEATURE_REQUIRED, 'featureName');
  }

  const { featureName, mode = 'guided', requirements, ticketId } = args;

  // Handle ticket reference if provided
  let ticketInfo = '';
  if (ticketId) {
    try {
      const ticket = await services.ticketService.getTicket(ticketId);
      if (ticket) {
        ticketInfo = `\n${FLOW_STYLES.info('📋 Ticket #' + ticketId)}: ${ticket.title}`;
      } else {
        ticketInfo = `\n${FLOW_STYLES.warning('⚠️  Warning')}: ${FLOW_MESSAGES.TICKET_NOT_FOUND(ticketId)}`;
      }
    } catch (error) {
      ticketInfo = `\n${FLOW_STYLES.warning('⚠️  Warning')}: ${FLOW_MESSAGES.TICKET_NOT_FOUND(ticketId)}`;
    }
  }

  switch (mode) {
    case 'express':
      return expressPlan(featureName, requirements, ticketInfo);
    case 'manual':
      return manualPlan(featureName, ticketInfo);
    case 'guided':
    default:
      return guidedPlan(featureName, requirements, ticketInfo);
  }
}

function expressPlan(featureName: string, requirements?: string[], ticketInfo?: string): CLIResult {
  const requirementsText = requirements?.length 
    ? `\n${FLOW_STYLES.command('📋 Requirements')}: ${requirements.join(', ')}`
    : '';

  // Find ticket ID from ticketInfo if available
  const ticketIdMatch = ticketInfo?.match(/#(\d+)/);
  const ticketId = ticketIdMatch ? ticketIdMatch[1] : '001';
  const ticketLocation = getTicketLocation(ticketId, featureName, 'doing');

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, featureName, '🎭 PLANNING Phase (Express)')}${requirementsText}

${FLOW_STYLES.section('🧠 Claude Code Quick Analysis')}:
1. Read ticket: ${FLOW_STYLES.path(ticketLocation)}
2. Analyze existing patterns in codebase
3. Propose minimal viable implementation
4. Skip Gemini analysis (express mode)

${FLOW_STYLES.info('Next Action')}:
├─ Quick analysis:
│  └─ Read ${FLOW_STYLES.path(ticketLocation)}
├─ Rapid proposal:
│  └─ Minimal viable approach
└─ Fast commit:
   └─ ${FLOW_STYLES.code(`git commit -m "${generateCommitMessage('planning', ticketId, featureName)}"`)}

${FLOW_STYLES.dim('Express mode: ait3 flow red after quick approval')}
`
  };
}

function manualPlan(featureName: string, ticketInfo?: string): CLIResult {
  // Find ticket ID from ticketInfo if available
  const ticketIdMatch = ticketInfo?.match(/#(\d+)/);
  const ticketId = ticketIdMatch ? ticketIdMatch[1] : '001';
  const ticketLocation = getTicketLocation(ticketId, featureName, 'doing');

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, featureName, '🎭 PLANNING Phase (Manual)')}

${FLOW_STYLES.section('🔄 Dialectical Process')}:
├─ ${FLOW_STYLES.info('Claude proposes')} → Generate technical approach with clear rationale
├─ ${FLOW_STYLES.error('Gemini refutes')} → Challenge assumptions and identify alternatives  
└─ ${FLOW_STYLES.feature('Human decides')} → Synthesize evidence and make informed decisions

${FLOW_STYLES.section('📋 Manual Planning Steps')}:
1. Read ticket: ${FLOW_STYLES.path(ticketLocation)}
2. Research existing approaches and patterns
3. Consult: ${FLOW_STYLES.command(`gemini -p "@src/ @CLAUDE.md @.tickets/doing/${ticketId}-*.md Critique approach"`)}
4. Document architectural decisions
5. Update ticket with reasoning

${FLOW_STYLES.info('Next Action')}:
├─ Research approaches:
│  └─ Investigate existing patterns
├─ Create proposal:
│  └─ Document design decisions
├─ Get dialectical critique:
│  └─ ${FLOW_STYLES.code(`gemini -p "@src/ @CLAUDE.md Critique"`)}
├─ Synthesize decision:
│  └─ Weigh arguments and choose
└─ Document reasoning:
   └─ ${FLOW_STYLES.code(`git commit -m "${generateCommitMessage('planning', ticketId, featureName)}"`)}

${FLOW_STYLES.dim('Manual mode: Proceed to ait3 flow red after decision')}
`
  };
}

function guidedPlan(featureName: string, requirements?: string[], ticketInfo?: string): CLIResult {
  const requirementsSection = requirements?.length 
    ? `\n${FLOW_STYLES.command('📋 Requirements')}: ${requirements.join(', ')}`
    : '';

  // Find ticket ID from ticketInfo if available
  const ticketIdMatch = ticketInfo?.match(/#(\d+)/);
  const ticketId = ticketIdMatch ? ticketIdMatch[1] : '001';
  const ticketLocation = getTicketLocation(ticketId, featureName, 'doing');

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, featureName, '🎭 PLANNING Phase')}${requirementsSection}

${FLOW_STYLES.section('🧠 Claude Code Instructions')}:
1. Read ticket: ${FLOW_STYLES.path(ticketLocation)}
2. Analyze and propose:
   ├─ Purpose & Goals
   ├─ Implementation approach
   ├─ Test scenarios
   ├─ Edge cases
   ├─ Technical considerations
   └─ Dependencies & Integration points

3. (Optional) Gemini analysis:
   ${FLOW_STYLES.command(`$ gemini -p "@src/ @CLAUDE.md @.tickets/doing/${ticketId}-*.md Critique this approach"`)}
   ${FLOW_STYLES.dim('Note: @src/ includes relevant source files. For full codebase use @./')}

4. Present proposal for human decision

${FLOW_STYLES.info('Next Action')}:
├─ Analyze ticket:
│  └─ Read ${FLOW_STYLES.path(ticketLocation)}
├─ Research codebase:
│  └─ Understand existing patterns
├─ Propose approach:
│  └─ Document technical design
├─ Validate with Gemini (optional):
│  └─ ${FLOW_STYLES.code(`gemini -p "@src/ Critique approach"`)}
└─ Commit design:
   └─ ${FLOW_STYLES.code(`git commit -m "${generateCommitMessage('planning', ticketId, featureName)}"`)}

${FLOW_STYLES.dim('After approval: ait3 flow red')}
`
  };
}

interface ProposalTemplate {
  summary: string;
  details: string;
}

function generateClaudeProposal(featureName: string, requirements?: string[]): ProposalTemplate {
  // Pattern matching for intelligent proposal generation
  const lowerFeature = featureName.toLowerCase();
  const lowerReqs = requirements?.map(r => r.toLowerCase()) || [];
  
  const patterns = {
    isAuth: lowerFeature.includes('auth') || lowerReqs.includes('security') || lowerReqs.includes('oauth'),
    isUser: lowerFeature.includes('user'),
    isAPI: lowerFeature.includes('api')
  };

  const proposalTemplates: Record<string, ProposalTemplate> = {
    auth: {
      summary: "JWT-based authentication with OAuth2 integration",
      details: formatProposalDetails([
        ['Architecture', 'JWT token-based authentication'],
        ['OAuth Integration', 'Google, GitHub providers via Passport.js'],
        ['Session Management', 'Secure httpOnly cookies with CSRF protection'],
        ['Security', 'Rate limiting, refresh token rotation'],
        ['Storage', 'Redis session store for scalability']
      ])
    },
    user: {
      summary: "CRUD user management with validation",
      details: formatProposalDetails([
        ['Data Layer', 'User model with Zod validation'],
        ['API Design', 'RESTful endpoints (/users CRUD)'],
        ['Validation', 'Email format, password strength, unique constraints'],
        ['Security', 'Input sanitization, SQL injection protection'],
        ['Testing', 'Comprehensive unit and integration tests']
      ])
    },
    api: {
      summary: "RESTful API with Express.js and TypeScript",
      details: formatProposalDetails([
        ['Framework', 'Express.js with TypeScript strict mode'],
        ['Architecture', 'Controller → Service → Repository pattern'],
        ['Validation', 'Zod schema validation for requests'],
        ['Error Handling', 'Centralized error middleware'],
        ['Documentation', 'OpenAPI/Swagger integration']
      ])
    },
    default: {
      summary: "Pure function implementation with service injection",
      details: formatProposalDetails([
        ['Architecture', 'Pure functions following existing patterns'],
        ['Service Layer', 'Dependency injection for testability'],
        ['Error Handling', 'Custom error classes with proper typing'],
        ['Testing', 'Unit tests with isolated service mocks'],
        ['Integration', 'Commander.js CLI integration']
      ])
    }
  };

  if (patterns.isAuth) return proposalTemplates.auth;
  if (patterns.isUser) return proposalTemplates.user;
  if (patterns.isAPI) return proposalTemplates.api;
  return proposalTemplates.default;
}

function formatProposalDetails(items: [string, string][]): string {
  return items
    .map(([label, desc], index, array) => {
      const prefix = index === array.length - 1 ? '└─' : '├─';
      return `${prefix} ${FLOW_STYLES.info(label)}: ${desc}`;
    })
    .join('\n');
}