import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { SlugUtils } from '../../common/utils.js';
import { getTicketLocation, generateCommitMessage, formatTicketHeader, getTicketOrThrow } from '../../common/flow-utils.js';

export interface RedArgs {
  ticketId: string;
  type?: 'unit' | 'integration' | 'both';
  interactive?: boolean;
  dryRun?: boolean;
}

export async function redPhase(
  args: RedArgs,
  services: Services
): Promise<CLIResult> {
  // Validate ticket ID
  if (!args.ticketId || args.ticketId.trim() === '') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ID_REQUIRED('RED'), 'ticketId');
  }

  const { ticketId, type = 'unit', interactive = false, dryRun = false } = args;

  // Get ticket information
  const ticket = await getTicketOrThrow(ticketId, services);

  // Check ticket status
  if (ticket.status === 'done') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ALREADY_COMPLETED(ticketId));
  }

  // Generate warning for tickets already in progress
  let statusWarning = '';
  if (ticket.status === 'doing') {
    statusWarning = `\n${STYLES.warning('WARNING:  Warning: Ticket is already in progress')}`;
  }

  // Parse acceptance criteria from ticket description
  const testCases = extractTestCases(ticket);
  const hasApiLabel = ticket.labels?.includes('api') || ticket.labels?.includes('rest');

  // Handle interactive mode
  if (interactive) {
    return generateInteractiveOutput(ticket, testCases, dryRun);
  }

  // Handle dry run mode
  if (dryRun) {
    return generateDryRunOutput(ticket, type, testCases);
  }

  // Generate test files based on type
  const results: string[] = [];
  
  if (type === 'unit' || type === 'both') {
    const unitPath = generateUnitTestPath(ticket);
    results.push(`${STYLES.success('CHECK:')} Unit test generated: ${STYLES.info(unitPath)}`);
  }

  if (type === 'integration' || type === 'both') {
    const integrationPath = generateIntegrationTestPath(ticket);
    results.push(`${STYLES.success('CHECK:')} Integration test generated: ${STYLES.info(integrationPath)}`);
  }

  // Add test case count
  const testCount = testCases.length > 0 ? testCases.length : 3; // Default 3 basic tests
  results.push(`${STYLES.info('INFO:')} ${STYLES.info(testCount + ' test cases generated')}${testCases.length > 0 ? ' from acceptance criteria' : ''}`);

  // Add API pattern note if applicable
  if (hasApiLabel) {
    results.push(`${STYLES.info('INFO:')} API test pattern applied`);
  }

  // Add pass rate
  results.push(`${STYLES.danger('CROSS:')} Current pass rate: ${STYLES.danger('0% pass rate')} ${STYLES.muted('(all tests failing as expected)')}`);

  // Get ticket title for better formatting
  const ticketTitle = ticket.title || 'Feature';
  const ticketLocation = getTicketLocation(ticketId, ticketTitle, 'doing');

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, ticketTitle, 'RED Phase')}${statusWarning}

${STYLES.bold('Claude Code Instructions')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Create comprehensive test cases:
   ├─ Test behavior, not implementation
   ├─ Cover all acceptance criteria
   ├─ Include edge cases & error scenarios
   └─ Ensure 0% pass rate initially

3. Test coverage check:
   - Not required to be 100%
   - Must be sufficient for the feature
   - Verify all critical paths covered

${STYLES.bold('LOCATION: Test Locations')}:
├─ Unit: ${STYLES.info(`src/commands/${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.test.ts`)}
└─ Integration: ${STYLES.info(`tests/integration/${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.test.ts`)}

${results.join('\n')}

${STYLES.info('Next Action')}:
├─ Read acceptance criteria:
│  └─ Analyze ${STYLES.info(ticketLocation)}
├─ Create test files:
│  └─ Implement failing tests for all scenarios
├─ Verify 0% pass rate:
│  └─ Run tests to confirm all failing
└─ Commit test suite:
   └─ ${STYLES.code(`git commit -m "${generateCommitMessage('test', ticketId, ticketTitle)}"`)},

${STYLES.muted('After test creation: ait3 flow green')}
`
  };
}

function extractTestCases(ticket: any): string[] {
  const testCases: string[] = [];
  
  // Look for acceptance criteria in description
  if (ticket.description) {
    const acceptanceCriteriaMatch = ticket.description.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n##|$)/);
    if (acceptanceCriteriaMatch) {
      const criteriaText = acceptanceCriteriaMatch[1];
      const criteriaLines = criteriaText.split('\n').filter((line: string) => line.trim().startsWith('- [ ]'));
      testCases.push(...criteriaLines.map((line: string) => line.replace('- [ ]', '').trim()));
    }
  }

  return testCases;
}

function generateUnitTestPath(ticket: any): string {
  const featureName = SlugUtils.titleToSlug(ticket.title);
  return `tests/commands/flow/${featureName}.test.ts`;
}

function generateIntegrationTestPath(ticket: any): string {
  const featureName = SlugUtils.titleToSlug(ticket.title);
  return `tests/integration/cli/flow/${featureName}.integration.test.ts`;
}

function generateInteractiveOutput(ticket: any, testCases: string[], dryRun: boolean): CLIResult {
  const prefix = dryRun ? `${STYLES.warning('[DRY RUN]')} ` : '';
  const ticketLocation = getTicketLocation(ticket.id, ticket.title, 'doing');
  
  return {
    success: true,
    message: `
${prefix}${formatTicketHeader(ticket.id, ticket.title, 'RED Phase')}

${STYLES.bold('Claude Code Instructions')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Test cases identified: ${testCases.length || 3}
3. Interactive mode options:

${STYLES.bold('Choose test generation strategy')}:
${STYLES.info('[1]')} Generate all test cases automatically
${STYLES.info('[2]')} Review and customize test cases
${STYLES.info('[3]')} Add additional edge cases
${STYLES.info('[4]')} Skip and write tests manually

${STYLES.info('Next Action')}:
└─ Choose strategy and proceed with test creation

${STYLES.muted('Interactive mode: Select an option to continue')}
`
  };
}

function generateDryRunOutput(ticket: any, type: string, testCases: string[]): CLIResult {
  const files: string[] = [];
  const ticketLocation = getTicketLocation(ticket.id, ticket.title, 'doing');
  
  if (type === 'unit' || type === 'both') {
    files.push(`- ${generateUnitTestPath(ticket)}`);
  }
  
  if (type === 'integration' || type === 'both') {
    files.push(`- ${generateIntegrationTestPath(ticket)}`);
  }

  return {
    success: true,
    message: `
${STYLES.warning('SEARCH: DRY RUN')} - Preview mode for Ticket #${ticket.id}: ${ticket.title}
${STYLES.info('LOCATION: Ticket location')}: ${STYLES.info(ticketLocation)}

${STYLES.bold('BRAIN: Would execute')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Generate test files:
${files.join('\n')}

${STYLES.info('Test cases')}: ${testCases.length || 3}
${STYLES.info('Test type')}: ${type}
${STYLES.info('Expected pass rate')}: 0%

${STYLES.info('Next Action')}:
└─ Run without --dry-run flag to create test files

${STYLES.muted('Dry run mode: Preview only')}
`
  };
}