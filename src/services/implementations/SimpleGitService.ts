import { simpleGit, SimpleGit } from 'simple-git';
import type { GitService } from '../interfaces/GitService.js';

export class SimpleGitService implements GitService {
  private git: SimpleGit;

  constructor(basePath?: string) {
    this.git = simpleGit(basePath);
  }

  async isRepository(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch (error) {
      return false;
    }
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length > 0;
  }

  async fetch(): Promise<void> {
    await this.git.fetch();
  }

  async findBranches(pattern: string): Promise<string[]> {
    const branchSummary = await this.git.branch(['-a']);
    
    return branchSummary.all
      .filter(branch => branch.includes(pattern))
      .map(branch => this.cleanBranchName(branch));
  }

  private cleanBranchName(branch: string): string {
    // Convert remotes/origin/feature/xxx to origin/feature/xxx
    if (branch.startsWith('remotes/')) {
      return branch.replace('remotes/', '');
    }
    return branch;
  }

  async createBranch(name: string): Promise<void> {
    await this.git.checkoutBranch(name, 'HEAD');
  }

  async checkout(name: string): Promise<void> {
    await this.git.checkout(name);
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return result.trim();
  }

  async getMergeBase(branch1: string, branch2: string): Promise<string> {
    const result = await this.git.raw(['merge-base', branch1, branch2]);
    return result.trim();
  }

  async getCommits(base: string): Promise<Array<{ hash: string; message: string }>> {
    const log = await this.git.log({ from: base, to: 'HEAD' });
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message
    }));
  }
}