import type { StartTicketArgs, Services, CLIResult } from '../../common/types.js';
import type { GitService } from '../../services/interfaces/GitService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '../../common/errors.js';
import { IDUtils, SlugUtils } from '../../common/utils.js';
import { STYLES } from '../../common/styles.js';
import { getTicketLocation } from '../../common/flow-utils.js';

export async function startTicket(
  args: StartTicketArgs,
  services: Services
): Promise<CLIResult> {
  // Input validation - ID format
  if (!args.id || !IDUtils.isValidTicketId(args.id)) {
    throw new ValidationError(
      'Invalid ticket ID format. Use local format (0001) or GitHub format (#70, 70)',
      'id'
    );
  }

  try {
    // Get ticket details first for validation
    const ticket = await services.ticketService.getTicket(args.id);
    if (!ticket) {
      throw new TicketNotFoundError(args.id);
    }

    // Handle Git operations FIRST, before changing ticket status
    let gitOperationSuccess = false;
    let gitMessage = '';
    
    if (services.gitService && ticket) {
      try {
        // Check for uncommitted changes first
        const isRepo = await services.gitService.isRepository();
        if (isRepo) {
          const hasChanges = await services.gitService.hasUncommittedChanges();
          if (hasChanges) {
            throw new Error('Cannot start ticket: You have uncommitted changes. Please commit or stash them first.');
          }
        }
        
        // Try to create/checkout branch
        gitMessage = await handleGitOperations(args.id, ticket.title, services.gitService);
        gitOperationSuccess = true;
      } catch (gitError) {
        // If it's a critical error (uncommitted changes or branch creation failure), don't move ticket
        if (gitError instanceof Error && 
            (gitError.message.includes('uncommitted changes') || 
             gitError.message.includes('Failed to create branch') ||
             gitError.message.includes('Permission denied'))) {
          throw gitError;
        }
        
        // For non-critical errors (like fetch failures), we'll continue
        gitMessage = STYLES.warning('WARNING: Git operations failed\n') +
                     STYLES.muted(`   ${gitError instanceof Error ? gitError.message : 'Unknown error'}\n`) +
                     STYLES.warning('Manual Git steps:\n') +
                     STYLES.muted(`   git checkout -b ${generateBranchName(args.id, ticket.title)}\n`);
        gitOperationSuccess = true; // Allow ticket move for non-critical errors
      }
    } else {
      // No GitService available, that's OK
      gitOperationSuccess = true;
    }
    
    // Only move ticket if Git operations succeeded (or GitService is not available)
    if (!gitOperationSuccess) {
      throw new Error('Git operations failed. Ticket status not changed.');
    }
    
    // Now safe to change ticket status
    await services.ticketService.startTicket(args.id);

    // Generate formatted success output
    const messageParts = [
      STYLES.success(`SUCCESS: Started ticket #${args.id}`) + (ticket ? `: ${ticket.title}` : ''),
      ''
    ];
    
    // Add status information
    messageParts.push(STYLES.info('Details:'));
    messageParts.push(`   Status: ${STYLES.warning('doing')}`);
    messageParts.push(`   Location: ${STYLES.info(getTicketLocation(args.id, ticket?.title || 'unknown', 'doing'))}`);
    messageParts.push('');
    
    // Add Git message if available
    if (gitMessage) {
      messageParts.push(gitMessage);
    } else if (!services.gitService && ticket) {
      // Show manual instructions if GitService is not available
      const branchName = generateBranchName(args.id, ticket.title);
      messageParts.push(STYLES.warning('Manual Git steps:'));
      messageParts.push(STYLES.muted(`   git checkout -b ${branchName}`));
      messageParts.push('');
    }

    // Add next steps guidance with new format
    messageParts.push(STYLES.info('Next Action:'));
    messageParts.push(`└─ Run: ${STYLES.info(`ait3 flow plan ${args.id}`)}`);

    return {
      success: true,
      message: messageParts.join('\n')
    };

  } catch (error) {
    // Error handling - convert service layer errors to appropriate CLI errors
    if (error instanceof ValidationError || 
        error instanceof TicketNotFoundError ||
        error instanceof TicketAlreadyInProgressError ||
        error instanceof TicketAlreadyCompletedError) {
      throw error; // Re-throw specific errors as-is
    }
    
    // Wrap other errors with context
    throw new Error(`Failed to start ticket: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function generateBranchName(ticketId: string, title: string): string {
  const slug = SlugUtils.titleToSlug(title);
  return `feature/${ticketId}-${slug}`;
}

async function handleGitOperations(
  ticketId: string,
  title: string,
  gitService: GitService
): Promise<string> {
  const messageParts: string[] = [];
  
  // Check if it's a Git repository
  const isRepo = await gitService.isRepository();
  if (!isRepo) {
    return handleGitNotInitialized(ticketId, title);
  }

  // Note: uncommitted changes are already checked before calling this function

  // Try to fetch (non-critical)
  await attemptFetch(gitService, messageParts);

  // Handle branch operations
  const branchPattern = `feature/${ticketId}-`;
  const existingBranches = await gitService.findBranches(branchPattern);
  
  if (existingBranches.length > 0) {
    await handleExistingBranches(existingBranches, gitService, messageParts);
  } else {
    await handleNewBranchCreation(ticketId, title, gitService, messageParts);
  }
  
  messageParts.push('');
  return messageParts.join('\n');
}

function handleGitNotInitialized(ticketId: string, title: string): string {
  const messageParts = [
    STYLES.warning('WARNING: Git is not initialized'),
    STYLES.muted('   Run these commands:'),
    STYLES.muted('   git init'),
    STYLES.muted(`   git checkout -b ${generateBranchName(ticketId, title)}`),
    ''
  ];
  return messageParts.join('\n');
}

async function attemptFetch(gitService: GitService, messageParts: string[]): Promise<void> {
  try {
    await gitService.fetch();
  } catch (fetchError) {
    messageParts.push(STYLES.warning('WARNING: Warning: Could not fetch remote branches'));
    messageParts.push(STYLES.muted(`   ${formatErrorMessage(fetchError)}`));
    messageParts.push('');
  }
}

async function handleExistingBranches(
  existingBranches: string[],
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  if (existingBranches.length === 1) {
    await handleSingleExistingBranch(existingBranches[0], gitService, messageParts);
  } else {
    await handleMultipleExistingBranches(existingBranches, gitService, messageParts);
  }
}

async function handleSingleExistingBranch(
  branchName: string,
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  if (branchName.startsWith('origin/')) {
    await handleRemoteBranch(branchName, gitService, messageParts);
  } else {
    await handleLocalBranch(branchName, gitService, messageParts);
  }
}

async function handleRemoteBranch(
  branchName: string,
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  messageParts.push(STYLES.info(`INFO: Found remote branch: ${branchName}`));
  messageParts.push(STYLES.muted('   Creating local tracking branch'));
  
  const localBranchName = branchName.replace('origin/', '');
  try {
    await gitService.checkout(localBranchName);
    messageParts.push(STYLES.success(`SUCCESS: Created and switched to: ${localBranchName}`));
  } catch (checkoutError) {
    messageParts.push(STYLES.warning('WARNING: Could not create tracking branch'));
    messageParts.push(STYLES.muted(`   Error: ${formatErrorMessage(checkoutError)}`));
    messageParts.push(STYLES.muted('   Manual command:'));
    messageParts.push(STYLES.muted(`   git checkout -b ${localBranchName} ${branchName}`));
  }
}

async function handleLocalBranch(
  branchName: string,
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  try {
    await gitService.checkout(branchName);
    messageParts.push(STYLES.success(`SUCCESS: Switched to existing branch: ${branchName}`));
  } catch (checkoutError) {
    // For existing branch checkout, we can be more lenient since the branch exists
    messageParts.push(STYLES.warning('WARNING: Could not switch to existing branch'));
    messageParts.push(STYLES.muted(`   Error: ${formatErrorMessage(checkoutError)}`));
    messageParts.push(STYLES.muted('   Manual resolution required'));
    // Don't throw - allow ticket move since branch exists
  }
}

async function handleMultipleExistingBranches(
  existingBranches: string[],
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  messageParts.push(STYLES.warning('INFO: Found multiple branches:'));
  existingBranches.forEach(branch => {
    messageParts.push(STYLES.muted(`   - ${branch}`));
  });
  
  try {
    await gitService.checkout(existingBranches[0]);
    messageParts.push(STYLES.success(`SUCCESS: Switched to: ${existingBranches[0]}`));
  } catch (checkoutError) {
    messageParts.push(STYLES.warning('WARNING: Could not switch automatically'));
    messageParts.push(STYLES.muted('   Choose manually:'));
    messageParts.push(STYLES.muted(`   git checkout ${existingBranches[0]}`));
  }
}

async function handleNewBranchCreation(
  ticketId: string,
  title: string,
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  const newBranchName = generateBranchName(ticketId, title);
  const currentBranch = await gitService.getCurrentBranch();
  
  try {
    await gitService.createBranch(newBranchName);
    await gitService.checkout(newBranchName);
    
    messageParts.push(STYLES.success(`SUCCESS: Created and switched to branch: ${newBranchName}`));
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      messageParts.push(STYLES.muted(`   Created from branch: ${currentBranch}`));
    }
  } catch (createError) {
    // Throw error to prevent ticket move
    throw new Error(`Failed to create branch: ${formatErrorMessage(createError)}`);
  }
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}