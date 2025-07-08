import type { Services, CLIResult, Ticket } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import { STYLES } from '../../common/styles.js';
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

  // Handle ticket completion
  let statusMessage = '';
  if (ticket.status === 'done') {
    statusMessage = `\n${STYLES.warning('WARNING:  Note: Ticket is already completed')}\n`;
  } else {
    // Auto-complete the ticket if not done
    try {
      // If ticket is in todo, we need to start it first
      if (ticket.status === 'todo') {
        await services.ticketService.startTicket(ticketId);
      }
      await services.ticketService.completeTicket(ticketId);
      statusMessage = `\n${STYLES.success('SUCCESS: Automatically completed ticket #' + ticketId)}\n`;
      
      // Update ticket status for display
      ticket.status = 'done';
    } catch (completeError) {
      // If auto-complete fails, abort the squash operation
      throw new Error(`Failed to auto-complete ticket: ${completeError instanceof Error ? completeError.message : 'Unknown error'}`);
    }
  }

  // Handle dry-run mode
  if (args.dryRun) {
    return generateDryRunOutput(ticket, args);
  }

  // Generate Git command suggestions with ticket location
  const ticketSlug = SlugUtils.titleToSlug(ticket.title);
  const ticketLocation = `.tickets/done/${ticketId}-${ticketSlug}.md`;
  
  const locationInfo = `${STYLES.bold('SQUASH Phase')} for Ticket #${ticketId}: ${ticket.title}\n` +
                      `${STYLES.info('LOCATION: Ticket location')}: ${STYLES.info(ticketLocation)}\n`;
  
  const suggestions = generateGitSuggestions(ticket, args);

  return {
    success: true,
    message: locationInfo + statusMessage + suggestions
  };
}

function generateDryRunOutput(ticket: Ticket, args: SquashArgs): CLIResult {
  const sections: string[] = [];
  
  sections.push(`${STYLES.warning('SEARCH: DRY RUN')} - Preview mode`);
  sections.push(`\n${STYLES.bold('TARGET: SQUASH Phase')} - Git Command Suggestions for ticket #${ticket.id}`);
  sections.push(`\n${STYLES.info('LIST: Would suggest')}:`);
  
  if (!args.noSquash) {
    sections.push('├─ Git rebase commands for squashing commits');
  }
  sections.push('├─ Commit message templates');
  sections.push('├─ Safe push commands');
  
  if (args.pr) {
    sections.push('├─ Pull request creation commands');
  }
  
  sections.push('└─ Merge workflow commands');
  
  sections.push(`\n${STYLES.muted('Run without --dry-run to see full suggestions')}`);

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

  // Header is now added in the main function, so we don't need it here
  
  if (args.dryRun) {
    sections.push(`\n${STYLES.warning('SEARCH: DRY RUN MODE')}`);
  }

  // Add related commits section
  sections.push(`\n${STYLES.info('Related commits to squash')}:`);
  sections.push(`├─ ${STYLES.muted('xxxxxxx planning(#' + ticketId + '): design approach')}`);
  sections.push(`├─ ${STYLES.muted('xxxxxxx test(#' + ticketId + '): create failing tests')}`);
  sections.push(`├─ ${STYLES.muted('xxxxxxx feat(#' + ticketId + '): implement feature')}`);
  sections.push(`└─ ${STYLES.muted('xxxxxxx refactor(#' + ticketId + '): optimize implementation')}`);

  sections.push(`\n${STYLES.bold('LIST: Suggested Git Commands')}:`);

  let stepNumber = 1;

  // Step 1: Squash commits (unless --no-squash)
  if (!args.noSquash) {
    sections.push(`\n${STYLES.info(`## ${stepNumber}. Squash commits into logical units:`)}`);
    sections.push(`${STYLES.code('git rebase -i main')}`);
    sections.push(`${STYLES.muted('# Mark commits to squash (s) or fixup (f)')}`);
    sections.push(`${STYLES.muted('# Suggested grouping:')}`);
    sections.push(`${STYLES.muted(`#   - Planning phase commits → "planning(#${ticketId}): ${ticket.title.toLowerCase()}"`)}`);
    sections.push(`${STYLES.muted(`#   - Test commits → "test(#${ticketId}): comprehensive test suite"`)}`);
    sections.push(`${STYLES.muted(`#   - Implementation → "${commitTitle}"`)}`);
    sections.push(`${STYLES.muted(`#   - Refactoring → "refactor(#${ticketId}): optimize implementation"`)}`);
    stepNumber++;
  }

  // Step 2: Create comprehensive commit message
  sections.push(`\n${STYLES.info(`## ${stepNumber}. Create comprehensive commit message:`)}`);
  sections.push(STYLES.code('git commit --amend -m "' + commitTitle + '"'));
  sections.push('');
  sections.push(generateCommitBody(ticket));
  sections.push('');
  sections.push(STYLES.success('SUCCESS:') + ' All tests passing');
  sections.push(STYLES.success('DOCS:') + ' Docs updated');
  sections.push(STYLES.success('TOOLS:') + ' No breaking changes');
  stepNumber++;

  // Step 3: Push to remote
  sections.push(`\n${STYLES.info(`## ${stepNumber}. Push to remote:`)}`);
  sections.push(`${STYLES.code(`git push origin ${featureName} --force-with-lease`)}`);
  sections.push(`${STYLES.warning('WARNING:  --force-with-lease ensures safe force push')}`);
  stepNumber++;

  // Step 4: Create Pull Request (if --pr flag)
  if (args.pr) {
    sections.push(`\n${STYLES.info(`## ${stepNumber}. Create Pull Request:`)}`);
    sections.push(`${STYLES.code(`gh pr create --title "${commitTitle}" \\`)}`);
    sections.push(`${STYLES.code(`  --body "Implements final phase of AIT³ workflow for ${ticket.title}" \\`)}`);
    sections.push(`${STYLES.code('  --base main')}`);
    sections.push(`${STYLES.muted('# Alternative: Use GitHub web interface if gh CLI not available')}`);
    stepNumber++;
  }

  // Step 5: After review, merge
  sections.push(`\n${STYLES.info(`## ${stepNumber}. After review, merge:`)}`);
  sections.push(`${STYLES.code('git checkout main')}`);
  sections.push(`${STYLES.code('git pull origin main')}`);
  sections.push(`${STYLES.code(`git merge --no-ff ${featureName}`)}`);
  sections.push(`${STYLES.code('git push origin main')}`);
  sections.push(`${STYLES.warning('WARNING:  Use --no-ff to preserve feature branch history')}`);
  stepNumber++;
  
  // If PR was rejected info
  sections.push(`\n${STYLES.info('TIP: If PR rejected')}:`);
  sections.push(`${STYLES.code(`ait3 ticket reopen ${ticketId}`)}`);
  sections.push(`${STYLES.muted('This will move ticket from done → doing')}`);

  // Create structured Next Action section
  sections.push(`\n${STYLES.info('Next Action')}:`);
  
  if (!args.noSquash) {
    sections.push(`├─ Squash commits:`);
    sections.push(`│  └─ ${STYLES.code('git rebase -i main')}`);
    sections.push(`├─ Create final commit:`);
    sections.push(`│  └─ ${STYLES.code(`git commit -m "${commitTitle}"`)}`);
    sections.push(`├─ Push changes:`);
    sections.push(`│  └─ ${STYLES.code('git push --force-with-lease')}`);
    sections.push(`└─ Create PR or merge to main`);
  } else {
    sections.push(`├─ Review commits (no squash)`);
    sections.push(`├─ Push changes:`);
    sections.push(`│  └─ ${STYLES.code('git push')}`);
    sections.push(`└─ Create PR or merge to main`);
  }

  // Safety warnings
  sections.push(`\n${STYLES.warning('WARNING:  Safety reminders')}:`);
  sections.push(`├─ ${STYLES.muted('Review all commands before execution')}`);
  sections.push(`├─ ${STYLES.muted('Ensure tests pass before merging')}`);
  sections.push(`├─ ${STYLES.muted('Backup important changes')}`);
  sections.push(`└─ ${STYLES.muted('Use --force-with-lease instead of --force')}`);

  // Educational note
  sections.push(`\n${STYLES.muted('TIP: This is the final step in AIT³ workflow: PLANNING → RED → GREEN → REFACTOR → SQUASH')}`);

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