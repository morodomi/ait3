import { describe, it, expect, beforeEach, vi } from 'vitest';
import { undoTicket } from './undo.js';
import type { Services, UndoTicketArgs } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';

describe('undoTicket', () => {
  let mockServices: Services;

  beforeEach(() => {
    // Create mock services
    mockServices = {
      ticketService: {
        getTicket: vi.fn(),
        undoTicket: vi.fn(),
        createTicket: vi.fn(),
        listTickets: vi.fn(),
        deleteTicket: vi.fn(),
        startTicket: vi.fn(),
        completeTicket: vi.fn()
      },
      gitService: {
        isRepository: vi.fn(),
        hasUncommittedChanges: vi.fn(),
        fetch: vi.fn(),
        findBranches: vi.fn(),
        createBranch: vi.fn(),
        checkout: vi.fn(),
        getCurrentBranch: vi.fn(),
        getMergeBase: vi.fn(),
        getCommits: vi.fn(),
        moveFile: vi.fn() // Git mv functionality
      }
    };
  });

  describe('input validation', () => {
    it('should throw ValidationError for invalid ticket ID format', async () => {
      const args: UndoTicketArgs = { id: 'invalid' };

      await expect(undoTicket(args, mockServices))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty ticket ID', async () => {
      const args: UndoTicketArgs = { id: '' };

      await expect(undoTicket(args, mockServices))
        .rejects.toThrow(ValidationError);
    });

    it('should accept valid 4-digit ticket ID', async () => {
      const args: UndoTicketArgs = { id: '0001' };
      const mockTicket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'doing' as const,
        priority: 'medium' as const,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.undoTicket = vi.fn().mockResolvedValue(undefined);

      const result = await undoTicket(args, mockServices);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS');
    });
  });

  describe('ticket status validation', () => {
    it('should throw TicketNotFoundError for non-existent ticket', async () => {
      const args: UndoTicketArgs = { id: '9999' };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(null);

      await expect(undoTicket(args, mockServices))
        .rejects.toThrow(TicketNotFoundError);
    });

    it('should throw error for todo status ticket (cannot undo)', async () => {
      const args: UndoTicketArgs = { id: '0001' };
      const mockTicket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'todo' as const,
        priority: 'medium' as const,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);

      await expect(undoTicket(args, mockServices))
        .rejects.toThrow('Cannot undo ticket #0001: already in \'todo\' state');
    });

    it('should handle doing status ticket (undo to todo)', async () => {
      const args: UndoTicketArgs = { id: '0001' };
      const mockTicket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'doing' as const,
        priority: 'medium' as const,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        started: '2025-01-01T01:00:00Z',
        labels: []
      };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.undoTicket = vi.fn().mockResolvedValue(undefined);

      const result = await undoTicket(args, mockServices);

      expect(result.success).toBe(true);
      expect(result.message).toContain('doing → todo');
      expect(mockServices.ticketService.undoTicket).toHaveBeenCalledWith('0001');
    });

    it('should handle done status ticket (undo to doing)', async () => {
      const args: UndoTicketArgs = { id: '0001' };
      const mockTicket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'done' as const,
        priority: 'medium' as const,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        started: '2025-01-01T01:00:00Z',
        completed: '2025-01-01T02:00:00Z',
        labels: []
      };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.undoTicket = vi.fn().mockResolvedValue(undefined);

      const result = await undoTicket(args, mockServices);

      expect(result.success).toBe(true);
      expect(result.message).toContain('done → doing');
      expect(mockServices.ticketService.undoTicket).toHaveBeenCalledWith('0001');
    });
  });

  describe('dry-run mode', () => {
    it('should show preview without executing when dry-run is enabled', async () => {
      const args: UndoTicketArgs = { id: '0001', dryRun: true };
      const mockTicket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'doing' as const,
        priority: 'medium' as const,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        started: '2025-01-01T01:00:00Z',
        labels: []
      };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);

      const result = await undoTicket(args, mockServices);

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(result.message).toContain('doing → todo');
      expect(mockServices.ticketService.undoTicket).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate service layer errors', async () => {
      const args: UndoTicketArgs = { id: '0001' };
      const mockTicket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'doing' as const,
        priority: 'medium' as const,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.undoTicket = vi.fn().mockRejectedValue(new Error('File system error'));

      await expect(undoTicket(args, mockServices))
        .rejects.toThrow('Failed to undo ticket: File system error');
    });

    it('should handle unknown errors gracefully', async () => {
      const args: UndoTicketArgs = { id: '0001' };

      mockServices.ticketService.getTicket = vi.fn().mockRejectedValue('Unknown error');

      await expect(undoTicket(args, mockServices))
        .rejects.toThrow('Failed to undo ticket: Unknown error');
    });
  });
});