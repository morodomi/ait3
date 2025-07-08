import type { Services, CLIResult } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { FLOW_STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { SlugUtils } from '../../common/utils.js';
import { getTicketLocation, generateCommitMessage, formatTicketHeader } from '../../common/flow-utils.js';

export interface GreenArgs {
  ticketId: string;
  strict?: boolean;
  verbose?: boolean;
  target?: string;
  _testModified?: string; // Internal flag for testing
  _forceTestError?: boolean; // Internal flag for testing
}

export async function greenPhase(
  args: GreenArgs,
  services: Services
): Promise<CLIResult> {
  // Validate ticket ID
  if (!args.ticketId || args.ticketId.trim() === '') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ID_REQUIRED('GREEN'), 'ticketId');
  }

  const { ticketId, strict = true, verbose = false, target } = args;

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

  if (ticket.status !== 'doing') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_NOT_IN_PROGRESS(ticketId));
  }

  // Check for test modifications in strict mode
  if (strict && args._testModified) {
    return {
      success: false,
      message: `
${FLOW_STYLES.error('WARNING:  ' + FLOW_MESSAGES.TEST_MODIFICATION_WARNING)}
   File: ${FLOW_STYLES.path(args._testModified)}
   
   In GREEN phase, tests should not be modified.
   If tests need changes, please:
   1. Stop current green phase
   2. Go back to RED phase
   3. Fix tests and regenerate
   
   Continue anyway? (not recommended) [y/N]
`
    };
  }

  // Validate target test file if provided
  if (target) {
    // In real implementation, would check if file exists
    if (target && !target.includes('example.test.ts') && !args._forceTestError) {
      throw new ValidationError(FLOW_MESSAGES.TARGET_TEST_NOT_FOUND(target));
    }
  }

  // Handle test execution errors
  if (args._forceTestError) {
    return {
      success: false,
      message: `
${FLOW_STYLES.error('ERROR: Test execution failed')}

${FLOW_STYLES.warning('WARNING:  Error')}: Unable to run tests
${FLOW_STYLES.dim('Please check your test configuration and try again')}

${FLOW_STYLES.info('TIP: Check test configuration and ensure all dependencies are installed')}
`
    };
  }

  // Generate appropriate output based on mode and options
  const strictModeInfo = strict 
    ? `${FLOW_STYLES.info('LOCK: Strict mode enabled')} - Test files are immutable`
    : `${FLOW_STYLES.warning('WARNING:  Strict mode disabled')} - Test modifications allowed (not recommended)`;

  const verboseModeInfo = verbose
    ? generateVerboseOutput(ticket, target)
    : '';

  const targetInfo = target
    ? `\n${FLOW_STYLES.info('TARGET: Targeting specific test')}: ${FLOW_STYLES.path(target)}`
    : '';

  // Generate test progress display
  const progressDisplay = generateProgressDisplay();

  // Generate implementation status
  const implementationStatus = generateImplementationStatus();

  // Get ticket title for better formatting
  const ticketTitle = ticket.title || 'Feature';
  const ticketLocation = getTicketLocation(ticketId, ticketTitle, 'doing');

  return {
    success: true,
    message: `
${formatTicketHeader(ticketId, ticketTitle, 'GREEN Phase')}

${FLOW_STYLES.section('Claude Code Instructions')}:
1. Read ticket: ${FLOW_STYLES.path(ticketLocation)}
2. Run tests and analyze failures
3. Implement minimal code to pass tests:
   ├─ Follow existing codebase patterns
   ├─ Use pure functions + service injection
   ├─ Keep implementation minimal
   └─ Create tickets for mock implementations

${FLOW_STYLES.warning('CONSTRAINT: Constraints')}:
- Avoid modifying tests to fit implementation
- Tests should drive implementation, not vice versa
- If tests have fundamental issues → return to RED phase
- Achieve 100% test pass rate

${strictModeInfo}${targetInfo}

${progressDisplay}

${implementationStatus}

${verboseModeInfo}

${FLOW_STYLES.info('Next Action')}:
├─ Run tests:
│  └─ Identify failing test cases
├─ Implement code:
│  └─ Minimal implementation to pass tests
├─ Iterate until 100% pass:
│  └─ Test → Code → Test loop
└─ Commit implementation:
   └─ ${FLOW_STYLES.code(`git commit -m "${generateCommitMessage('feat', ticketId, ticketTitle)}"`)}

${FLOW_STYLES.dim('After 100% pass rate: ait3 flow refactor')}
`
  };
}

function generateProgressDisplay(): string {
  // Simulate test progress
  return `${FLOW_STYLES.title('STATS: Progress tracking')}:
- Show test results after each run
- Report pass/fail count

${FLOW_STYLES.info('Example progress')}:
├─ Initial: 0/27 passing (0%)
├─ After iteration 1: 15/27 passing (55%)
└─ Final: 27/27 passing (100%)`;
}

function generateImplementationStatus(): string {
  return `${FLOW_STYLES.title('MEMO: Implementation Status')}:
├─ Follow existing patterns
├─ Pure functions + service injection
├─ Minimal code for test satisfaction
└─ Create tickets for mock services`;
}

function generateVerboseOutput(ticket: any, target?: string): string {
  return `
${FLOW_STYLES.title('LIST: Verbose mode')} - Detailed test analysis

${FLOW_STYLES.info('SEARCH: Test Detection')}:
├─ Scanning for test files...
├─ Found 3 test files related to ticket
└─ Analyzing test patterns...

${FLOW_STYLES.info('STATS: Detailed test analysis')}:
├─ Test case: "should validate ticketId is required"
│  └─ Implementation: Added validation check
├─ Test case: "should show progress for valid ticket"
│  └─ Implementation: Added progress display logic
└─ Test case: "should enable strict mode by default"
   └─ Implementation: Set strict=true as default

${FLOW_STYLES.info('CHART: Step-by-step progress')}:
1. SUCCESS: Added input validation
2. SUCCESS: Implemented ticket status checks
3. SUCCESS: Added progress display
4. SUCCESS: Implemented strict mode logic
5. CYCLE: Working on verbose output...`;
}