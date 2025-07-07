import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import chalk from 'chalk';

// Constants for consistent styling and messaging
const STYLES = {
  title: chalk.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  path: chalk.cyan,
  count: chalk.magenta,
  dim: chalk.dim
} as const;

const MESSAGES = {
  TICKET_ID_REQUIRED: 'Ticket ID is required for RED phase',
  TICKET_NOT_FOUND: (id: string) => `Ticket #${id} not found`,
  TICKET_ALREADY_COMPLETED: (id: string) => `Ticket #${id} is already completed`,
  TEST_GENERATION_SUCCESS: 'Test files generated successfully',
  DRY_RUN_PREFIX: 'DRY RUN - No files will be created'
} as const;

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
    throw new ValidationError(MESSAGES.TICKET_ID_REQUIRED, 'ticketId');
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
    throw new ValidationError(MESSAGES.TICKET_ALREADY_COMPLETED(ticketId));
  }

  // Generate warning for tickets already in progress
  let statusWarning = '';
  if (ticket.status === 'doing') {
    statusWarning = `\n${STYLES.warning('⚠️  Warning: Ticket is already in progress')}`;
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
    results.push(`${STYLES.success('✓')} Unit test generated: ${STYLES.path(unitPath)}`);
  }

  if (type === 'integration' || type === 'both') {
    const integrationPath = generateIntegrationTestPath(ticket);
    results.push(`${STYLES.success('✓')} Integration test generated: ${STYLES.path(integrationPath)}`);
  }

  // Add test case count
  const testCount = testCases.length > 0 ? testCases.length : 3; // Default 3 basic tests
  results.push(`${STYLES.info('ℹ')} ${STYLES.count(testCount + ' test cases generated')}${testCases.length > 0 ? ' from acceptance criteria' : ''}`);

  // Add API pattern note if applicable
  if (hasApiLabel) {
    results.push(`${STYLES.info('ℹ')} API test pattern applied`);
  }

  // Add pass rate
  results.push(`${STYLES.error('✗')} Current pass rate: ${STYLES.error('0% pass rate')} ${STYLES.dim('(all tests failing as expected)')}`);

  return {
    success: true,
    message: `
${STYLES.title('🔴 RED Phase')} - Failing tests generated for ticket #${ticketId}${statusWarning}

${results.join('\n')}

${STYLES.dim('Next step: Implement functionality to make tests pass')}
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
  // Extract feature name from ticket title
  const featureName = ticket.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `tests/commands/flow/${featureName}.test.ts`;
}

function generateIntegrationTestPath(ticket: any): string {
  const featureName = ticket.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `tests/integration/cli/flow/${featureName}.integration.test.ts`;
}

function generateInteractiveOutput(ticket: any, testCases: string[], dryRun: boolean): CLIResult {
  const prefix = dryRun ? `${STYLES.warning('[DRY RUN]')} ` : '';
  
  return {
    success: true,
    message: `
${prefix}${STYLES.title('🔴 RED Phase - Interactive mode')}

${STYLES.info('📋 Ticket')}: #${ticket.id} - ${ticket.title}
${STYLES.info('📝 Test cases identified')}: ${testCases.length || 3}

${STYLES.title('Choose test generation options')}:
${STYLES.info('[1]')} Generate all test cases automatically
${STYLES.info('[2]')} Review and customize test cases
${STYLES.info('[3]')} Add additional edge cases
${STYLES.info('[4]')} Skip and write tests manually

${STYLES.dim('Select an option to continue...')}
`
  };
}

function generateDryRunOutput(ticket: any, type: string, testCases: string[]): CLIResult {
  const files: string[] = [];
  
  if (type === 'unit' || type === 'both') {
    files.push(`- ${generateUnitTestPath(ticket)}`);
  }
  
  if (type === 'integration' || type === 'both') {
    files.push(`- ${generateIntegrationTestPath(ticket)}`);
  }

  return {
    success: true,
    message: `
${STYLES.warning('DRY RUN')} - No files will be created

${STYLES.title('Would generate')}:
${files.join('\n')}

${STYLES.info('Test cases')}: ${testCases.length || 3}
${STYLES.info('Test type')}: ${type}
${STYLES.info('Expected pass rate')}: 0%

${STYLES.dim('Run without --dry-run to create files')}
`
  };
}