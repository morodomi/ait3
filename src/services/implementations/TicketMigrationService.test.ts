import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TicketMigrationService } from './TicketMigrationService.js';
import { LocalTicketService } from './LocalTicketService.js';
import { GitHubTicketService } from './GitHubTicketService.js';
import type { Ticket } from '../../common/types.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Mock the service implementations
vi.mock('./LocalTicketService.js');
vi.mock('./GitHubTicketService.js');

describe('TicketMigrationService', () => {
  let testDir: string;
  let migrationService: TicketMigrationService;
  let mockLocalService: LocalTicketService;
  let mockGitHubService: GitHubTicketService;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-migration-service-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Create mock services
    mockLocalService = new LocalTicketService(testDir);
    mockGitHubService = new GitHubTicketService({
      owner: 'testowner',
      repo: 'testrepo'
    });
    
    migrationService = new TicketMigrationService();
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('validateMigration', () => {
    it('should validate successful migration when no conflicts exist', async () => {
      // Mock empty local tickets (no tickets to migrate)
      const localTickets: Ticket[] = [];

      // Mock GitHub has no existing issues
      const githubTickets: Ticket[] = [];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(localTickets);
      vi.mocked(mockGitHubService.listTickets).mockResolvedValue(githubTickets);

      const result = await migrationService.validateMigration(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect ID conflicts when GitHub repository has existing issues', async () => {
      const localTickets: Ticket[] = [
        {
          id: '0001',
          title: 'Local Ticket 1',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        }
      ];

      const githubTickets: Ticket[] = [
        {
          id: '#1',
          title: 'Existing GitHub Issue',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        }
      ];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(localTickets);
      vi.mocked(mockGitHubService.listTickets).mockResolvedValue(githubTickets);

      const result = await migrationService.validateMigration(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('ID conflict');
    });

    it('should warn about data loss during migration', async () => {
      const localTickets: Ticket[] = [
        {
          id: '0001',
          title: 'Test Ticket',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: ['custom-label'],
          description: 'Local specific data'
        }
      ];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(localTickets);
      vi.mocked(mockGitHubService.listTickets).mockResolvedValue([]);

      const result = await migrationService.validateMigration(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(
        'Local markdown content will be migrated to GitHub issue body'
      );
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(mockLocalService.listTickets).mockRejectedValue(
        new Error('Local service error')
      );

      const result = await migrationService.validateMigration(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to read local tickets');
    });
  });

  describe('migrateLocalToGitHub', () => {
    it('should migrate all local tickets to GitHub successfully', async () => {
      const localTickets: Ticket[] = [
        {
          id: '0001',
          title: 'Ticket 1',
          status: 'todo',
          priority: 'high',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: ['feature']
        },
        {
          id: '0002',
          title: 'Ticket 2',
          status: 'doing',
          priority: 'medium',
          created: '2025-01-01T01:00:00Z',
          updated: '2025-01-01T01:00:00Z',
          labels: []
        }
      ];

      const migratedTickets: Ticket[] = [
        {
          id: '#1',
          title: 'Ticket 1',
          status: 'todo',
          priority: 'high',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: ['feature', 'status:todo', 'priority:high']
        },
        {
          id: '#2',
          title: 'Ticket 2',
          status: 'doing',
          priority: 'medium',
          created: '2025-01-01T01:00:00Z',
          updated: '2025-01-01T01:00:00Z',
          labels: ['status:doing', 'priority:medium']
        }
      ];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(localTickets);
      vi.mocked(mockLocalService.getTicket)
        .mockResolvedValueOnce(localTickets[0])
        .mockResolvedValueOnce(localTickets[1]);
      vi.mocked(mockGitHubService.createTicket)
        .mockResolvedValueOnce(migratedTickets[0])
        .mockResolvedValueOnce(migratedTickets[1]);

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(mockGitHubService.createTicket).toHaveBeenCalledTimes(2);
    });

    it('should handle partial migration failures', async () => {
      const localTickets: Ticket[] = [
        {
          id: '0001',
          title: 'Success Ticket',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        },
        {
          id: '0002',
          title: 'Fail Ticket',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T01:00:00Z',
          updated: '2025-01-01T01:00:00Z',
          labels: []
        }
      ];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(localTickets);
      vi.mocked(mockLocalService.getTicket)
        .mockResolvedValueOnce(localTickets[0])
        .mockResolvedValueOnce(localTickets[1]);
      vi.mocked(mockGitHubService.createTicket)
        .mockResolvedValueOnce({
          id: '#1',
          title: 'Success Ticket',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        })
        .mockRejectedValueOnce(new Error('GitHub API error'));

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(false);
      expect(result.migratedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should map ticket data correctly', async () => {
      const localTicket: Ticket = {
        id: '0001',
        title: 'Test Ticket',
        status: 'doing',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T01:00:00Z',
        labels: ['feature', 'urgent'],
        description: 'This is a test ticket description',
        assignee: 'developer@example.com'
      };

      vi.mocked(mockLocalService.listTickets).mockResolvedValue([localTicket]);
      vi.mocked(mockLocalService.getTicket).mockResolvedValue(localTicket);
      vi.mocked(mockGitHubService.createTicket).mockResolvedValue({
        id: '#1',
        title: 'Test Ticket',
        status: 'doing',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T01:00:00Z',
        labels: ['feature', 'urgent', 'status:doing', 'priority:high'],
        description: 'This is a test ticket description',
        assignee: 'developer@example.com'
      });

      await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(mockGitHubService.createTicket).toHaveBeenCalledWith(
        'Test Ticket',
        {
          priority: 'high',
          labels: ['feature', 'urgent'],
          description: 'This is a test ticket description',
          assignee: 'developer@example.com'
        }
      );
    });

    it('should handle empty local ticket list', async () => {
      vi.mocked(mockLocalService.listTickets).mockResolvedValue([]);

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('ID mapping strategy', () => {
    it('should handle existing GitHub repository with issues', async () => {
      const githubTickets: Ticket[] = [
        { id: '#1', title: 'Existing Issue 1', status: 'todo', priority: 'medium', created: '2025-01-01T00:00:00Z', updated: '2025-01-01T00:00:00Z', labels: [] },
        { id: '#2', title: 'Existing Issue 2', status: 'done', priority: 'low', created: '2025-01-01T01:00:00Z', updated: '2025-01-01T01:00:00Z', labels: [] }
      ];

      vi.mocked(mockGitHubService.listTickets).mockResolvedValue(githubTickets);

      const nextAvailableId = await migrationService.getNextAvailableGitHubId(
        mockGitHubService
      );

      expect(nextAvailableId).toBe(3);
    });

    it('should start from 1 for empty GitHub repository', async () => {
      vi.mocked(mockGitHubService.listTickets).mockResolvedValue([]);

      const nextAvailableId = await migrationService.getNextAvailableGitHubId(
        mockGitHubService
      );

      expect(nextAvailableId).toBe(1);
    });
  });

  describe('migrateLocalToGitHub with full ticket details', () => {
    it('should fetch full ticket details including description', async () => {
      const summaryTickets: Ticket[] = [
        {
          id: '0001',
          title: 'Test ticket',
          status: 'done',
          priority: 'high',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
          labels: ['feature']
          // Note: description missing in list
        }
      ];

      const fullTicket: Ticket = {
        ...summaryTickets[0],
        description: '# Full Description\n\nThis is the complete markdown content.'
      };

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(summaryTickets);
      vi.mocked(mockLocalService.getTicket).mockResolvedValue(fullTicket);
      vi.mocked(mockGitHubService.createTicket).mockResolvedValue({
        id: '#70',
        ...fullTicket
      });

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      // Should call getTicket for each ticket
      expect(mockLocalService.getTicket).toHaveBeenCalledWith('0001');
      
      // Should create with full description
      expect(mockGitHubService.createTicket).toHaveBeenCalledWith(
        'Test ticket',
        expect.objectContaining({
          description: '# Full Description\n\nThis is the complete markdown content.'
        })
      );

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
    });

    it('should skip tickets when getTicket returns null', async () => {
      const tickets: Ticket[] = [
        { id: '0001', title: 'Ticket 1', status: 'todo', priority: 'high', created: '', updated: '', labels: [] },
        { id: '0002', title: 'Ticket 2', status: 'todo', priority: 'medium', created: '', updated: '', labels: [] }
      ];

      vi.mocked(mockLocalService.listTickets).mockResolvedValue(tickets);
      vi.mocked(mockLocalService.getTicket)
        .mockResolvedValueOnce(null) // First ticket not found
        .mockResolvedValueOnce({ ...tickets[1], description: 'Content' });
      
      vi.mocked(mockGitHubService.createTicket).mockResolvedValue({
        id: '#71',
        ...tickets[1]
      });

      const result = await migrationService.migrateLocalToGitHub(
        mockLocalService,
        mockGitHubService
      );

      expect(result.migratedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0]).toContain('Failed to get full details for ticket 0001');
    });
  });
});