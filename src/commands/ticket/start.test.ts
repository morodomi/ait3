import { describe, it, expect, beforeEach } from 'vitest';
import { startTicket } from './start.js';
import type { Services, StartTicketArgs, Ticket } from '@/common/types.js';
import type { TicketService } from '@/services/interfaces/TicketService.js';
import type { GitService, GitStatus } from '@/services/interfaces/GitService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '@/common/errors.js';

// Helper to strip ANSI color codes for testing
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

// Mock TicketService for unit testing
class MockTicketService implements TicketService {
  private shouldThrowError: Error | null = null;
  private startedTickets: Set<string> = new Set();

  constructor() {}

  // Set error to throw for testing
  setError(error: Error | null) {
    this.shouldThrowError = error;
  }

  async createTicket(): Promise<Ticket> {
    throw new Error('Not implemented for this test');
  }

  async listTickets(): Promise<Ticket[]> {
    throw new Error('Not implemented for this test');
  }

  async getTicket(id: string): Promise<Ticket> {
    // Handle TicketNotFoundError specifically
    if (this.shouldThrowError instanceof TicketNotFoundError) {
      return null;
    }
    
    // Return appropriate status based on error type
    let status = this.startedTickets.has(id) ? 'doing' : 'todo';
    if (this.shouldThrowError instanceof TicketAlreadyInProgressError) {
      status = 'doing';
    } else if (this.shouldThrowError instanceof TicketAlreadyCompletedError) {
      status = 'done';
    }
    
    // Return a mock ticket for successful tests and other error types
    return {
      id,
      title: 'Test Ticket',
      status,
      priority: 'medium',
      created: '2025-01-01T00:00:00Z',
      updated: new Date().toISOString(),
      labels: []
    };
  }

  async startTicket(id: string): Promise<void> {
    if (this.shouldThrowError) {
      throw this.shouldThrowError;
    }
    // Track started tickets
    this.startedTickets.add(id);
    return Promise.resolve();
  }

  // Add missing methods from TicketService interface
  async updateTicket(): Promise<Ticket> {
    throw new Error('Not implemented for this test');
  }

  async deleteTicket(): Promise<void> {
    throw new Error('Not implemented for this test');
  }

  async completeTicket(): Promise<void> {
    throw new Error('Not implemented for this test');
  }

  async undoTicket(): Promise<void> {
    throw new Error('Not implemented for this test');
  }

  async migrate(): Promise<void> {
    throw new Error('Not implemented for this test');
  }

  getBackendType(): string {
    return 'local';
  }

  getServiceName(): string {
    return 'MockTicketService';
  }
}

// Mock GitService for unit testing
class MockGitService implements GitService {
  private uncommittedChanges = false;
  private fetchError: Error | null = null;
  private branches: string[] = [];
  private currentBranch = 'main';
  private createBranchError: Error | null = null;
  private checkoutError: Error | null = null;
  private statusError: Error | null = null;
  private isRepo = true;
  private status: GitStatus = {
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
    ahead: 0,
    behind: 0
  };

  setUncommittedChanges(hasChanges: boolean) {
    this.uncommittedChanges = hasChanges;
  }

  setFetchError(error: Error | null) {
    this.fetchError = error;
  }

  setBranches(branches: string[]) {
    this.branches = branches;
  }

  setCurrentBranch(branch: string) {
    this.currentBranch = branch;
  }

  setCreateBranchError(error: Error | null) {
    this.createBranchError = error;
  }

  setCheckoutError(error: Error | null) {
    this.checkoutError = error;
  }

  setIsRepo(isRepo: boolean) {
    this.isRepo = isRepo;
  }

  setStatus(status: GitStatus) {
    this.status = status;
  }

  setStatusError(error: Error | null) {
    this.statusError = error;
  }

  async isRepository(): Promise<boolean> {
    return this.isRepo;
  }

  async hasUncommittedChanges(): Promise<boolean> {
    return this.uncommittedChanges;
  }

  async fetch(): Promise<void> {
    if (this.fetchError) {
      throw this.fetchError;
    }
  }

  async findBranches(pattern: string): Promise<string[]> {
    return this.branches.filter(b => b.includes(pattern.replace('*', '')));
  }

  async createBranch(name: string): Promise<void> {
    if (this.createBranchError) {
      throw this.createBranchError;
    }
    this.branches.push(name);
  }

  async checkout(name: string): Promise<void> {
    if (this.checkoutError) {
      throw this.checkoutError;
    }
    this.currentBranch = name;
  }

  async getCurrentBranch(): Promise<string> {
    return this.currentBranch;
  }

  async getStatus(): Promise<GitStatus> {
    if (this.statusError) {
      throw this.statusError;
    }
    return this.status;
  }

  // Add missing methods from GitService interface
  async getMergeBase(_branch1: string, _branch2: string): Promise<string> {
    return 'mock-merge-base';
  }

  async getCommits(_base: string): Promise<Array<{ hash: string; message: string }>> {
    return [];
  }

  async moveFile(_oldPath: string, _newPath: string): Promise<void> {
    // Mock implementation
  }

  async removeFile(_filePath: string): Promise<void> {
    // Mock implementation
  }
}

describe('startTicket pure function', () => {
  let mockTicketService: MockTicketService;
  let mockGitService: MockGitService;
  let services: Services;

  beforeEach(() => {
    mockTicketService = new MockTicketService();
    mockGitService = new MockGitService();
    services = {
      ticketService: mockTicketService,
      gitService: mockGitService
    };
  });

  describe('successful ticket start', () => {
    it('should start ticket successfully with valid ID', async () => {
      const args: StartTicketArgs = { id: '0001' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Started ticket #0001');
      expect(result.message).toContain('Status:');
      expect(result.message).toContain('doing');
      expect(result.message).toContain('Location:');
      expect(result.message).toContain('.tickets/doing/0001-');
    });

    it('should provide helpful success message', async () => {
      const args: StartTicketArgs = { id: '0042' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Started ticket #0042');
      expect(result.message).toContain('Status:');
      expect(result.message).toContain('doing');
    });

    it('should show GitHub URL location for GitHubTicketService', async () => {
      // Mock GitHubTicketService
      const mockGitHubService = {
        getTicket: async () => ({
          id: '#82',
          title: 'GitHub Start Test',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        }),
        startTicket: async () => {},
        getConfig: () => ({ owner: 'testowner', repo: 'testrepo' })
      };

      const githubServices: Services = {
        ticketService: mockGitHubService as TicketService,
        gitService: mockGitService
      };

      const args: StartTicketArgs = { id: '82' };
      const result = await startTicket(args, githubServices);

      expect(result.success).toBe(true);
      expect(stripAnsi(result.message)).toContain('Location: https://github.com/testowner/testrepo/issues/82');
    });
  });

  describe('input validation', () => {
    it('should validate ticket ID format', async () => {
      const invalidIds = ['', 'abc', '00001', 'invalid', '10000', '#10000'];
      
      for (const invalidId of invalidIds) {
        const args: StartTicketArgs = { id: invalidId };
        await expect(startTicket(args, services)).rejects.toThrow(ValidationError);
      }
    });

    it('should accept both local and GitHub ID formats', async () => {
      // These are valid formats that should work
      const validIds = ['0001', '123', '#123', '1', '#1'];
      
      for (const validId of validIds) {
        const args: StartTicketArgs = { id: validId };
        const result = await startTicket(args, services);
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid 4-digit IDs', async () => {
      const args: StartTicketArgs = { id: '0999' };
      
      // This should not throw ValidationError
      const result = await startTicket(args, services);
      expect(result.success).toBe(true);
    });

    it('should handle empty ID gracefully', async () => {
      const args: StartTicketArgs = { id: '' };
      
      await expect(startTicket(args, services)).rejects.toThrow(ValidationError);
    });
  });

  describe('ticket not found handling', () => {
    it('should handle non-existent ticket gracefully', async () => {
      mockTicketService.setError(new TicketNotFoundError('9999'));
      const args: StartTicketArgs = { id: '9999' };
      
      await expect(startTicket(args, services)).rejects.toThrow(TicketNotFoundError);
    });

    it('should throw TicketNotFoundError with correct ticket ID', async () => {
      const ticketId = '0404';
      mockTicketService.setError(new TicketNotFoundError(ticketId));
      const args: StartTicketArgs = { id: ticketId };
      
      try {
        await startTicket(args, services);
        expect.fail('Should have thrown TicketNotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(TicketNotFoundError);
        if (error instanceof TicketNotFoundError) {
          expect(error.ticketId).toBe(ticketId);
          expect(error.message).toContain(`Ticket with ID '${ticketId}' not found`);
        }
      }
    });
  });

  describe('ticket status validation', () => {
    it('should handle ticket already in progress', async () => {
      const ticketId = '0001';
      mockTicketService.setError(new TicketAlreadyInProgressError(ticketId));
      const args: StartTicketArgs = { id: ticketId };
      
      await expect(startTicket(args, services)).rejects.toThrow(TicketAlreadyInProgressError);
    });

    it('should handle ticket already completed', async () => {
      const ticketId = '0002';
      mockTicketService.setError(new TicketAlreadyCompletedError(ticketId));
      const args: StartTicketArgs = { id: ticketId };
      
      await expect(startTicket(args, services)).rejects.toThrow(TicketAlreadyCompletedError);
    });

    it('should throw TicketAlreadyInProgressError with correct message', async () => {
      const ticketId = '0003';
      mockTicketService.setError(new TicketAlreadyInProgressError(ticketId));
      const args: StartTicketArgs = { id: ticketId };
      
      try {
        await startTicket(args, services);
        expect.fail('Should have thrown TicketAlreadyInProgressError');
      } catch (error) {
        expect(error).toBeInstanceOf(TicketAlreadyInProgressError);
        if (error instanceof TicketAlreadyInProgressError) {
          expect(error.ticketId).toBe(ticketId);
          expect(error.message).toContain('is already in progress');
        }
      }
    });

    it('should throw TicketAlreadyCompletedError with correct message', async () => {
      const ticketId = '0004';
      mockTicketService.setError(new TicketAlreadyCompletedError(ticketId));
      const args: StartTicketArgs = { id: ticketId };
      
      try {
        await startTicket(args, services);
        expect.fail('Should have thrown TicketAlreadyCompletedError');
      } catch (error) {
        expect(error).toBeInstanceOf(TicketAlreadyCompletedError);
        if (error instanceof TicketAlreadyCompletedError) {
          expect(error.ticketId).toBe(ticketId);
          expect(error.message).toContain('is already completed');
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockTicketService.setError(new Error('Service error'));
      const args: StartTicketArgs = { id: '0001' };
      
      await expect(startTicket(args, services)).rejects.toThrow('Failed to start ticket: Service error');
    });

    it('should preserve specific error types', async () => {
      const specificError = new ValidationError('Custom validation error');
      mockTicketService.setError(specificError);
      const args: StartTicketArgs = { id: '0001' };
      
      await expect(startTicket(args, services)).rejects.toThrow(ValidationError);
    });

    it('should wrap unknown errors with context', async () => {
      mockTicketService.setError(new Error('Unknown error'));
      const args: StartTicketArgs = { id: '0001' };
      
      try {
        await startTicket(args, services);
        expect.fail('Should have thrown wrapped error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to start ticket: Unknown error');
      }
    });
  });

  describe('output formatting', () => {
    it('should include ticket ID in success message', async () => {
      const args: StartTicketArgs = { id: '0123' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('#0123');
    });

    it('should use colorized output', async () => {
      const args: StartTicketArgs = { id: '0001' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      // Should contain ANSI color codes
      expect(result.message).toMatch(/\[3\d*m/); // ANSI color codes
    });

    it('should indicate status transition', async () => {
      const args: StartTicketArgs = { id: '0001' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Status:');
      expect(result.message).toContain('doing');
    });

    it('should provide user-friendly messages', async () => {
      const args: StartTicketArgs = { id: '0001' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS:');
      expect(result.message).toContain('Started');
    });
  });

  describe('automatic branch creation', () => {
    beforeEach(async () => {
      // Set up a mock ticket that will be fetched
      mockTicketService = new MockTicketService();
      services.ticketService = mockTicketService;
    });

    it('should create and checkout feature branch when GitService is available', async () => {
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Started ticket #0001');
      expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
      expect(await mockGitService.getCurrentBranch()).toBe('feature/0001-test-ticket');
    });

    it('should handle uncommitted changes gracefully', async () => {
      // Set up uncommitted changes in the status object
      mockGitService.setStatus({
        modified: ['test.txt'],
        added: [],
        deleted: [],
        untracked: [],
        ahead: 0,
        behind: 0
      });
      const args: StartTicketArgs = { id: '0001' };
      
      await expect(startTicket(args, services)).rejects.toThrow(
        'Cannot start ticket: You have uncommitted changes. Please commit or stash them first.'
      );
      
      // Ticket should NOT be moved to doing when Git has uncommitted changes
      const ticket = await mockTicketService.getTicket('0001');
      expect(ticket?.status).toBe('todo');
    });

    it('should checkout existing branch if it already exists', async () => {
      mockGitService.setBranches(['feature/0001-existing-feature', 'main']);
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to existing branch: feature/0001-existing-feature');
      expect(await mockGitService.getCurrentBranch()).toBe('feature/0001-existing-feature');
    });

    it('should handle multiple existing branches with pattern', async () => {
      mockGitService.setBranches([
        'feature/0001-part-1',
        'feature/0001-part-2',
        'main'
      ]);
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Found multiple branches');
      expect(result.message).toContain('feature/0001-part-1');
      expect(result.message).toContain('feature/0001-part-2');
      expect(result.message).toContain('Switched to: feature/0001-part-1');
    });

    it('should show manual instructions when GitService is not available', async () => {
      delete services.gitService;
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Started ticket #0001');
      expect(result.message).toContain('Manual Git steps');
      expect(result.message).toContain('git checkout -b feature/0001-test-ticket');
      expect(result.message).not.toContain('Created and switched to branch');
    });

    it('should handle Git not initialized', async () => {
      mockGitService.setIsRepo(false);
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('WARNING: Git is not initialized');
      expect(result.message).toContain('git init');
      expect(result.message).toContain('git checkout -b feature/0001-test-ticket');
    });

    it('should continue despite fetch failure', async () => {
      mockGitService.setFetchError(new Error('Network error'));
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('WARNING: Warning: Could not fetch remote branches');
      expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
    });

    it('should handle branch creation failure', async () => {
      mockGitService.setCreateBranchError(new Error('Permission denied'));
      const args: StartTicketArgs = { id: '0001' };
      
      await expect(startTicket(args, services)).rejects.toThrow('Failed to create branch');
    });

    it('should handle checkout failure for existing branch', async () => {
      mockGitService.setBranches(['feature/0001-existing']);
      mockGitService.setCheckoutError(new Error('Branch has conflicts'));
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('WARNING: Could not switch to existing branch');
      expect(result.message).toContain('Error: Branch has conflicts');
      expect(result.message).toContain('Manual resolution required');
    });

    it('should create branch from current branch (not just main)', async () => {
      mockGitService.setCurrentBranch('develop');
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Created from branch: develop');
      expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
    });

    it('should handle special characters in ticket title', async () => {
      // Mock a ticket with special characters
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      // Branch name should be slugified properly
      expect(result.message).toMatch(/feature\/0001-[\w-]+/);
    });

    it('should include next steps guidance', async () => {
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Next Action:');
      expect(result.message).toContain('ait3 flow plan 0001');
    });
  });

  describe('branch creation before ticket move', () => {
    it('should NOT move ticket if branch creation fails', async () => {
      mockGitService.setCreateBranchError(new Error('Permission denied'));
      const args: StartTicketArgs = { id: '0001' };
      
      // This test currently fails - documenting expected behavior
      // Expected: Branch creation failure should prevent ticket move
      // Current: Ticket is moved even when branch creation fails
      
      await expect(async () => {
        const result = await startTicket(args, services);
        // Should either throw error or return success:false
        expect(result.success).toBe(false);
      }).rejects.toThrow();
      
      // Verify ticket status remains 'todo'
      const ticket = await mockTicketService.getTicket('0001');
      expect(ticket?.status).toBe('todo'); // Should NOT be 'doing'
    });

    it('should move ticket ONLY after successful branch creation', async () => {
      const args: StartTicketArgs = { id: '0001' };
      
      // This test documents the correct order of operations
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      // Verify ticket was successfully started after branch creation
      expect(result.message).toContain('Created and switched to branch');
      expect(result.message).toContain('Started ticket #0001');
    });

    it('should handle branch checkout failure without moving ticket', async () => {
      mockGitService.setCheckoutError(new Error('Cannot checkout'));
      const args: StartTicketArgs = { id: '0001' };
      
      // Expected: Checkout failure should prevent ticket move
      await expect(async () => {
        await startTicket(args, services);
      }).rejects.toThrow();
      
      // Verify ticket remains in todo
      const ticket = await mockTicketService.getTicket('0001');
      expect(ticket?.status).toBe('todo');
    });
  });

  describe('--allow-dirty option', () => {
    beforeEach(() => {
      // Set up GitService with uncommitted changes
      mockGitService.setUncommittedChanges(true);
      mockGitService.setStatus({
        modified: ['src/file1.ts', 'src/file2.ts'],
        added: ['src/new.ts'],
        deleted: [],
        untracked: ['temp.txt', 'debug.log'],
        ahead: 0,
        behind: 0
      });
    });

    it('should allow starting ticket with uncommitted changes when --allow-dirty is true', async () => {
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true
      };

      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('WARNING: Creating branch with uncommitted changes');
      expect(result.message).toContain('Modified: 2 file(s)');
      expect(result.message).toContain('Added: 1 file(s)');
      expect(result.message).toContain('Untracked: 2 file(s)');
      expect(result.message).toContain('These changes will be carried to the new branch');
    });

    it('should block starting ticket with uncommitted changes when --allow-dirty is false', async () => {
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: false
      };

      await expect(startTicket(args, services)).rejects.toThrow(
        'Cannot start ticket: You have uncommitted changes. Please commit or stash them first.'
      );
    });

    it('should block starting ticket with uncommitted changes when --allow-dirty is not specified', async () => {
      const args: StartTicketArgs = {
        id: '0001'
        // allowDirty not specified - defaults to false
      };

      await expect(startTicket(args, services)).rejects.toThrow(
        'Cannot start ticket: You have uncommitted changes. Please commit or stash them first.'
      );
    });

    it('should skip Git operations entirely with --no-branch flag', async () => {
      const args: StartTicketArgs = {
        id: '0001',
        noBranch: true,
        allowDirty: true  // Should be ignored with --no-branch
      };

      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Branch operations skipped (--no-branch)');
      expect(result.message).not.toContain('WARNING: Creating branch with uncommitted changes');
    });

    it('should show warning but create branch with --allow-dirty alone', async () => {
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true
      };

      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('WARNING: Creating branch with uncommitted changes');
      expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
    });

    it('should work normally when no uncommitted changes exist', async () => {
      // Set clean status (no changes)
      mockGitService.setStatus({
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        ahead: 0,
        behind: 0
      });
      
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true  // Flag present but not needed
      };

      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('WARNING: Creating branch with uncommitted changes');
      expect(result.message).toContain('Created and switched to branch');
    });

    it('should show correct counts for modified files only', async () => {
      mockGitService.setStatus({
        modified: ['file1.ts', 'file2.ts', 'file3.ts'],
        added: [],
        deleted: [],
        untracked: [],
        ahead: 0,
        behind: 0
      });
      
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true
      };

      const result = await startTicket(args, services);

      expect(result.message).toContain('Modified: 3 file(s)');
      expect(result.message).not.toContain('Added:');
      expect(result.message).not.toContain('Deleted:');
      expect(result.message).not.toContain('Untracked:');
    });

    it('should show all change types when present', async () => {
      mockGitService.setStatus({
        modified: ['file1.ts'],
        added: ['new1.ts', 'new2.ts'],
        deleted: ['old.ts'],
        untracked: ['temp1.txt', 'temp2.txt', 'temp3.txt'],
        ahead: 2,
        behind: 1
      });
      
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true
      };

      const result = await startTicket(args, services);

      expect(result.message).toContain('Modified: 1 file(s)');
      expect(result.message).toContain('Added: 2 file(s)');
      expect(result.message).toContain('Deleted: 1 file(s)');
      expect(result.message).toContain('Untracked: 3 file(s)');
    });

    it('should handle getStatus() failure gracefully', async () => {
      mockGitService.setStatusError(new Error('Git status failed'));
      
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true
      };

      // Should still work but without detailed warning
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      // Should fall back to generic warning or handle error appropriately
    });

    it('should handle non-repository case', async () => {
      mockGitService.setIsRepo(false);
      
      const args: StartTicketArgs = {
        id: '0001',
        allowDirty: true
      };

      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Git is not initialized');
    });
  });

  describe('GitService error handling', () => {
    it('should handle unexpected Git errors gracefully', async () => {
      // Mock GitService to throw unexpected error
      services.gitService = {
        isRepository: async () => { throw new Error('Unexpected Git error'); },
        hasUncommittedChanges: async () => false,
        fetch: async () => {},
        findBranches: async () => [],
        createBranch: async () => {},
        checkout: async () => {},
        getCurrentBranch: async () => 'main',
        getStatus: async () => ({ modified: [], added: [], deleted: [], untracked: [], ahead: 0, behind: 0 })
      } as GitService;

      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Started ticket #0001');
      expect(result.message).toContain('WARNING: Git operations failed');
      expect(result.message).toContain('Manual Git steps');
    });

    it('should show remote branch information when available', async () => {
      mockGitService.setBranches([
        'origin/feature/0001-remote-branch',
        'main'
      ]);
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Found remote branch: origin/feature/0001-remote-branch');
      expect(result.message).toContain('Creating local tracking branch');
    });
  });

  describe('--no-branch option', () => {
    beforeEach(() => {
      // Reset mocks for --no-branch tests
      mockTicketService = new MockTicketService();
      mockGitService = new MockGitService();
      services = {
        ticketService: mockTicketService,
        gitService: mockGitService
      };
    });

    describe('basic functionality', () => {
      it('should skip git operations when --no-branch is specified', async () => {
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
        expect(result.message).toContain('INFO: Branch operations skipped (--no-branch)');
        expect(result.message).not.toContain('Created and switched to branch');
        expect(result.message).not.toContain('WARNING: Could not fetch remote branches');
      });

      it('should update ticket status without branch operations', async () => {
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        // Verify ticket was started (this is tracked in MockTicketService)
        const ticket = await mockTicketService.getTicket('0001');
        expect(ticket.status).toBe('doing');
      });

      it('should still provide next action guidance with --no-branch', async () => {
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('Next Action:');
        expect(result.message).toContain('ait3 flow plan 0001');
      });
    });

    describe('protected branch warnings', () => {
      it('should warn when using --no-branch on main branch', async () => {
        mockGitService.setCurrentBranch('main');
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        const strippedMessage = stripAnsi(result.message);
        expect(strippedMessage).toContain('WARNING: Using --no-branch on \'main\' branch is not recommended for team collaboration');
        expect(strippedMessage).toContain('INFO: Branch operations skipped (--no-branch)');
      });

      it('should warn when using --no-branch on master branch', async () => {
        mockGitService.setCurrentBranch('master');
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        const strippedMessage = stripAnsi(result.message);
        expect(strippedMessage).toContain('WARNING: Using --no-branch on \'master\' branch is not recommended for team collaboration');
      });

      it('should warn when using --no-branch on develop branch', async () => {
        mockGitService.setCurrentBranch('develop');
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        const strippedMessage = stripAnsi(result.message);
        expect(strippedMessage).toContain('WARNING: Using --no-branch on \'develop\' branch is not recommended for team collaboration');
      });

      it('should warn when using --no-branch on development branch', async () => {
        mockGitService.setCurrentBranch('development');
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        const strippedMessage = stripAnsi(result.message);
        expect(strippedMessage).toContain('WARNING: Using --no-branch on \'development\' branch is not recommended for team collaboration');
      });

      it('should not warn when using --no-branch on feature branch', async () => {
        mockGitService.setCurrentBranch('feature/some-feature');
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('INFO: Branch operations skipped (--no-branch)');
        expect(result.message).not.toContain('WARNING: Using --no-branch');
      });
    });

    describe('enhanced output information', () => {
      it('should display comprehensive status information', async () => {
        mockGitService.setCurrentBranch('feature/current-work');
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        const message = stripAnsi(result.message);
        
        // Check for enhanced output elements
        expect(message).toContain('SUCCESS: Started ticket #0001');
        expect(message).toContain('Details:');
        expect(message).toContain('Status: doing');
        expect(message).toContain('Next Action:');
        expect(message).toContain('ait3 flow plan 0001');
      });

      it('should show ticket service information when available', async () => {
        // MockTicketService already has getServiceName method
        
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        // The current implementation doesn't show service type yet, 
        // but this test prepares for that enhancement
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
      });
    });

    describe('edge cases and error scenarios', () => {
      it('should work with --no-branch when not in a Git repository', async () => {
        mockGitService.setIsRepo(false);
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
        expect(result.message).toContain('INFO: Branch operations skipped (--no-branch)');
      });

      it('should allow uncommitted changes when using --no-branch', async () => {
        mockGitService.setUncommittedChanges(true);
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
        expect(result.message).toContain('INFO: Branch operations skipped (--no-branch)');
      });

      it('should work when GitService is unavailable with --no-branch', async () => {
        services.gitService = undefined;
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
        expect(result.message).toContain('INFO: Branch operations skipped (--no-branch)');
      });

      it('should still validate ticket ID format with --no-branch', async () => {
        const args: StartTicketArgs = { id: 'invalid', noBranch: true };
        
        await expect(startTicket(args, services)).rejects.toThrow(ValidationError);
      });

      it('should still handle TicketNotFoundError with --no-branch', async () => {
        mockTicketService.setError(new TicketNotFoundError('9999'));
        const args: StartTicketArgs = { id: '9999', noBranch: true };
        
        await expect(startTicket(args, services)).rejects.toThrow(TicketNotFoundError);
      });

      it('should still handle TicketAlreadyInProgressError with --no-branch', async () => {
        mockTicketService.setError(new TicketAlreadyInProgressError('0001'));
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        await expect(startTicket(args, services)).rejects.toThrow(TicketAlreadyInProgressError);
      });

      it('should still handle TicketAlreadyCompletedError with --no-branch', async () => {
        mockTicketService.setError(new TicketAlreadyCompletedError('0001'));
        const args: StartTicketArgs = { id: '0001', noBranch: true };
        
        await expect(startTicket(args, services)).rejects.toThrow(TicketAlreadyCompletedError);
      });
    });

    describe('compatibility and backward compatibility', () => {
      it('should maintain existing behavior when --no-branch is not specified', async () => {
        const args: StartTicketArgs = { id: '0001' }; // No noBranch flag
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
        expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
        expect(result.message).not.toContain('Branch operations skipped');
      });

      it('should work correctly when noBranch is explicitly false', async () => {
        const args: StartTicketArgs = { id: '0001', noBranch: false };
        
        const result = await startTicket(args, services);
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('SUCCESS: Started ticket #0001');
        expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
        expect(result.message).not.toContain('Branch operations skipped');
      });
    });
  });
});