import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketMigrationService } from './TicketMigrationService.js';
import type { TicketService, Ticket } from '../interfaces/TicketService.js';

describe('TicketMigrationService status handling', () => {
  let migrationService: TicketMigrationService;
  let mockLocalService: TicketService;
  let mockGitHubService: TicketService;
  let createdTickets: Ticket[];

  beforeEach(() => {
    vi.clearAllMocks();
    migrationService = new TicketMigrationService();
    createdTickets = [];

    // Mock local service
    mockLocalService = {
      createTicket: vi.fn(),
      listTickets: vi.fn(),
      getTicket: vi.fn(),
      startTicket: vi.fn(),
      completeTicket: vi.fn(),
      undoTicket: vi.fn()
    };

    // Mock GitHub service
    mockGitHubService = {
      createTicket: vi.fn().mockImplementation(async (title: string) => {
        const ticket: Ticket = {
          id: `#${createdTickets.length + 1}`,
          title,
          status: 'todo',
          priority: 'medium',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          labels: []
        };
        createdTickets.push(ticket);
        return ticket;
      }),
      listTickets: vi.fn(),
      getTicket: vi.fn(),
      startTicket: vi.fn(),
      completeTicket: vi.fn(),
      undoTicket: vi.fn()
    };
  });

  describe('migrateLocalToGitHub with status handling', () => {
    it('should close tickets with done status after migration', async () => {
      const doneTicket: Ticket = {
        id: '0001',
        title: 'Completed task',
        status: 'done',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: ['feature']
      };

      vi.mocked(mockLocalService.listTickets).mockResolvedValue([doneTicket]);
      vi.mocked(mockLocalService.getTicket).mockResolvedValue(doneTicket);

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      expect(mockGitHubService.createTicket).toHaveBeenCalledWith('Completed task', {
        priority: 'high',
        labels: ['feature'],
        description: undefined,
        assignee: undefined
      });
      
      // Should call completeTicket for done status
      expect(mockGitHubService.completeTicket).toHaveBeenCalledWith('#1');
    });

    it('should start tickets with doing status after migration', async () => {
      const doingTicket: Ticket = {
        id: '0002',
        title: 'Work in progress',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      vi.mocked(mockLocalService.listTickets).mockResolvedValue([doingTicket]);
      vi.mocked(mockLocalService.getTicket).mockResolvedValue(doingTicket);

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      
      // Should call startTicket for doing status
      expect(mockGitHubService.startTicket).toHaveBeenCalledWith('#1');
      expect(mockGitHubService.completeTicket).not.toHaveBeenCalled();
    });

    it('should not call status methods for todo tickets', async () => {
      const todoTicket: Ticket = {
        id: '0003',
        title: 'New task',
        status: 'todo',
        priority: 'low',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      vi.mocked(mockLocalService.listTickets).mockResolvedValue([todoTicket]);
      vi.mocked(mockLocalService.getTicket).mockResolvedValue(todoTicket);

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      
      // Should not call any status methods for todo
      expect(mockGitHubService.startTicket).not.toHaveBeenCalled();
      expect(mockGitHubService.completeTicket).not.toHaveBeenCalled();
    });

    it('should handle mixed statuses correctly', async () => {
      const tickets: Ticket[] = [
        {
          id: '0001',
          title: 'Todo task',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        },
        {
          id: '0002',
          title: 'Doing task',
          status: 'doing',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        },
        {
          id: '0003',
          title: 'Done task',
          status: 'done',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        }
      ];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(tickets);
      vi.mocked(mockLocalService.getTicket)
        .mockResolvedValueOnce(tickets[0])
        .mockResolvedValueOnce(tickets[1])
        .mockResolvedValueOnce(tickets[2]);

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(3);
      
      // Verify status calls
      expect(mockGitHubService.startTicket).toHaveBeenCalledTimes(1);
      expect(mockGitHubService.startTicket).toHaveBeenCalledWith('#2');
      
      expect(mockGitHubService.completeTicket).toHaveBeenCalledTimes(1);
      expect(mockGitHubService.completeTicket).toHaveBeenCalledWith('#3');
    });

    it('should handle status update failures gracefully', async () => {
      const doneTicket: Ticket = {
        id: '0001',
        title: 'Completed task',
        status: 'done',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      vi.mocked(mockLocalService.listTickets).mockResolvedValue([doneTicket]);
      vi.mocked(mockLocalService.getTicket).mockResolvedValue(doneTicket);
      vi.mocked(mockGitHubService.completeTicket).mockRejectedValue(
        new Error('GitHub API error')
      );

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      // Migration should still succeed even if status update fails
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      expect(mockGitHubService.createTicket).toHaveBeenCalled();
      expect(mockGitHubService.completeTicket).toHaveBeenCalled();
    });
  });
});