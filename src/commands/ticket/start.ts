import type { StartTicketArgs, Services, CLIResult } from '../../common/types.js';
import type { GitService } from '../../services/interfaces/GitService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '../../common/errors.js';
import { IDUtils, SlugUtils } from '../../common/utils.js';
import { UI_CONSTANTS } from '../../common/constants.js';
import { FLOW_STYLES } from '../../common/styles.js';
import chalk from 'chalk';

// Force colors for consistent output in tests
chalk.level = 3;

export async function startTicket(
  args: StartTicketArgs,
  services: Services
): Promise<CLIResult> {
  // Input validation - ID format
  if (!args.id || !IDUtils.isValidTicketId(args.id)) {
    throw new ValidationError(
      'Invalid ticket ID format. Must be a 4-digit number (e.g., 0001)',
      'id'
    );
  }

  try {
    // Get ticket details first for validation
    const ticket = await services.ticketService.getTicket(args.id);
    if (!ticket) {
      throw new TicketNotFoundError(args.id);
    }

    // Check Git operations BEFORE changing ticket status
    if (services.gitService) {
      try {
        // Check for uncommitted changes first
        const isRepo = await services.gitService.isRepository();
        if (isRepo) {
          const hasChanges = await services.gitService.hasUncommittedChanges();
          if (hasChanges) {
            throw new Error('Cannot start ticket: You have uncommitted changes. Please commit or stash them first.');
          }
        }
      } catch (gitError) {
        // If it's uncommitted changes error, re-throw to prevent ticket status change
        if (gitError instanceof Error && gitError.message.includes('uncommitted changes')) {
          throw gitError;
        }
        // For other Git errors, we'll continue and show manual instructions
      }
    }

    // Now safe to change ticket status
    await services.ticketService.startTicket(args.id);

    // Generate formatted success output
    const messageParts = [
      FLOW_STYLES.success(`✅ Started ticket #${args.id}`) + (ticket ? `: ${ticket.title}` : ''),
      '',
      FLOW_STYLES.statusTransition('   Status updated: ') + FLOW_STYLES.info('todo') + FLOW_STYLES.statusTransition(' → ') + FLOW_STYLES.warning('doing'),
      FLOW_STYLES.statusTransition('   Moved from todo → doing'),
      ''
    ];

    // Handle Git operations if GitService is available
    if (services.gitService && ticket) {
      try {
        const gitMessage = await handleGitOperations(args.id, ticket.title, services.gitService);
        messageParts.push(gitMessage);
      } catch (gitError) {
        // For Git errors after ticket move, add them to the message
        messageParts.push(FLOW_STYLES.gitWarning('⚠️  Git operations failed'));
        messageParts.push(FLOW_STYLES.gitCommand(`   ${gitError instanceof Error ? gitError.message : 'Unknown error'}`));
        messageParts.push(FLOW_STYLES.gitWarning('📝 Manual Git steps:'));
        messageParts.push(FLOW_STYLES.gitCommand(`   git checkout -b ${generateBranchName(args.id, ticket.title)}`));
        messageParts.push('');
      }
    } else if (!services.gitService && ticket) {
      // Show manual instructions if GitService is not available
      const branchName = generateBranchName(args.id, ticket.title);
      messageParts.push(FLOW_STYLES.gitWarning('📝 Manual Git steps:'));
      messageParts.push(FLOW_STYLES.gitCommand(`   git checkout -b ${branchName}`));
      messageParts.push('');
    }

    // Add next steps guidance
    messageParts.push(FLOW_STYLES.path('🚀 Next: ait3 flow plan'));
    messageParts.push(FLOW_STYLES.dim('   Start planning phase for this ticket'));

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
  
  try {
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
    
  } catch (error) {
    // Re-throw all errors to be handled by the main function
    throw error;
  }
}

function handleGitNotInitialized(ticketId: string, title: string): string {
  const messageParts = [
    FLOW_STYLES.gitWarning('⚠️  Git is not initialized'),
    FLOW_STYLES.gitCommand('   Run these commands:'),
    FLOW_STYLES.gitCommand(`   git init`),
    FLOW_STYLES.gitCommand(`   git checkout -b ${generateBranchName(ticketId, title)}`),
    ''
  ];
  return messageParts.join('\n');
}

async function attemptFetch(gitService: GitService, messageParts: string[]): Promise<void> {
  try {
    await gitService.fetch();
  } catch (fetchError) {
    messageParts.push(FLOW_STYLES.gitWarning('⚠️  Warning: Could not fetch remote branches'));
    messageParts.push(FLOW_STYLES.gitCommand(`   ${formatErrorMessage(fetchError)}`));
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
  messageParts.push(FLOW_STYLES.gitInfo(`🔍 Found remote branch: ${branchName}`));
  messageParts.push(FLOW_STYLES.gitCommand('   Creating local tracking branch'));
  
  const localBranchName = branchName.replace('origin/', '');
  try {
    await gitService.checkout(localBranchName);
    messageParts.push(FLOW_STYLES.gitSuccess(`✓ Created and switched to: ${localBranchName}`));
  } catch (checkoutError) {
    messageParts.push(FLOW_STYLES.gitWarning(`⚠️  Could not create tracking branch`));
    messageParts.push(FLOW_STYLES.gitCommand(`   Error: ${formatErrorMessage(checkoutError)}`));
    messageParts.push(FLOW_STYLES.gitCommand('   Manual command:'));
    messageParts.push(FLOW_STYLES.gitCommand(`   git checkout -b ${localBranchName} ${branchName}`));
  }
}

async function handleLocalBranch(
  branchName: string,
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  try {
    await gitService.checkout(branchName);
    messageParts.push(FLOW_STYLES.gitSuccess(`✓ Switched to existing branch: ${branchName}`));
  } catch (checkoutError) {
    messageParts.push(FLOW_STYLES.gitWarning(`⚠️  Could not switch to existing branch`));
    messageParts.push(FLOW_STYLES.gitCommand(`   Error: ${formatErrorMessage(checkoutError)}`));
    messageParts.push(FLOW_STYLES.gitCommand('   Manual resolution required'));
  }
}

async function handleMultipleExistingBranches(
  existingBranches: string[],
  gitService: GitService,
  messageParts: string[]
): Promise<void> {
  messageParts.push(FLOW_STYLES.gitWarning('🔍 Found multiple branches:'));
  existingBranches.forEach(branch => {
    messageParts.push(FLOW_STYLES.gitCommand(`   - ${branch}`));
  });
  
  try {
    await gitService.checkout(existingBranches[0]);
    messageParts.push(FLOW_STYLES.gitSuccess(`✓ Switched to: ${existingBranches[0]}`));
  } catch (checkoutError) {
    messageParts.push(FLOW_STYLES.gitWarning('⚠️  Could not switch automatically'));
    messageParts.push(FLOW_STYLES.gitCommand('   Choose manually:'));
    messageParts.push(FLOW_STYLES.gitCommand(`   git checkout ${existingBranches[0]}`));
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
    
    messageParts.push(FLOW_STYLES.gitSuccess(`✓ Created and switched to branch: ${newBranchName}`));
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      messageParts.push(FLOW_STYLES.gitCommand(`   Created from branch: ${currentBranch}`));
    }
  } catch (createError) {
    messageParts.push(FLOW_STYLES.gitWarning('⚠️  Could not create branch automatically'));
    messageParts.push(FLOW_STYLES.gitCommand(`   Error: ${formatErrorMessage(createError)}`));
    messageParts.push(FLOW_STYLES.gitWarning('📝 Manual Git steps:'));
    messageParts.push(FLOW_STYLES.gitCommand(`   git checkout -b ${newBranchName}`));
  }
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}