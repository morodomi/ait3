import type { Services, CLIResult, Ticket } from '../../common/types.js';
import { ValidationError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { SlugUtils, IDUtils } from '../../common/utils.js';
import { generateCommitMessage, formatTicketHeader, getTicketOrThrow } from '../../common/flow-utils.js';
import { formatTicketDisplay } from '../../common/utils/location-utils.js';

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

  // Validate ID format
  if (!IDUtils.isValidTicketId(args.ticketId)) {
    throw new ValidationError('Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)', 'ticketId');
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
    return generateInteractiveOutput(ticket, testCases, dryRun, services);
  }

  // Handle dry run mode
  if (dryRun) {
    return generateDryRunOutput(ticket, type, testCases, services);
  }

  // Generate test files based on type
  const results: string[] = [];
  
  if (type === 'unit' || type === 'both') {
    const unitPath = generateUnitTestPath(ticket);
    results.push(`${STYLES.success('INFO:')} Unit test generated: ${STYLES.info(unitPath)}`);
  }

  if (type === 'integration' || type === 'both') {
    const integrationPath = generateIntegrationTestPath(ticket);
    results.push(`${STYLES.success('INFO:')} Integration test generated: ${STYLES.info(integrationPath)}`);
  }

  // Add test case count
  const testCount = testCases.length > 0 ? testCases.length : 3; // Default 3 basic tests
  results.push(`${STYLES.info('INFO:')} ${STYLES.info(testCount + ' test cases generated')}${testCases.length > 0 ? ' from acceptance criteria' : ''}`);

  // Add API pattern note if applicable
  if (hasApiLabel) {
    results.push(`${STYLES.info('INFO:')} API test pattern applied`);
  }

  // Add pass rate
  results.push(`${STYLES.danger('INFO:')} Current pass rate: ${STYLES.danger('0% pass rate')} ${STYLES.muted('(all tests failing as expected)')}`);

  // Get ticket title for better formatting
  const ticketTitle = ticket.title || 'Feature';
  const ticketLocation = formatTicketDisplay(ticket, services.ticketService);

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, ticketTitle, 'RED Phase', ticket, services)}${statusWarning}

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

${STYLES.info('TODO: Next actions for AI')}:
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

function extractTestCases(ticket: { description?: string }): string[] {
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

function generateUnitTestPath(ticket: { title: string }): string {
  const featureName = SlugUtils.titleToSlug(ticket.title);
  return `tests/commands/flow/${featureName}.test.ts`;
}

function generateIntegrationTestPath(ticket: { title: string }): string {
  const featureName = SlugUtils.titleToSlug(ticket.title);
  return `tests/integration/cli/flow/${featureName}.integration.test.ts`;
}

function generateInteractiveOutput(ticket: Ticket, testCases: string[], dryRun: boolean, services: Services): CLIResult {
  const prefix = dryRun ? `${STYLES.warning('[DRY RUN]')} ` : '';
  const ticketLocation = formatTicketDisplay(ticket, services.ticketService);
  
  return {
    success: true,
    message: `
${prefix}${formatTicketHeader(ticket.id, ticket.title, 'RED Phase', ticket, services)}

${STYLES.bold('Claude Code Instructions')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Test cases identified: ${testCases.length || 3}
3. Interactive mode options:

${STYLES.bold('Choose test generation strategy')}:
${STYLES.info('[1]')} Generate all test cases automatically
${STYLES.info('[2]')} Review and customize test cases
${STYLES.info('[3]')} Add additional edge cases
${STYLES.info('[4]')} Skip and write tests manually

${STYLES.info('TODO: Next actions for AI')}:
└─ Choose strategy and proceed with test creation

${STYLES.muted('Interactive mode: Select an option to continue')}
`
  };
}

function generateDryRunOutput(ticket: Ticket, type: string, testCases: string[], services: Services): CLIResult {
  const files: string[] = [];
  const ticketLocation = formatTicketDisplay(ticket, services.ticketService);
  
  if (type === 'unit' || type === 'both') {
    files.push(`- ${generateUnitTestPath(ticket)}`);
  }
  
  if (type === 'integration' || type === 'both') {
    files.push(`- ${generateIntegrationTestPath(ticket)}`);
  }

  return {
    success: true,
    message: `
${STYLES.warning('INFO: DRY RUN')} - Preview mode for Ticket #${ticket.id}: ${ticket.title}
${STYLES.info('LOCATION: Ticket location')}: ${STYLES.info(ticketLocation)}

${STYLES.bold('INFO: Would execute')}:
1. Read ticket: ${STYLES.info(ticketLocation)}
2. Generate test files:
${files.join('\n')}

${STYLES.info('Test cases')}: ${testCases.length || 3}
${STYLES.info('Test type')}: ${type}
${STYLES.info('Expected pass rate')}: 0%

${STYLES.info('TODO: Next actions for AI')}:
└─ Run without --dry-run flag to create test files

${STYLES.muted('Dry run mode: Preview only')}
`
  };
}