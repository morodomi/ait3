import { describe, it, expect, beforeEach } from 'vitest';
import { startTicket } from '../../../src/commands/ticket/start.js';
import type { Services, StartTicketArgs } from '../../../src/common/types.js';
import type { TicketService } from '../../../src/services/interfaces/TicketService.js';
import { ValidationError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '../../../src/common/errors.js';

// Mock TicketService for unit testing
class MockTicketService implements TicketService {
  private shouldThrowError: Error | null = null;

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
    // Return a mock ticket for successful tests
    if (!this.shouldThrowError) {
      return {
        id,
        title: 'Test Ticket',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: new Date().toISOString(),
        labels: []
      };
    }
    return null;
  }

  async startTicket(id: string): Promise<void> {
    if (this.shouldThrowError) {
      throw this.shouldThrowError;
    }
    // Mock successful start
    return Promise.resolve();
  }
}

describe('startTicket pure function', () => {
  let mockTicketService: MockTicketService;
  let services: Services;

  beforeEach(() => {
    mockTicketService = new MockTicketService();
    services = {
      ticketService: mockTicketService
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
});