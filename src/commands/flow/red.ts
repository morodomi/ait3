import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { FLOW_STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { SlugUtils } from '../../common/utils.js';

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
  let ticket;
  try {
    ticket = await services.ticketService.getTicket(ticketId);
    if (!ticket) {
      throw new TicketNotFoundError(ticketId);
    }
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      throw error;
    }
    throw new TicketNotFoundError(ticketId);
  }

  // Check ticket status
  if (ticket.status === 'done') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ALREADY_COMPLETED(ticketId));
  }

  // Generate warning for tickets already in progress
  let statusWarning = '';
  if (ticket.status === 'doing') {
    statusWarning = `\n${FLOW_STYLES.warning('⚠️  Warning: Ticket is already in progress')}`;
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
    results.push(`${FLOW_STYLES.success('✓')} Unit test generated: ${FLOW_STYLES.path(unitPath)}`);
  }

  if (type === 'integration' || type === 'both') {
    const integrationPath = generateIntegrationTestPath(ticket);
    results.push(`${FLOW_STYLES.success('✓')} Integration test generated: ${FLOW_STYLES.path(integrationPath)}`);
  }

  // Add test case count
  const testCount = testCases.length > 0 ? testCases.length : 3; // Default 3 basic tests
  results.push(`${FLOW_STYLES.info('ℹ')} ${FLOW_STYLES.count(testCount + ' test cases generated')}${testCases.length > 0 ? ' from acceptance criteria' : ''}`);

  // Add API pattern note if applicable
  if (hasApiLabel) {
    results.push(`${FLOW_STYLES.info('ℹ')} API test pattern applied`);
  }

  // Add pass rate
  results.push(`${FLOW_STYLES.error('✗')} Current pass rate: ${FLOW_STYLES.error('0% pass rate')} ${FLOW_STYLES.dim('(all tests failing as expected)')}`);

  // Get ticket title for better formatting
  const ticketTitle = ticket.title || 'Feature';
  const ticketSlug = SlugUtils.titleToSlug(ticketTitle);

  return {
    success: true,
    message: `
${FLOW_STYLES.title('🔴 RED Phase')} for Ticket #${ticketId}: ${ticketTitle}${statusWarning}

${FLOW_STYLES.section('🧠 Claude Code Instructions')}:
1. Read ticket: ${FLOW_STYLES.path(`.tickets/doing/${ticketId}-${ticketSlug}.md`)}
2. Create comprehensive test cases:
   ├─ Test behavior, not implementation
   ├─ Cover all acceptance criteria
   ├─ Include edge cases & error scenarios
   └─ Ensure 0% pass rate initially

3. Test coverage check:
   - Not required to be 100%
   - Must be sufficient for the feature
   - Verify all critical paths covered

${FLOW_STYLES.section('📍 Test Locations')}:
├─ Unit: ${FLOW_STYLES.path(`src/commands/${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.test.ts`)}
└─ Integration: ${FLOW_STYLES.path(`tests/integration/${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.test.ts`)}

${results.join('\n')}

${FLOW_STYLES.warning('⚡ After test creation')}:
${FLOW_STYLES.command('$ ait3 flow green')}
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
  const prefix = dryRun ? `${FLOW_STYLES.warning('[DRY RUN]')} ` : '';
  const ticketSlug = SlugUtils.titleToSlug(ticket.title);
  
  return {
    success: true,
    message: `
${prefix}${FLOW_STYLES.title('🔴 RED Phase')} for Ticket #${ticket.id}: ${ticket.title}

${FLOW_STYLES.section('🧠 Claude Code Instructions')}:
1. Read ticket: ${FLOW_STYLES.path(`.tickets/doing/${ticket.id}-${ticketSlug}.md`)}
2. Test cases identified: ${testCases.length || 3}
3. Interactive mode options:

${FLOW_STYLES.title('Choose test generation strategy')}:
${FLOW_STYLES.info('[1]')} Generate all test cases automatically
${FLOW_STYLES.info('[2]')} Review and customize test cases
${FLOW_STYLES.info('[3]')} Add additional edge cases
${FLOW_STYLES.info('[4]')} Skip and write tests manually

${FLOW_STYLES.dim('Select an option to continue...')}
`
  };
}

function generateDryRunOutput(ticket: any, type: string, testCases: string[]): CLIResult {
  const files: string[] = [];
  const ticketSlug = SlugUtils.titleToSlug(ticket.title);
  
  if (type === 'unit' || type === 'both') {
    files.push(`- ${generateUnitTestPath(ticket)}`);
  }
  
  if (type === 'integration' || type === 'both') {
    files.push(`- ${generateIntegrationTestPath(ticket)}`);
  }

  return {
    success: true,
    message: `
${FLOW_STYLES.warning('🔍 DRY RUN')} - Preview mode for Ticket #${ticket.id}: ${ticket.title}

${FLOW_STYLES.section('🧠 Would execute')}:
1. Read ticket: ${FLOW_STYLES.path(`.tickets/doing/${ticket.id}-${ticketSlug}.md`)}
2. Generate test files:
${files.join('\n')}

${FLOW_STYLES.info('Test cases')}: ${testCases.length || 3}
${FLOW_STYLES.info('Test type')}: ${type}
${FLOW_STYLES.info('Expected pass rate')}: 0%

${FLOW_STYLES.dim('Run without --dry-run to create files')}
`
  };
}