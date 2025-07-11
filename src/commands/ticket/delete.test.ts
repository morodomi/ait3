import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteTicket } from './delete.js';
import type { Services, Ticket } from '../../common/types.js';
import { ValidationError, TicketNotFoundError } from '../../common/errors.js';
import type { TicketService } from '../../services/interfaces/TicketService.js';

describe('deleteTicket', () => {
  let mockServices: Services;
  let mockTicket: Ticket;

  beforeEach(() => {
    mockTicket = {
      id: '0001',
      title: 'Test ticket',
      status: 'todo',
      priority: 'medium',
      created: '2024-07-10T10:00:00Z',
      updated: '2024-07-10T10:00:00Z',
      labels: ['test'],
      description: '# Test Ticket\n\nThis is a test ticket for deletion.',
      location: {
        type: 'local',
        path: '.tickets/todo/0001-test-ticket.md'
      }
    };

    const mockTicketService = {
      getTicket: vi.fn(),
      deleteTicket: vi.fn(),
      createTicket: vi.fn(),
      updateTicket: vi.fn(),
      listTickets: vi.fn(),
      moveTicket: vi.fn(),
      getNextId: vi.fn(),
      undoLastAction: vi.fn(),
    };
    
    mockServices = {
      ticketService: mockTicketService as TicketService,
    };
  });

  describe('input validation', () => {
    it('should require ticket ID', async () => {
      await expect(deleteTicket({ id: '' }, mockServices))
        .rejects.toThrow(ValidationError);
    });

    it('should validate ticket ID format', async () => {
      await expect(deleteTicket({ id: 'invalid' }, mockServices))
        .rejects.toThrow(ValidationError);
    });

    it('should accept local format ID (0001)', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      expect(result.success).toBe(true);
    });

    it('should accept GitHub format ID (#70, 70)', async () => {
      const githubTicket = { ...mockTicket, id: '#70' };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(githubTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '70' }, mockServices);
      expect(result.success).toBe(true);
    });
  });

  describe('ticket existence validation', () => {
    it('should throw TicketNotFoundError for non-existent ticket', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(null);

      await expect(deleteTicket({ id: '9999' }, mockServices))
        .rejects.toThrow(TicketNotFoundError);
    });

    it('should handle service errors during ticket lookup', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockRejectedValue(new Error('Service error'));

      await expect(deleteTicket({ id: '0001' }, mockServices))
        .rejects.toThrow('Failed to delete ticket');
    });
  });

  describe('status validation', () => {
    it('should block deletion of doing status tickets', async () => {
      const doingTicket = { ...mockTicket, status: 'doing' as const };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(doingTicket);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot delete ticket');
      expect(result.message).toContain('doing');
      expect(result.data?.suggestion).toContain('ait3 ticket complete');
      expect(mockServices.ticketService.deleteTicket).not.toHaveBeenCalled();
    });

    it('should allow deletion of todo status tickets', async () => {
      const todoTicket = { ...mockTicket, status: 'todo' as const };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(todoTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result.success).toBe(true);
      expect(mockServices.ticketService.deleteTicket).toHaveBeenCalledWith('0001');
    });

    it('should allow deletion of done status tickets', async () => {
      const doneTicket = { ...mockTicket, status: 'done' as const };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(doneTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result.success).toBe(true);
      expect(mockServices.ticketService.deleteTicket).toHaveBeenCalledWith('0001');
    });
  });

  describe('dry-run functionality', () => {
    it('should show deletion preview without actually deleting', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);

      const result = await deleteTicket({ id: '0001', dryRun: true }, mockServices);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('[DRY RUN]');
      expect(result.data?.ticketDetails).toEqual(mockTicket);
      expect(mockServices.ticketService.deleteTicket).not.toHaveBeenCalled();
    });

    it('should show doing status in dry-run without error', async () => {
      const doingTicket = { ...mockTicket, status: 'doing' as const };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(doingTicket);

      const result = await deleteTicket({ id: '0001', dryRun: true }, mockServices);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('[DRY RUN]');
      expect(result.data?.warning).toContain('doing status would be blocked');
    });
  });

  describe('successful deletion', () => {
    it('should delete ticket and return complete information', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
      expect(result.message).toContain('0001');
      expect(result.data?.deletedTicket).toEqual(mockTicket);
      expect(result.data?.recoveryInfo).toContain('preserved in your context');
      expect(mockServices.ticketService.deleteTicket).toHaveBeenCalledWith('0001');
    });

    it('should format GitHub ticket ID correctly in response', async () => {
      const githubTicket = { ...mockTicket, id: '#70' };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(githubTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '70' }, mockServices);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('#70');
    });

    it('should include full content in response for AI recovery', async () => {
      const ticketWithContent = {
        ...mockTicket,
        description: '# Test Ticket\n\nDetailed description\n\n## Acceptance Criteria\n- [ ] Item 1'
      };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(ticketWithContent);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result.data?.deletedTicket.description).toContain('Detailed description');
      expect(result.data?.deletedTicket.description).toContain('Acceptance Criteria');
    });
  });

  describe('error handling', () => {
    it('should handle service deletion errors', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockRejectedValue(new Error('Deletion failed'));

      await expect(deleteTicket({ id: '0001' }, mockServices))
        .rejects.toThrow('Failed to delete ticket');
    });

    it('should preserve original error types', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(null);

      await expect(deleteTicket({ id: '0001' }, mockServices))
        .rejects.toThrow(TicketNotFoundError);
    });
  });

  describe('response structure', () => {
    it('should include all required fields in success response', async () => {
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(mockTicket);
      mockServices.ticketService.deleteTicket = vi.fn().mockResolvedValue(undefined);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted successfully'),
        data: {
          deletedTicket: expect.objectContaining({
            id: '0001',
            title: expect.any(String),
            status: expect.any(String),
            description: expect.any(String)
          }),
          recoveryInfo: expect.stringContaining('preserved in your context')
        }
      });
    });

    it('should include current ticket details in doing status error', async () => {
      const doingTicket = { ...mockTicket, status: 'doing' as const };
      mockServices.ticketService.getTicket = vi.fn().mockResolvedValue(doingTicket);

      const result = await deleteTicket({ id: '0001' }, mockServices);
      
      expect(result.success).toBe(false);
      expect(result.data?.currentTicket).toEqual(doingTicket);
      expect(result.data?.suggestion).toContain('ait3 ticket complete 0001');
    });
  });
});