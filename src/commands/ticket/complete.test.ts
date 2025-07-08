import { describe, it, expect, beforeEach } from 'vitest';
import { completeTicket } from './complete.js';
import type { Services, CompleteTicketArgs } from '@/common/types.js';
import type { TicketService } from '@/services/interfaces/TicketService.js';
import { ValidationError, TicketNotFoundError, TicketNotStartedError, TicketAlreadyCompletedError } from '@/common/errors.js';
import chalk from 'chalk';

// Enable colors in tests
chalk.level = 3;

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
        status: 'done',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        started: '2025-01-01T10:00:00Z',
        completed: new Date().toISOString(),
        updated: new Date().toISOString(),
        labels: []
      };
    }
    return null;
  }

  async startTicket(): Promise<void> {
    throw new Error('Not implemented for this test');
  }

  async completeTicket(id: string): Promise<void> {
    if (this.shouldThrowError) {
      throw this.shouldThrowError;
    }
    // Mock successful completion
    return Promise.resolve();
  }
}

describe('completeTicket pure function', () => {
  let mockTicketService: MockTicketService;
  let services: Services;

  beforeEach(() => {
    mockTicketService = new MockTicketService();
    services = {
      ticketService: mockTicketService
    };
  });

  describe('successful ticket completion', () => {
    it('should complete ticket successfully with valid ID', async () => {
      const args: CompleteTicketArgs = { id: '0001' };
      const result = await completeTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Completed ticket #0001');
      expect(result.message).toContain('Moved from doing → done');
    });

    it('should provide helpful success message', async () => {
      const args: CompleteTicketArgs = { id: '0042' };
      const result = await completeTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Completed ticket #0042');
      expect(result.message).toContain('Status updated');
    });
  });

  describe('input validation', () => {
    it('should validate ticket ID format', async () => {
      const invalidIds = ['', 'abc', '1', '00001', 'invalid'];
      
      for (const invalidId of invalidIds) {
        const args: CompleteTicketArgs = { id: invalidId };
        await expect(completeTicket(args, services)).rejects.toThrow(ValidationError);
      }
    });

    it('should validate that ID is exactly 4 digits', async () => {
      const args: CompleteTicketArgs = { id: '123' };
      
      await expect(completeTicket(args, services)).rejects.toThrow(ValidationError);
    });

    it('should accept valid 4-digit IDs', async () => {
      const args: CompleteTicketArgs = { id: '0999' };
      
      // This should not throw ValidationError
      const result = await completeTicket(args, services);
      expect(result.success).toBe(true);
    });

    it('should handle empty ID gracefully', async () => {
      const args: CompleteTicketArgs = { id: '' };
      
      await expect(completeTicket(args, services)).rejects.toThrow(ValidationError);
    });
  });

  describe('ticket not found handling', () => {
    it('should handle non-existent ticket gracefully', async () => {
      mockTicketService.setError(new TicketNotFoundError('9999'));
      const args: CompleteTicketArgs = { id: '9999' };
      
      await expect(completeTicket(args, services)).rejects.toThrow(TicketNotFoundError);
    });

    it('should throw TicketNotFoundError with correct ticket ID', async () => {
      const ticketId = '0404';
      mockTicketService.setError(new TicketNotFoundError(ticketId));
      const args: CompleteTicketArgs = { id: ticketId };
      
      try {
        await completeTicket(args, services);
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
    it('should handle ticket not yet started', async () => {
      const ticketId = '0001';
      mockTicketService.setError(new TicketNotStartedError(ticketId));
      const args: CompleteTicketArgs = { id: ticketId };
      
      await expect(completeTicket(args, services)).rejects.toThrow(TicketNotStartedError);
    });

    it('should handle ticket already completed', async () => {
      const ticketId = '0002';
      mockTicketService.setError(new TicketAlreadyCompletedError(ticketId));
      const args: CompleteTicketArgs = { id: ticketId };
      
      await expect(completeTicket(args, services)).rejects.toThrow(TicketAlreadyCompletedError);
    });

    it('should throw TicketNotStartedError with correct message', async () => {
      const ticketId = '0003';
      mockTicketService.setError(new TicketNotStartedError(ticketId));
      const args: CompleteTicketArgs = { id: ticketId };
      
      try {
        await completeTicket(args, services);
        expect.fail('Should have thrown TicketNotStartedError');
      } catch (error) {
        expect(error).toBeInstanceOf(TicketNotStartedError);
        if (error instanceof TicketNotStartedError) {
          expect(error.ticketId).toBe(ticketId);
          expect(error.message).toContain('has not been started yet');
        }
      }
    });

    it('should throw TicketAlreadyCompletedError with correct message', async () => {
      const ticketId = '0004';
      mockTicketService.setError(new TicketAlreadyCompletedError(ticketId));
      const args: CompleteTicketArgs = { id: ticketId };
      
      try {
        await completeTicket(args, services);
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
      const args: CompleteTicketArgs = { id: '0001' };
      
      await expect(completeTicket(args, services)).rejects.toThrow('Failed to complete ticket: Service error');
    });

    it('should preserve specific error types', async () => {
      const specificError = new ValidationError('Custom validation error');
      mockTicketService.setError(specificError);
      const args: CompleteTicketArgs = { id: '0001' };
      
      await expect(completeTicket(args, services)).rejects.toThrow(ValidationError);
    });

    it('should wrap unknown errors with context', async () => {
      mockTicketService.setError(new Error('Unknown error'));
      const args: CompleteTicketArgs = { id: '0001' };
      
      try {
        await completeTicket(args, services);
        expect.fail('Should have thrown wrapped error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to complete ticket: Unknown error');
      }
    });
  });

  describe('output formatting', () => {
    it('should include ticket ID in success message', async () => {
      const args: CompleteTicketArgs = { id: '0123' };
      const result = await completeTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('#0123');
    });

    it('should use colorized output', async () => {
      const args: CompleteTicketArgs = { id: '0001' };
      const result = await completeTicket(args, services);

      expect(result.success).toBe(true);
      // Should contain ANSI color codes
      expect(result.message).toMatch(/\[3\d*m/); // ANSI color codes
    });

    it('should indicate status transition', async () => {
      const args: CompleteTicketArgs = { id: '0001' };
      const result = await completeTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('doing → done');
    });

    it('should provide user-friendly messages', async () => {
      const args: CompleteTicketArgs = { id: '0001' };
      const result = await completeTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS:');
      expect(result.message).toContain('Completed');
    });
  });
});