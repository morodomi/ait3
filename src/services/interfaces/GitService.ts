/**
 * GitService interface for Git operations
 * Used by the ticket start command for automatic branch creation
 */
export interface GitService {
  /**
   * Check if the current directory is a Git repository
   */
  isRepository(): Promise<boolean>;

  /**
   * Check if there are uncommitted changes in the working directory
   */
  hasUncommittedChanges(): Promise<boolean>;

  /**
   * Fetch latest changes from remote repository
   * @throws Error if fetch fails (non-critical, should be handled gracefully)
   */
  fetch(): Promise<void>;

  /**
   * Find branches matching a pattern
   * @param pattern - Pattern to match (e.g., "feature/0001-*")
   * @returns Array of branch names matching the pattern
   */
  findBranches(pattern: string): Promise<string[]>;

  /**
   * Create a new branch from the current branch
   * @param name - Name of the new branch
   * @throws Error if branch creation fails
   */
  createBranch(name: string): Promise<void>;

  /**
   * Checkout an existing branch
   * @param name - Name of the branch to checkout
   * @throws Error if checkout fails
   */
  checkout(name: string): Promise<void>;

  /**
   * Get the name of the current branch
   * @returns Name of the current branch
   */
  getCurrentBranch(): Promise<string>;

  /**
   * Get the merge base between two branches
   * @param branch1 - First branch name
   * @param branch2 - Second branch name
   * @returns Hash of the merge base commit
   */
  getMergeBase(branch1: string, branch2: string): Promise<string>;

  /**
   * Get commits from a base branch to HEAD
   * @param base - Base branch or commit to compare from
   * @returns Array of commits with hash and message
   */
  getCommits(base: string): Promise<Array<{ hash: string; message: string }>>;
}