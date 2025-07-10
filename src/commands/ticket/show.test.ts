import { describe, it, expect, beforeEach } from 'vitest';
import { showTicket } from './show.js';
import type { Services, ShowTicketArgs } from '@/common/types.js';
import type { TicketService } from '@/services/interfaces/TicketService.js';
import type { Ticket } from '@/common/types.js';
import { ValidationError, TicketNotFoundError } from '@/common/errors.js';
import chalk from 'chalk';

// Enable colors in tests
chalk.level = 3;

// Helper to strip ANSI color codes for testing
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

// Mock TicketService for unit testing
class MockTicketService implements TicketService {
  private tickets: Map<string, Ticket> = new Map();

  constructor(tickets: Ticket[] = []) {
    tickets.forEach(ticket => {
      this.tickets.set(ticket.id, ticket);
    });
  }

  async createTicket(): Promise<Ticket> {
    throw new Error('Not implemented for this test');
  }

  async listTickets(): Promise<Ticket[]> {
    throw new Error('Not implemented for this test');
  }

  async getTicket(id: string): Promise<Ticket | null> {
    return this.tickets.get(id) || null;
  }
}

describe('showTicket pure function', () => {
  let mockTicketService: MockTicketService;
  let services: Services;

  const sampleTicket: Ticket = {
    id: '0001',
    title: 'Test Ticket with Description',
    status: 'todo',
    priority: 'high',
    created: '2025-01-01T10:30:00Z',
    updated: '2025-01-01T11:45:00Z',
    assignee: 'developer@example.com',
    labels: ['feature', 'backend'],
    description: '# Ticket Description\n\nThis is a **sample** ticket with markdown content.\n\n## Requirements\n- Implement feature A\n- Test thoroughly\n- Document usage'
  };

  beforeEach(() => {
    mockTicketService = new MockTicketService([sampleTicket]);
    services = {
      ticketService: mockTicketService
    };
  });

  describe('successful ticket display', () => {
    it('should display ticket details when ticket exists', async () => {
      const args: ShowTicketArgs = { id: '0001' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      
      // Check for essential ticket information in output
      expect(result.message).toContain('Ticket #0001');
      expect(result.message).toContain('Test Ticket with Description');
      expect(result.message).toContain('Status:');
      expect(result.message).toContain('todo');
      expect(result.message).toContain('Priority:');
      expect(result.message).toContain('high');
      expect(result.message).toContain('Created:');
      expect(result.message).toContain('2025-01-01 10:30');
      expect(result.message).toContain('Updated:');
      expect(result.message).toContain('2025-01-01 11:45');
      expect(result.message).toContain('Assignee:');
      expect(result.message).toContain('developer@example.com');
      expect(result.message).toContain('Labels:');
      expect(result.message).toContain('feature, backend');
      
      // Check for markdown content
      expect(result.message).toContain('Description:');
      expect(result.message).toContain('This is a **sample** ticket');
      expect(result.message).toContain('Requirements');
      
      expect(result.data).toEqual(sampleTicket);
    });

    it('should show local file location for LocalTicketService', async () => {
      const args: ShowTicketArgs = { id: '0001' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Location.*\.tickets\/todo\/0001-/);
    });

    it('should show GitHub URL location for GitHubTicketService', async () => {
      // Mock GitHubTicketService
      const mockGitHubService = {
        getTicket: async () => ({
          id: '#82',
          title: 'GitHub Show Test',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: [],
          description: 'Test description'
        }),
        getConfig: () => ({ owner: 'testowner', repo: 'testrepo' })
      };

      const githubServices: Services = {
        ticketService: mockGitHubService as any
      };

      const args: ShowTicketArgs = { id: '82' };
      const result = await showTicket(args, githubServices);

      expect(result.success).toBe(true);
      expect(stripAnsi(result.message)).toContain('Location: https://github.com/testowner/testrepo/issues/82');
    });

    it('should display ticket with minimal metadata', async () => {
      const minimalTicket: Ticket = {
        id: '0002',
        title: 'Minimal Ticket',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-02T00:00:00Z',
        updated: '2025-01-02T00:00:00Z',
        labels: [],
        description: 'Simple description'
      };

      mockTicketService = new MockTicketService([minimalTicket]);
      services.ticketService = mockTicketService;

      const args: ShowTicketArgs = { id: '0002' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ticket #0002');
      expect(result.message).toContain('Minimal Ticket');
      expect(result.message).toContain('Status:');
      expect(result.message).toContain('doing');
      expect(result.message).toContain('Priority:');
      expect(result.message).toContain('medium');
      expect(result.message).not.toContain('Assignee:');
      expect(result.message).toContain('Labels:');
      expect(result.message).toContain('(none)');
      expect(result.message).toContain('Simple description');
    });

    it('should format dates in readable format', async () => {
      const args: ShowTicketArgs = { id: '0001' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      // Dates should be formatted as "YYYY-MM-DD HH:MM" not ISO format
      expect(result.message).toContain('Created:');
      expect(result.message).toContain('2025-01-01 10:30');
      expect(result.message).toContain('Updated:');
      expect(result.message).toContain('2025-01-01 11:45');
      expect(result.message).not.toContain('T10:30:00Z');
    });

    it('should include metadata section separator', async () => {
      const args: ShowTicketArgs = { id: '0001' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      // Should have clear separation between metadata and content
      expect(result.message).toContain('────');
      
      // Description section should come after separator
      const separatorIndex = result.message.indexOf('────');
      const descriptionIndex = result.message.indexOf('Description:');
      expect(descriptionIndex).toBeGreaterThan(separatorIndex);
    });
  });

  describe('ticket not found handling', () => {
    it('should handle non-existent ticket gracefully', async () => {
      const args: ShowTicketArgs = { id: '9999' };
      
      await expect(showTicket(args, services)).rejects.toThrow(TicketNotFoundError);
    });

    it('should throw TicketNotFoundError with correct ticket ID', async () => {
      const args: ShowTicketArgs = { id: '0404' };
      
      try {
        await showTicket(args, services);
        expect.fail('Should have thrown TicketNotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(TicketNotFoundError);
        if (error instanceof TicketNotFoundError) {
          expect(error.ticketId).toBe('0404');
          expect(error.message).toContain('Ticket with ID \'0404\' not found');
        }
      }
    });
  });

  describe('input validation', () => {
    it('should validate ticket ID format', async () => {
      const invalidIds = ['', 'abc', '00001', 'invalid', '10000', '#10000'];
      
      for (const invalidId of invalidIds) {
        const args: ShowTicketArgs = { id: invalidId };
        await expect(showTicket(args, services)).rejects.toThrow(ValidationError);
      }
    });

    it('should accept both local and GitHub ID formats', async () => {
      // These are valid formats that will throw TicketNotFoundError instead (except 0001 which exists)
      const validIds = ['0002', '123', '#123', '1', '#1'];
      
      for (const validId of validIds) {
        const args: ShowTicketArgs = { id: validId };
        await expect(showTicket(args, services)).rejects.toThrow(TicketNotFoundError);
      }
      
      // Test that 0001 exists and returns successfully
      const existingArgs: ShowTicketArgs = { id: '0001' };
      const result = await showTicket(existingArgs, services);
      expect(result.success).toBe(true);
    });

    it('should accept valid 4-digit IDs', async () => {
      // This should not throw validation error (though ticket may not exist)
      const args: ShowTicketArgs = { id: '0999' };
      
      // Should throw TicketNotFoundError, not ValidationError
      await expect(showTicket(args, services)).rejects.toThrow(TicketNotFoundError);
    });
  });

  describe('output formatting', () => {
    it('should use colorized status display', async () => {
      const args: ShowTicketArgs = { id: '0001' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      // Should contain ANSI color codes for status/priority
      expect(result.message).toMatch(/\[3\d*m/); // ANSI color codes
    });

    it('should handle empty labels gracefully', async () => {
      const ticketWithoutLabels: Ticket = {
        id: '0003',
        title: 'No Labels Ticket',
        status: 'done',
        priority: 'low',
        created: '2025-01-03T00:00:00Z',
        updated: '2025-01-03T00:00:00Z',
        labels: [],
        description: 'No labels here'
      };

      mockTicketService = new MockTicketService([ticketWithoutLabels]);
      services.ticketService = mockTicketService;

      const args: ShowTicketArgs = { id: '0003' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Labels:');
      expect(result.message).toContain('(none)');
    });

    it('should handle missing description gracefully', async () => {
      const ticketWithoutDescription: Ticket = {
        id: '0004',
        title: 'No Description Ticket',
        status: 'todo',
        priority: 'medium',
        created: '2025-01-04T00:00:00Z',
        updated: '2025-01-04T00:00:00Z',
        labels: ['test']
      };

      mockTicketService = new MockTicketService([ticketWithoutDescription]);
      services.ticketService = mockTicketService;

      const args: ShowTicketArgs = { id: '0004' };
      const result = await showTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Description:');
      expect(result.message).toContain('(No description provided)');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      services.ticketService = {
        async getTicket() {
          throw new Error('Service error');
        },
        async createTicket() {
          throw new Error('Not implemented');
        },
        async listTickets() {
          throw new Error('Not implemented');
        }
      } as TicketService;

      const args: ShowTicketArgs = { id: '0001' };
      
      await expect(showTicket(args, services)).rejects.toThrow('Failed to show ticket: Service error');
    });
  });
});