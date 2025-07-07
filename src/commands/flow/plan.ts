import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import { FLOW_STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';

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

  return {
    success: true,
    message: `
${FLOW_STYLES.title('🚀 Express Planning')} for "${FLOW_STYLES.feature(featureName)}"${ticketInfo}${requirementsText}

${FLOW_STYLES.section('📝 Quick Implementation Guide')}:
├─ Analyze existing codebase patterns
├─ Identify minimal viable implementation
├─ Follow pure function + service injection architecture
└─ Proceed to: ${FLOW_STYLES.command('ait3 flow red')} for test creation

${FLOW_STYLES.dim('💡 For detailed planning, use: ait3 flow plan "' + featureName + '" --mode guided')}
`
  };
}

function manualPlan(featureName: string, ticketInfo?: string): CLIResult {
  return {
    success: true,
    message: `
${FLOW_STYLES.title('🎭 AIT³ Philosophy')} - Manual Planning for "${FLOW_STYLES.feature(featureName)}"${ticketInfo}

${FLOW_STYLES.section('🔄 Dialectical Process')}:
├─ ${FLOW_STYLES.info('Claude proposes')} → Generate technical approach with clear rationale
├─ ${FLOW_STYLES.error('Gemini refutes')} → Challenge assumptions and identify alternatives  
└─ ${FLOW_STYLES.feature('Human decides')} → Synthesize evidence and make informed decisions

${FLOW_STYLES.section('📋 Manual Planning Steps')}:
1. Define requirements and constraints
2. Research existing approaches and patterns
3. Consult: ${FLOW_STYLES.command('gemini -p "@src/ @CLAUDE.md Critique approach for ' + featureName + '"')}
4. Document architectural decisions
5. Update ticket with reasoning

${FLOW_STYLES.section('⚡ Next Phase')}: ${FLOW_STYLES.command('ait3 flow red')} for test-driven implementation
`
  };
}

function guidedPlan(featureName: string, requirements?: string[], ticketInfo?: string): CLIResult {
  const requirementsSection = requirements?.length 
    ? `\n${FLOW_STYLES.command('📋 Requirements')}: ${requirements.join(', ')}`
    : '';

  // Generate Claude's proposal based on feature name and requirements
  const proposal = generateClaudeProposal(featureName, requirements);
  
  // Prepare Gemini analysis command
  const geminiCommand = `gemini -p "@src/ @CLAUDE.md @.tickets/ Critique this approach for ${featureName}: ${proposal.summary}"`;

  return {
    success: true,
    message: `
${FLOW_STYLES.title('🎭 AIT³ PLANNING Phase')} (guided mode) for "${FLOW_STYLES.feature(featureName)}"${ticketInfo}${requirementsSection}

${FLOW_STYLES.section('💡 Claude\'s Proposal')}:
${proposal.details}

${FLOW_STYLES.section('🔍 Prepared Gemini Analysis')}:
${FLOW_STYLES.command('$ ' + geminiCommand)}

${FLOW_STYLES.section('❓ Choose next action')}:
${FLOW_STYLES.option('[1]')} ✅ Accept proposal and update ticket
${FLOW_STYLES.option('[2]')} 🔍 Run Gemini analysis (copy command to clipboard)
${FLOW_STYLES.option('[3]')} ✏️  Refine proposal manually
${FLOW_STYLES.option('[4]')} 💾 Save draft and continue later

${FLOW_STYLES.dim('💡 Philosophy: ' + FLOW_MESSAGES.PHILOSOPHY)}
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