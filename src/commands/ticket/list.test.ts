import { describe, it, expect, beforeEach } from 'vitest';
import { listTickets } from './list.js';
import type { Services, ListTicketsArgs } from '@/common/types.js';
import type { TicketService } from '@/services/interfaces/TicketService.js';
import type { Ticket } from '@/common/types.js';
import { ValidationError } from '@/common/errors.js';

// Mock TicketService for unit testing
class MockTicketService implements TicketService {
  private tickets: Ticket[] = [];

  constructor(tickets: Ticket[] = []) {
    this.tickets = tickets;
  }

  async createTicket(): Promise<Ticket> {
    throw new Error('Not implemented for this test');
  }

  async listTickets(options?: { status?: string; priority?: string }): Promise<Ticket[]> {
    let filtered = [...this.tickets];
    
    if (options?.status) {
      filtered = filtered.filter(ticket => ticket.status === options.status);
    }
    
    if (options?.priority) {
      filtered = filtered.filter(ticket => ticket.priority === options.priority);
    }
    
    return filtered;
  }
}

describe('listTickets pure function', () => {
  let mockTicketService: MockTicketService;
  let services: Services;

  beforeEach(() => {
    mockTicketService = new MockTicketService([
      {
        id: '0001',
        title: 'Test Ticket 1',
        status: 'todo',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: ['test']
      },
      {
        id: '0002', 
        title: 'Test Ticket 2',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-02T00:00:00Z',
        updated: '2025-01-02T00:00:00Z',
        labels: ['test', 'important']
      },
      {
        id: '0003',
        title: 'Test Ticket 3', 
        status: 'done',
        priority: 'low',
        created: '2025-01-03T00:00:00Z',
        updated: '2025-01-03T00:00:00Z',
        labels: []
      }
    ]);

    services = {
      ticketService: mockTicketService
    };
  });

  describe('basic listing functionality', () => {
    it('should list all tickets when no filters provided', async () => {
      const args: ListTicketsArgs = {};
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 3 tickets');
      expect(result.message).toContain('Test Ticket 1');
      expect(result.message).toContain('Test Ticket 2');  
      expect(result.message).toContain('Test Ticket 3');
      expect(result.data).toHaveLength(3);
    });

    it('should handle empty ticket list gracefully', async () => {
      services.ticketService = new MockTicketService([]);
      const args: ListTicketsArgs = {};
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No tickets found');
    });
  });

  describe('status filtering', () => {
    it('should filter tickets by todo status', async () => {
      const args: ListTicketsArgs = { status: 'todo' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 tickets');
      expect(result.message).toContain('Test Ticket 1');
      expect(result.message).not.toContain('Test Ticket 2');
      expect(result.data).toHaveLength(1);
    });

    it('should filter tickets by doing status', async () => {
      const args: ListTicketsArgs = { status: 'doing' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 tickets');
      expect(result.message).toContain('Test Ticket 2');
      expect(result.data).toHaveLength(1);
    });

    it('should filter tickets by done status', async () => {
      const args: ListTicketsArgs = { status: 'done' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 tickets');
      expect(result.message).toContain('Test Ticket 3');
      expect(result.data).toHaveLength(1);
    });

    it('should validate status values', async () => {
      const args: ListTicketsArgs = { status: 'invalid' as any };
      
      await expect(listTickets(args, services)).rejects.toThrow(ValidationError);
    });
  });

  describe('priority filtering', () => {
    it('should filter tickets by high priority', async () => {
      const args: ListTicketsArgs = { priority: 'high' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 tickets');
      expect(result.message).toContain('Test Ticket 1');
      expect(result.data).toHaveLength(1);
    });

    it('should filter tickets by medium priority', async () => {
      const args: ListTicketsArgs = { priority: 'medium' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 tickets');
      expect(result.message).toContain('Test Ticket 2');
      expect(result.data).toHaveLength(1);
    });

    it('should validate priority values', async () => {
      const args: ListTicketsArgs = { priority: 'invalid' as any };
      
      await expect(listTickets(args, services)).rejects.toThrow(ValidationError);
    });
  });

  describe('combined filtering', () => {
    it('should filter by both status and priority', async () => {
      const args: ListTicketsArgs = { status: 'todo', priority: 'high' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 tickets');
      expect(result.message).toContain('Test Ticket 1');
      expect(result.data).toHaveLength(1);
    });

    it('should return empty when filters match nothing', async () => {
      const args: ListTicketsArgs = { status: 'done', priority: 'high' };
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No tickets found');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('output formatting', () => {
    it('should include table headers in output', async () => {
      const args: ListTicketsArgs = {};
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('ID');
      expect(result.message).toContain('Title');
      expect(result.message).toContain('Status');
      expect(result.message).toContain('Priority');
    });

    it('should format ticket information in readable table', async () => {
      const args: ListTicketsArgs = {};
      const result = await listTickets(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('#0001');
      expect(result.message).toContain('todo');
      expect(result.message).toContain('high');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      services.ticketService = {
        async listTickets() {
          throw new Error('Service error');
        },
        async createTicket() {
          throw new Error('Not implemented');
        }
      } as TicketService;

      const args: ListTicketsArgs = {};
      
      await expect(listTickets(args, services)).rejects.toThrow('Failed to list tickets: Service error');
    });
  });
});