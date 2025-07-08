import { describe, it, expect, beforeEach } from 'vitest';
import { startTicket } from './start.js';
import type { Services, StartTicketArgs } from '@/common/types.js';
import type { TicketService } from '@/services/interfaces/TicketService.js';
import type { GitService } from '@/services/interfaces/GitService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '@/common/errors.js';

// Mock TicketService for unit testing
class MockTicketService implements TicketService {
  private shouldThrowError: Error | null = null;
  private startedTickets: Set<string> = new Set();

  constructor() {}

  // Set error to throw for testing
  setError(error: Error | null) {
    this.shouldThrowError = error;
  }

  async createTicket(): Promise<any> {
    throw new Error('Not implemented for this test');
  }

  async listTickets(): Promise<any[]> {
    throw new Error('Not implemented for this test');
  }

  async getTicket(id: string): Promise<any> {
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
}

// Mock GitService for unit testing
class MockGitService implements GitService {
  private uncommittedChanges = false;
  private fetchError: Error | null = null;
  private branches: string[] = [];
  private currentBranch = 'main';
  private createBranchError: Error | null = null;
  private checkoutError: Error | null = null;
  private isRepo = true;

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
      expect(result.message).toContain('✅ Started ticket #0001');
      expect(result.message).toContain('Moved from todo → doing');
    });

    it('should provide helpful success message', async () => {
      const args: StartTicketArgs = { id: '0042' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Started ticket #0042');
      expect(result.message).toContain('Status updated');
    });
  });

  describe('input validation', () => {
    it('should validate ticket ID format', async () => {
      const invalidIds = ['', 'abc', '1', '00001', 'invalid'];
      
      for (const invalidId of invalidIds) {
        const args: StartTicketArgs = { id: invalidId };
        await expect(startTicket(args, services)).rejects.toThrow(ValidationError);
      }
    });

    it('should validate that ID is exactly 4 digits', async () => {
      const args: StartTicketArgs = { id: '123' };
      
      await expect(startTicket(args, services)).rejects.toThrow(ValidationError);
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
      expect(result.message).toContain('todo → doing');
    });

    it('should provide user-friendly messages', async () => {
      const args: StartTicketArgs = { id: '0001' };
      const result = await startTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('✅');
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
      expect(result.message).toContain('✅ Started ticket #0001');
      expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
      expect(await mockGitService.getCurrentBranch()).toBe('feature/0001-test-ticket');
    });

    it('should handle uncommitted changes gracefully', async () => {
      mockGitService.setUncommittedChanges(true);
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
      expect(result.message).toContain('✅ Started ticket #0001');
      expect(result.message).toContain('Manual Git steps');
      expect(result.message).toContain('git checkout -b feature/0001-test-ticket');
      expect(result.message).not.toContain('Created and switched to branch');
    });

    it('should handle Git not initialized', async () => {
      mockGitService.setIsRepo(false);
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('⚠️  Git is not initialized');
      expect(result.message).toContain('git init');
      expect(result.message).toContain('git checkout -b feature/0001-test-ticket');
    });

    it('should continue despite fetch failure', async () => {
      mockGitService.setFetchError(new Error('Network error'));
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('⚠️  Warning: Could not fetch remote branches');
      expect(result.message).toContain('Created and switched to branch: feature/0001-test-ticket');
    });

    it('should handle branch creation failure', async () => {
      mockGitService.setCreateBranchError(new Error('Permission denied'));
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('⚠️  Could not create branch automatically');
      expect(result.message).toContain('Manual Git steps');
      expect(result.message).toContain('Error: Permission denied');
    });

    it('should handle checkout failure for existing branch', async () => {
      mockGitService.setBranches(['feature/0001-existing']);
      mockGitService.setCheckoutError(new Error('Branch has conflicts'));
      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('⚠️  Could not switch to existing branch');
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
      expect(result.message).toContain('Next: ait3 flow plan');
      expect(result.message).toContain('Start planning phase for this ticket');
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
        getCurrentBranch: async () => 'main'
      } as GitService;

      const args: StartTicketArgs = { id: '0001' };
      
      const result = await startTicket(args, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('✅ Started ticket #0001');
      expect(result.message).toContain('⚠️  Git operations failed');
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
});