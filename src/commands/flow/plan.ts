import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import chalk from 'chalk';

// Constants for consistent styling and messaging
const STYLES = {
  title: chalk.bold,
  feature: chalk.green,
  section: chalk.bold,
  command: chalk.cyan,
  option: chalk.cyan,
  info: chalk.blue,
  warning: chalk.yellow,
  error: chalk.red,
  dim: chalk.dim
} as const;

const MESSAGES = {
  FEATURE_REQUIRED: 'Feature name is required for planning phase',
  TICKET_NOT_FOUND: (id: string) => `Ticket #${id} not found`,
  PHILOSOPHY: 'Claude proposes → Gemini refutes → Human decides'
} as const;

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
    throw new ValidationError(MESSAGES.FEATURE_REQUIRED, 'featureName');
  }

  const { featureName, mode = 'guided', requirements, ticketId } = args;

  // Handle ticket reference if provided
  let ticketInfo = '';
  if (ticketId) {
    try {
      const ticket = await services.ticketService.getTicket(ticketId);
      if (ticket) {
        ticketInfo = `\n${STYLES.info('📋 Ticket #' + ticketId)}: ${ticket.title}`;
      } else {
        ticketInfo = `\n${STYLES.warning('⚠️  Warning')}: ${MESSAGES.TICKET_NOT_FOUND(ticketId)}`;
      }
    } catch (error) {
      ticketInfo = `\n${STYLES.warning('⚠️  Warning')}: ${MESSAGES.TICKET_NOT_FOUND(ticketId)}`;
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
    ? `\n${STYLES.command('📋 Requirements')}: ${requirements.join(', ')}`
    : '';

  return {
    success: true,
    message: `
${STYLES.title('🚀 Express Planning')} for "${STYLES.feature(featureName)}"${ticketInfo}${requirementsText}

${STYLES.section('📝 Quick Implementation Guide')}:
├─ Analyze existing codebase patterns
├─ Identify minimal viable implementation
├─ Follow pure function + service injection architecture
└─ Proceed to: ${STYLES.command('ait3 flow red')} for test creation

${STYLES.dim('💡 For detailed planning, use: ait3 flow plan "' + featureName + '" --mode guided')}
`
  };
}

function manualPlan(featureName: string, ticketInfo?: string): CLIResult {
  return {
    success: true,
    message: `
${STYLES.title('🎭 AIT³ Philosophy')} - Manual Planning for "${STYLES.feature(featureName)}"${ticketInfo}

${STYLES.section('🔄 Dialectical Process')}:
├─ ${STYLES.info('Claude proposes')} → Generate technical approach with clear rationale
├─ ${STYLES.error('Gemini refutes')} → Challenge assumptions and identify alternatives  
└─ ${STYLES.feature('Human decides')} → Synthesize evidence and make informed decisions

${STYLES.section('📋 Manual Planning Steps')}:
1. Define requirements and constraints
2. Research existing approaches and patterns
3. Consult: ${STYLES.command('gemini -p "@src/ @CLAUDE.md Critique approach for ' + featureName + '"')}
4. Document architectural decisions
5. Update ticket with reasoning

${STYLES.section('⚡ Next Phase')}: ${STYLES.command('ait3 flow red')} for test-driven implementation
`
  };
}

function guidedPlan(featureName: string, requirements?: string[], ticketInfo?: string): CLIResult {
  const requirementsSection = requirements?.length 
    ? `\n${STYLES.command('📋 Requirements')}: ${requirements.join(', ')}`
    : '';

  // Generate Claude's proposal based on feature name and requirements
  const proposal = generateClaudeProposal(featureName, requirements);
  
  // Prepare Gemini analysis command
  const geminiCommand = `gemini -p "@src/ @CLAUDE.md @.tickets/ Critique this approach for ${featureName}: ${proposal.summary}"`;

  return {
    success: true,
    message: `
${STYLES.title('🎭 AIT³ PLANNING Phase')} (guided mode) for "${STYLES.feature(featureName)}"${ticketInfo}${requirementsSection}

${STYLES.section('💡 Claude\'s Proposal')}:
${proposal.details}

${STYLES.section('🔍 Prepared Gemini Analysis')}:
${STYLES.command('$ ' + geminiCommand)}

${STYLES.section('❓ Choose next action')}:
${STYLES.option('[1]')} ✅ Accept proposal and update ticket
${STYLES.option('[2]')} 🔍 Run Gemini analysis (copy command to clipboard)
${STYLES.option('[3]')} ✏️  Refine proposal manually
${STYLES.option('[4]')} 💾 Save draft and continue later

${STYLES.dim('💡 Philosophy: ' + MESSAGES.PHILOSOPHY)}
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
      return `${prefix} ${STYLES.info(label)}: ${desc}`;
    })
    .join('\n');
}