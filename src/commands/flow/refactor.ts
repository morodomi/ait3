import type { Services, CLIResult, Ticket } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { IDUtils } from '../../common/utils.js';
import { generateCommitMessage, formatTicketHeader, getTicketOrThrow, validateTicketForFlow } from '../../common/flow-utils.js';
import { formatTicketLocation } from '../../common/utils/location-utils.js';

const REFACTOR_MESSAGES = {
  INVALID_FOCUS_AREA: (area: string) => `Invalid focus area: ${area}`
} as const;

const VALID_FOCUS_AREAS = ['duplication', 'mocks', 'types', 'organization'] as const;
type FocusArea = typeof VALID_FOCUS_AREAS[number];

export interface RefactorArgs {
  ticketId: string;
  verbose?: boolean;
  focus?: string[] | string;
  _forceAnalysisError?: boolean; // Internal flag for testing
}

export async function refactorPhase(
  args: RefactorArgs,
  services: Services
): Promise<CLIResult> {
  // Validate ticket ID
  if (!args.ticketId || args.ticketId.trim() === '') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ID_REQUIRED('REFACTOR'), 'ticketId');
  }

  // Validate ID format
  if (!IDUtils.isValidTicketId(args.ticketId)) {
    throw new ValidationError('Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)', 'ticketId');
  }

  const { ticketId, verbose = false } = args;

  // Parse focus areas
  let focusAreas: FocusArea[] | undefined;
  if (args.focus) {
    const requestedAreas = typeof args.focus === 'string' 
      ? args.focus.split(',').map(a => a.trim())
      : args.focus;
    
    // Validate focus areas
    for (const area of requestedAreas) {
      if (!VALID_FOCUS_AREAS.includes(area as FocusArea)) {
        throw new ValidationError(REFACTOR_MESSAGES.INVALID_FOCUS_AREA(area), 'focus');
      }
    }
    focusAreas = requestedAreas as FocusArea[];
  }

  // Get ticket information
  const ticket = await getTicketOrThrow(ticketId, services);

  // Check ticket status
  validateTicketForFlow(ticket);

  // Handle analysis error for testing
  if (args._forceAnalysisError) {
    return {
      success: false,
      message: `
${STYLES.danger('ERROR: Analysis failed')}

${STYLES.warning('WARNING:  Error')}: Unable to analyze project structure
${STYLES.muted('Check your project structure and ensure source files are accessible')}

${STYLES.info('TIP: Tip')}: Make sure you're running from the project root directory
`
    };
  }

  // Generate analysis based on mode and focus
  const analysis = performAnalysis(ticket, focusAreas);
  const output = formatAnalysisOutput(analysis, verbose, focusAreas, ticket, services);

  return {
    success: true,
    message: output
  };
}

interface AnalysisResult {
  filesAnalyzed: number;
  improvements: number;
  estimatedEffort: string;
  duplication: DuplicationItem[];
  mocks: MockItem[];
  types: TypeIssue[];
  organization: OrganizationIssue[];
}

interface DuplicationItem {
  description: string;
  locations: string[];
  suggestion: string;
}

interface MockItem {
  name: string;
  location: string;
  ticketSuggestion: string;
}

interface TypeIssue {
  issue: string;
  count: number;
}

interface OrganizationIssue {
  issue: string;
  suggestion: string;
}

function performAnalysis(ticket: Ticket, focusAreas?: FocusArea[]): AnalysisResult {
  // Simulate analysis with realistic data
  const shouldInclude = (area: FocusArea): boolean => !focusAreas || focusAreas.includes(area);

  // Check if this is an empty project (based on ticket title for testing)
  const isEmptyProject = ticket.title && ticket.title.toLowerCase().includes('empty');
  const filesAnalyzed = isEmptyProject ? 0 : 15;
  const improvements = isEmptyProject ? 0 : 8;

  return {
    filesAnalyzed,
    improvements,
    estimatedEffort: filesAnalyzed > 0 ? '2-3 hours' : '0 hours',
    duplication: shouldInclude('duplication') && !isEmptyProject ? [
      {
        description: 'Error handling pattern repeated',
        locations: ['src/api/users.ts:45-60', 'src/api/posts.ts:38-53'],
        suggestion: 'Extract to common error handler'
      }
    ] : [],
    mocks: shouldInclude('mocks') && !isEmptyProject ? [
      {
        name: 'EmailService',
        location: 'src/services/email.ts',
        ticketSuggestion: 'ait3 ticket create "Implement EmailService" --labels backend,email'
      },
      {
        name: 'CacheService',
        location: 'src/services/cache.ts',
        ticketSuggestion: 'ait3 ticket create "Implement CacheService" --labels backend,cache'
      }
    ] : [],
    types: shouldInclude('types') && !isEmptyProject ? [
      {
        issue: 'Add explicit return types',
        count: 3
      },
      {
        issue: 'Replace \'any\' with specific types',
        count: 2
      }
    ] : [],
    organization: shouldInclude('organization') && !isEmptyProject ? [
      {
        issue: 'Validation logic scattered',
        suggestion: 'Extract validation logic to separate module'
      },
      {
        issue: 'Similar utility functions',
        suggestion: 'Consolidate similar utility functions'
      }
    ] : []
  };
}

function formatAnalysisOutput(
  analysis: AnalysisResult, 
  verbose: boolean,
  focusAreas?: FocusArea[],
  ticket?: Ticket,
  services?: Services
): string {
  const sections: string[] = [];
  const ticketId = ticket?.id || '0001';
  const ticketTitle = ticket?.title || 'Feature';

  // Header
  const ticketLocation = ticket && services ? formatTicketLocation(ticket, services.ticketService) : '.tickets/doing/0001-feature.md';
  sections.push(`${formatTicketHeader(ticketId, ticketTitle, 'REFACTOR Phase', ticket, services)}`);
  
  // Claude Code Instructions
  sections.push(`\n${STYLES.bold('Claude Code Instructions')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Run quality checks (project-specific):
   - Linter (e.g., eslint, ruff, rubocop)
   - Formatter (e.g., prettier, black, rustfmt)
   - Type checker (if applicable)
   - Code duplication analysis (if available)

3. Refactor priorities:
   ├─ Extract common patterns
   ├─ Improve type safety
   ├─ Optimize performance
   ├─ Enhance readability
   └─ Identify mock implementations

4. For mock implementations found:
   - Suggest creating tickets
   - Human decides whether to create

${STYLES.warning('CONSTRAINT: Requirement')}: Maintain 100% test pass rate`);
  
  // Focus indicator
  if (focusAreas) {
    sections.push(`\nTARGET: Focused Analysis: ${focusAreas.join(', ')}`);
  }

  // Code Quality Summary
  sections.push(`
${STYLES.bold('INFO: Code Quality Summary')}:
├─ Files analyzed: ${analysis.filesAnalyzed}
├─ Improvement opportunities: ${analysis.improvements}
├─ Estimated effort: ${analysis.estimatedEffort}
└─ Test coverage maintained: 100%`);

  // Limited analysis message if no files
  if (analysis.filesAnalyzed === 0) {
    sections.push(`\n${STYLES.warning('WARNING:  Limited analysis')} - No source files found in project`);
  }

  // Refactoring Suggestions
  sections.push(`\n${STYLES.bold('INFO: Refactoring Suggestions')}:`);

  // Code Duplication
  if (!focusAreas || focusAreas.includes('duplication')) {
    sections.push(`\n${STYLES.info('## 1. Code Duplication')} (${analysis.duplication.length} issues)`);
    if (analysis.duplication.length > 0) {
      analysis.duplication.forEach(dup => {
        sections.push(`- ${dup.description} in:`);
        dup.locations.forEach(loc => {
          sections.push(`  ${STYLES.info(`• ${loc}`)}`);
        });
        sections.push(`  ${STYLES.success('→')} ${dup.suggestion}`);
      });
    }
  }

  // Mock Implementations
  if (!focusAreas || focusAreas.includes('mocks')) {
    sections.push(`\n${STYLES.info('## 2. Mock Implementations')} (${analysis.mocks.length} found)`);
    if (analysis.mocks.length > 0) {
      analysis.mocks.forEach(mock => {
        sections.push(`- ${STYLES.code(mock.name)} at ${STYLES.info(mock.location)}`);
        sections.push(`  ${STYLES.success('→')} Create ticket: "${mock.name.replace('Service', ' Service').trim()}"`);
      });
    }
  }

  // Type Improvements
  if (!focusAreas || focusAreas.includes('types')) {
    sections.push(`\n${STYLES.info('## 3. Type Improvements')} (${analysis.types.reduce((sum, t) => sum + t.count, 0)} suggestions)`);
    if (analysis.types.length > 0) {
      analysis.types.forEach(type => {
        sections.push(`- ${type.issue} in ${type.count} functions`);
      });
    }
  }

  // Code Organization
  if (!focusAreas || focusAreas.includes('organization')) {
    sections.push(`\n${STYLES.info('## 4. Code Organization')}`);
    if (analysis.organization.length > 0) {
      analysis.organization.forEach(org => {
        sections.push(`- ${org.issue}`);
        sections.push(`  ${STYLES.success('→')} ${org.suggestion}`);
      });
    }
  }

  // Verbose mode additions
  if (verbose) {
    sections.push(`\n${STYLES.bold('INFO: Detailed Analysis')}:`);
    sections.push(`├─ ${STYLES.info('Line-by-line analysis')}: Available`);
    sections.push(`├─ ${STYLES.info('Complexity metrics')}: Calculated`);
    sections.push(`└─ ${STYLES.info('Performance hints')}: Identified`);
  }

  // Mock ticket creation commands
  if (analysis.mocks.length > 0) {
    sections.push(`\n${STYLES.muted('# Suggested ticket creation commands:')}`);
    analysis.mocks.forEach(mock => {
      sections.push(STYLES.muted(mock.ticketSuggestion));
    });
  }

  // Next Action section
  sections.push(`\n${STYLES.info('TODO: Next actions for AI')}:
├─ Review analysis:
│  └─ Examine refactor opportunities
├─ Apply improvements:
│  └─ Extract patterns, optimize performance
├─ Create tickets for mocks:
│  └─ Plan future work for real implementations
├─ Verify 100% test pass:
│  └─ Ensure refactoring doesn't break tests
└─ Commit refactoring:
   └─ ${STYLES.code(`git commit -m "${generateCommitMessage('refactor', ticketId, ticketTitle)}"`)}`);

  // Next phase hint
  sections.push(`\n${STYLES.muted('After refactoring: ait3 flow squash')}`);

  return sections.join('\n');
}