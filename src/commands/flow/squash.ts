import type { Services, CLIResult, Ticket } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { FLOW_STYLES } from '../../common/styles.js';
import { FLOW_MESSAGES } from '../../common/flow-messages.js';
import { SlugUtils } from '../../common/utils.js';

export interface SquashArgs {
  ticketId: string;
  pr?: boolean;
  noSquash?: boolean;
  dryRun?: boolean;
}

export async function squashPhase(
  args: SquashArgs,
  services: Services
): Promise<CLIResult> {
  // Validate ticket ID
  if (!args.ticketId || args.ticketId.trim() === '') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_ID_REQUIRED('SQUASH'), 'ticketId');
  }

  const { ticketId } = args;

  // Get ticket information
  let ticket: Ticket;
  try {
    const foundTicket = await services.ticketService.getTicket(ticketId);
    if (!foundTicket) {
      throw new TicketNotFoundError(ticketId);
    }
    ticket = foundTicket;
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      throw error;
    }
    throw new TicketNotFoundError(ticketId);
  }

  // Check ticket status and prepare status message
  let statusMessage = '';
  if (ticket.status === 'done') {
    statusMessage = `\n${FLOW_STYLES.warning('⚠️  Note: Ticket is already completed')}\n${FLOW_STYLES.dim('Showing Git command suggestions only (ticket move skipped)')}\n`;
  } else if (ticket.status === 'todo') {
    throw new ValidationError(FLOW_MESSAGES.TICKET_NOT_IN_PROGRESS(ticketId));
  }

  // Handle dry-run mode
  if (args.dryRun) {
    return generateDryRunOutput(ticket, args);
  }

  // Generate Git command suggestions
  const suggestions = generateGitSuggestions(ticket, args);

  return {
    success: true,
    message: statusMessage + suggestions
  };
}

function generateDryRunOutput(ticket: Ticket, args: SquashArgs): CLIResult {
  const sections: string[] = [];
  
  sections.push(`${FLOW_STYLES.warning('🔍 DRY RUN')} - Preview mode`);
  sections.push(`\n${FLOW_STYLES.title('🎯 SQUASH Phase')} - Git Command Suggestions for ticket #${ticket.id}`);
  sections.push(`\n${FLOW_STYLES.info('📋 Would suggest')}:`);
  
  if (!args.noSquash) {
    sections.push('├─ Git rebase commands for squashing commits');
  }
  sections.push('├─ Commit message templates');
  sections.push('├─ Safe push commands');
  
  if (args.pr) {
    sections.push('├─ Pull request creation commands');
  }
  
  sections.push('└─ Merge workflow commands');
  
  sections.push(`\n${FLOW_STYLES.dim('Run without --dry-run to see full suggestions')}`);

  return {
    success: true,
    message: sections.join('\n')
  };
}

function generateGitSuggestions(ticket: Ticket, args: SquashArgs): string {
  const sections: string[] = [];
  const ticketId = ticket.id;
  const featureName = generateFeatureBranchName(ticket);
  const commitTitle = generateCommitTitle(ticket);

  // Header
  sections.push(`${FLOW_STYLES.title('🎯 SQUASH Phase')} - Git Command Suggestions for ticket #${ticketId}`);
  
  if (args.dryRun) {
    sections.push(`\n${FLOW_STYLES.warning('🔍 DRY RUN MODE')}`);
  }

  sections.push(`\n${FLOW_STYLES.title('📋 Suggested Git Commands')}:`);

  let stepNumber = 1;

  // Step 1: Squash commits (unless --no-squash)
  if (!args.noSquash) {
    sections.push(`\n${FLOW_STYLES.info(`## ${stepNumber}. Squash commits into logical units:`)}`);
    sections.push(`${FLOW_STYLES.code('git rebase -i main')}`);
    sections.push(`${FLOW_STYLES.dim('# Mark commits to squash (s) or fixup (f)')}`);
    sections.push(`${FLOW_STYLES.dim('# Suggested grouping:')}`);
    sections.push(`${FLOW_STYLES.dim(`#   - Planning phase commits → "planning(#${ticketId}): ${ticket.title.toLowerCase()}"`)}`);
    sections.push(`${FLOW_STYLES.dim(`#   - Test commits → "test(#${ticketId}): comprehensive test suite"`)}`);
    sections.push(`${FLOW_STYLES.dim(`#   - Implementation → "${commitTitle}"`)}`);
    sections.push(`${FLOW_STYLES.dim(`#   - Refactoring → "refactor(#${ticketId}): optimize implementation"`)}`);
    stepNumber++;
  }

  // Step 2: Create comprehensive commit message
  sections.push(`\n${FLOW_STYLES.info(`## ${stepNumber}. Create comprehensive commit message:`)}`);
  sections.push(FLOW_STYLES.code('git commit --amend -m "' + commitTitle + '"'));
  sections.push('');
  sections.push(generateCommitBody(ticket));
  sections.push('');
  sections.push(FLOW_STYLES.success('✅') + ' All tests passing');
  sections.push(FLOW_STYLES.success('📚') + ' Docs updated');
  sections.push(FLOW_STYLES.success('🔧') + ' No breaking changes');
  stepNumber++;

  // Step 3: Push to remote
  sections.push(`\n${FLOW_STYLES.info(`## ${stepNumber}. Push to remote:`)}`);
  sections.push(`${FLOW_STYLES.code(`git push origin ${featureName} --force-with-lease`)}`);
  sections.push(`${FLOW_STYLES.warning('⚠️  --force-with-lease ensures safe force push')}`);
  stepNumber++;

  // Step 4: Create Pull Request (if --pr flag)
  if (args.pr) {
    sections.push(`\n${FLOW_STYLES.info(`## ${stepNumber}. Create Pull Request:`)}`);
    sections.push(`${FLOW_STYLES.code(`gh pr create --title "${commitTitle}" \\`)}`);
    sections.push(`${FLOW_STYLES.code(`  --body "Implements final phase of AIT³ workflow for ${ticket.title}" \\`)}`);
    sections.push(`${FLOW_STYLES.code('  --base main')}`);
    sections.push(`${FLOW_STYLES.dim('# Alternative: Use GitHub web interface if gh CLI not available')}`);
    stepNumber++;
  }

  // Step 5: After review, merge
  sections.push(`\n${FLOW_STYLES.info(`## ${stepNumber}. After review, merge:`)}`);
  sections.push(`${FLOW_STYLES.code('git checkout main')}`);
  sections.push(`${FLOW_STYLES.code('git pull origin main')}`);
  sections.push(`${FLOW_STYLES.code(`git merge --no-ff ${featureName}`)}`);
  sections.push(`${FLOW_STYLES.code('git push origin main')}`);
  sections.push(`${FLOW_STYLES.warning('⚠️  Use --no-ff to preserve feature branch history')}`);
  stepNumber++;
  
  // If PR was rejected info
  sections.push(`\n${FLOW_STYLES.info('💡 If PR rejected')}:`);
  sections.push(`${FLOW_STYLES.code(`ait3 ticket reopen ${ticketId}`)}`);
  sections.push(`${FLOW_STYLES.dim('This will move ticket from done → doing')}`);

  // Next steps (Manual Execution)
  sections.push(`\n${FLOW_STYLES.title('🚀 Next steps (Manual Execution)')}:`);
  sections.push(`1. Review suggested commands and execute manually`);
  sections.push(`2. Complete the ticket when ready:`);
  sections.push(`   ${FLOW_STYLES.code(`ait3 ticket complete ${ticketId}`)}`);
  sections.push(`3. Push changes and create PR or merge`);
  sections.push(`   `);
  sections.push(`${FLOW_STYLES.dim('Note: Future version will automate ticket completion during squash')}`);

  // Safety warnings
  sections.push(`\n${FLOW_STYLES.warning('⚠️  Safety reminders')}:`);
  sections.push(`├─ ${FLOW_STYLES.dim('Review all commands before execution')}`);
  sections.push(`├─ ${FLOW_STYLES.dim('Ensure tests pass before merging')}`);
  sections.push(`├─ ${FLOW_STYLES.dim('Backup important changes')}`);
  sections.push(`└─ ${FLOW_STYLES.dim('Use --force-with-lease instead of --force')}`);

  // Educational note
  sections.push(`\n${FLOW_STYLES.dim('💡 This is the final step in AIT³ workflow: PLANNING → RED → GREEN → REFACTOR → SQUASH')}`);

  return sections.join('\n');
}

function generateFeatureBranchName(ticket: Ticket): string {
  const featureName = SlugUtils.titleToSlug(ticket.title);
  return `feature/${ticket.id}-${featureName}`;
}

function generateCommitTitle(ticket: Ticket): string {
  const title = ticket.title.toLowerCase()
    .replace(/^(feat|fix|refactor|test|docs|style|chore):\s*/, ''); // Remove existing prefix if any
  
  // Determine commit type based on labels or title
  let type = 'feat';
  if (ticket.labels?.includes('bug') || ticket.labels?.includes('fix')) {
    type = 'fix';
  } else if (ticket.labels?.includes('refactor')) {
    type = 'refactor';
  } else if (ticket.labels?.includes('test')) {
    type = 'test';
  } else if (ticket.labels?.includes('docs')) {
    type = 'docs';
  }

  return `${type}(#${ticket.id}): ${title}`;
}

function generateCommitBody(ticket: Ticket): string {
  const lines: string[] = [];
  
  // Create a generic description based on ticket title
  const description = ticket.description || `Implements ${ticket.title.toLowerCase()}`;
  lines.push(description);
  
  if (ticket.labels && ticket.labels.length > 0) {
    lines.push('');
    lines.push(`Labels: ${ticket.labels.join(', ')}`);
  }

  return lines.join('\n');
}