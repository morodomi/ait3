import type { StartTicketArgs, Services, CLIResult } from '../../common/types.js';
import type { GitService } from '../../services/interfaces/GitService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '../../common/errors.js';
import { IDUtils, SlugUtils } from '../../common/utils.js';
import { UI_CONSTANTS } from '../../common/constants.js';
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
    // Execute business logic through service layer
    await services.ticketService.startTicket(args.id);

    // Get ticket details for better user feedback
    const ticket = await services.ticketService.getTicket(args.id);

    // Generate formatted success output
    const messageParts = [
      chalk.green(`✅ Started ticket #${args.id}`) + (ticket ? `: ${ticket.title}` : ''),
      '',
      chalk.gray('   Status updated: ') + chalk.blue('todo') + chalk.gray(' → ') + chalk.yellow('doing'),
      chalk.gray('   Moved from todo → doing'),
      ''
    ];

    // Handle Git operations if GitService is available
    if (services.gitService && ticket) {
      try {
        const gitMessage = await handleGitOperations(args.id, ticket.title, services.gitService);
        messageParts.push(gitMessage);
      } catch (gitError) {
        // If it's uncommitted changes error, re-throw to stop execution
        if (gitError instanceof Error && gitError.message.includes('uncommitted changes')) {
          throw gitError;
        }
        // For other Git errors, add them to the message
        messageParts.push(chalk.yellow('⚠️  Git operations failed'));
        messageParts.push(chalk.gray(`   ${gitError instanceof Error ? gitError.message : 'Unknown error'}`));
        messageParts.push(chalk.yellow('📝 Manual Git steps:'));
        messageParts.push(chalk.gray(`   git checkout -b ${generateBranchName(args.id, ticket.title)}`));
        messageParts.push('');
      }
    } else if (!services.gitService && ticket) {
      // Show manual instructions if GitService is not available
      const branchName = generateBranchName(args.id, ticket.title);
      messageParts.push(chalk.yellow('📝 Manual Git steps:'));
      messageParts.push(chalk.gray(`   git checkout -b ${branchName}`));
      messageParts.push('');
    }

    // Add next steps guidance
    messageParts.push(chalk.cyan('🚀 Next: ait3 flow plan'));
    messageParts.push(chalk.gray('   Start planning phase for this ticket'));

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
      messageParts.push(chalk.yellow('⚠️  Git is not initialized'));
      messageParts.push(chalk.gray('   Run these commands:'));
      messageParts.push(chalk.gray(`   git init`));
      messageParts.push(chalk.gray(`   git checkout -b ${generateBranchName(ticketId, title)}`));
      messageParts.push('');
      return messageParts.join('\n');
    }

    // Check for uncommitted changes
    const hasChanges = await gitService.hasUncommittedChanges();
    if (hasChanges) {
      // Still start the ticket, but throw error after for proper handling
      throw new Error('Cannot start ticket: You have uncommitted changes. Please commit or stash them first.');
    }

    // Try to fetch (non-critical)
    try {
      await gitService.fetch();
    } catch (fetchError) {
      messageParts.push(chalk.yellow('⚠️  Warning: Could not fetch remote branches'));
      messageParts.push(chalk.gray(`   ${fetchError instanceof Error ? fetchError.message : 'Network error'}`));
      messageParts.push('');
    }

    // Check for existing branches
    const branchPattern = `feature/${ticketId}-`;
    const existingBranches = await gitService.findBranches(branchPattern);
    
    if (existingBranches.length > 0) {
      // Handle existing branches
      if (existingBranches.length === 1) {
        const branchName = existingBranches[0];
        
        // Check if it's a remote branch
        if (branchName.startsWith('origin/')) {
          messageParts.push(chalk.blue(`🔍 Found remote branch: ${branchName}`));
          messageParts.push(chalk.gray('   Creating local tracking branch'));
          
          const localBranchName = branchName.replace('origin/', '');
          try {
            await gitService.checkout(localBranchName);
            messageParts.push(chalk.green(`✓ Created and switched to: ${localBranchName}`));
          } catch (checkoutError) {
            messageParts.push(chalk.yellow(`⚠️  Could not create tracking branch`));
            messageParts.push(chalk.gray(`   Error: ${checkoutError instanceof Error ? checkoutError.message : 'Unknown error'}`));
            messageParts.push(chalk.gray('   Manual command:'));
            messageParts.push(chalk.gray(`   git checkout -b ${localBranchName} ${branchName}`));
          }
        } else {
          // Local branch exists
          try {
            await gitService.checkout(branchName);
            messageParts.push(chalk.green(`✓ Switched to existing branch: ${branchName}`));
          } catch (checkoutError) {
            messageParts.push(chalk.yellow(`⚠️  Could not switch to existing branch`));
            messageParts.push(chalk.gray(`   Error: ${checkoutError instanceof Error ? checkoutError.message : 'Unknown error'}`));
            messageParts.push(chalk.gray('   Manual resolution required'));
          }
        }
      } else {
        // Multiple branches found
        messageParts.push(chalk.yellow('🔍 Found multiple branches:'));
        existingBranches.forEach(branch => {
          messageParts.push(chalk.gray(`   - ${branch}`));
        });
        
        // Try to checkout the first one
        try {
          await gitService.checkout(existingBranches[0]);
          messageParts.push(chalk.green(`✓ Switched to: ${existingBranches[0]}`));
        } catch (checkoutError) {
          messageParts.push(chalk.yellow('⚠️  Could not switch automatically'));
          messageParts.push(chalk.gray('   Choose manually:'));
          messageParts.push(chalk.gray(`   git checkout ${existingBranches[0]}`));
        }
      }
    } else {
      // Create new branch
      const newBranchName = generateBranchName(ticketId, title);
      const currentBranch = await gitService.getCurrentBranch();
      
      try {
        await gitService.createBranch(newBranchName);
        await gitService.checkout(newBranchName);
        
        messageParts.push(chalk.green(`✓ Created and switched to branch: ${newBranchName}`));
        if (currentBranch !== 'main' && currentBranch !== 'master') {
          messageParts.push(chalk.gray(`   Created from branch: ${currentBranch}`));
        }
      } catch (createError) {
        messageParts.push(chalk.yellow('⚠️  Could not create branch automatically'));
        messageParts.push(chalk.gray(`   Error: ${createError instanceof Error ? createError.message : 'Unknown error'}`));
        messageParts.push(chalk.yellow('📝 Manual Git steps:'));
        messageParts.push(chalk.gray(`   git checkout -b ${newBranchName}`));
      }
    }
    
    messageParts.push('');
    return messageParts.join('\n');
    
  } catch (error) {
    // Re-throw all errors to be handled by the main function
    throw error;
  }
}