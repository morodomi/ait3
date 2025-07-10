import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { migrateCommand } from './index.js';
import { TicketMigrationService } from '../../services/implementations/TicketMigrationService.js';
import { LocalTicketService } from '../../services/implementations/LocalTicketService.js';
import { GitHubTicketService } from '../../services/implementations/GitHubTicketService.js';
import type { Services } from '../../common/types.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Mock the services
vi.mock('../../services/implementations/TicketMigrationService.js');
vi.mock('../../services/implementations/LocalTicketService.js');
vi.mock('../../services/implementations/GitHubTicketService.js');

describe('migrate command', () => {
  let testDir: string;
  let services: Services;
  let _mockMigrationService: TicketMigrationService;
  let mockLocalService: LocalTicketService;
  let mockGitHubService: GitHubTicketService;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-migrate-command-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Clear mocks first
    vi.clearAllMocks();
    
    // Create mock services
    _mockMigrationService = new TicketMigrationService();
    mockLocalService = new LocalTicketService(testDir);
    
    try {
      mockGitHubService = new GitHubTicketService({
        owner: 'testowner',
        repo: 'testrepo'
      });
    } catch (_error) {
      // Handle mock creation errors in specific tests
      mockGitHubService = {} as GitHubTicketService;
    }
    
    services = {
      ticketService: mockLocalService,
      gitService: undefined,
      projectAnalyzer: undefined
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('command line interface', () => {
    it('should require --from and --to flags', async () => {
      const result = await migrateCommand({}, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('--from and --to flags are required');
    });

    it('should validate supported migration directions', async () => {
      const result = await migrateCommand({
        from: 'local',
        to: 'unsupported'
      }, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unsupported migration direction');
    });

    it('should require GitHub configuration for github migration', async () => {
      const result = await migrateCommand({
        from: 'local',
        to: 'github'
        // Missing owner and repo
      }, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('GitHub owner and repo are required');
    });

    it('should validate GitHub owner and repo format', async () => {
      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'invalid owner with spaces',
        repo: 'valid-repo'
      }, services);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid GitHub owner format');
    });
  });

  describe('validation mode', () => {
    it('should run validation when --validate flag is provided', async () => {
      const mockValidationResult = {
        success: true,
        conflicts: [],
        warnings: ['Test warning'],
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.validateMigration).mockResolvedValue(mockValidationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        validate: true
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Validation completed');
      expect(result.message).toContain('Test warning');
      expect(TicketMigrationService.prototype.validateMigration).toHaveBeenCalled();
    });

    it('should report validation failures', async () => {
      const mockValidationResult = {
        success: false,
        conflicts: ['ID conflict: local 0001 vs github #1'],
        warnings: [],
        errors: ['GitHub API error']
      };

      vi.mocked(TicketMigrationService.prototype.validateMigration).mockResolvedValue(mockValidationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        validate: true
      }, services);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation failed');
      expect(result.message).toContain('ID conflict');
      expect(result.message).toContain('GitHub API error');
    });
  });

  describe('local to github migration', () => {
    it('should execute migration successfully', async () => {
      const mockMigrationResult = {
        success: true,
        migratedCount: 5,
        failedCount: 0,
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo'
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Migration completed successfully');
      expect(result.message).toContain('5 tickets migrated');
      expect(TicketMigrationService.prototype.migrateLocalToGitHub).toHaveBeenCalled();
    });

    it('should handle partial migration failures', async () => {
      const mockMigrationResult = {
        success: false,
        migratedCount: 3,
        failedCount: 2,
        errors: ['Failed to migrate ticket 0004', 'Failed to migrate ticket 0005']
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo'
      }, services);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Migration completed with errors');
      expect(result.message).toContain('3 tickets migrated');
      expect(result.message).toContain('2 tickets failed');
    });

    it('should handle complete migration failure', async () => {
      const mockMigrationResult = {
        success: false,
        migratedCount: 0,
        failedCount: 5,
        errors: ['Authentication failed']
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo'
      }, services);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Migration failed');
      expect(result.message).toContain('Authentication failed');
    });
  });

  describe('error handling', () => {
    it('should handle service creation errors', async () => {
      // Set up the mock to throw an error during service creation
      const mockConstructor = vi.fn().mockImplementation(() => {
        throw new Error('GitHub service creation failed');
      });
      vi.mocked(GitHubTicketService).mockImplementation(mockConstructor);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo'
      }, services);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create GitHub service');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Reset GitHub service mock to work normally
      vi.mocked(GitHubTicketService).mockImplementation(() => mockGitHubService);
      
      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo'
      }, services);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Migration failed');
      expect(result.message).toContain('Unexpected error');
    });
  });

  describe('specific ticket migration', () => {
    it('should migrate specific tickets when --tickets flag is provided', async () => {
      const mockMigrationResult = {
        success: true,
        migratedCount: 2,
        failedCount: 0,
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        tickets: '1,3'
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 tickets migrated');
    });

    it('should support range notation in --tickets flag', async () => {
      const mockMigrationResult = {
        success: true,
        migratedCount: 5,
        failedCount: 0,
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        tickets: '1-5'
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('5 tickets migrated');
    });

    it('should support mixed notation (comma and range) in --tickets flag', async () => {
      const mockMigrationResult = {
        success: true,
        migratedCount: 7,
        failedCount: 0,
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        tickets: '1,3,10-15'
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('7 tickets migrated');
    });

    it('should handle non-existent ticket IDs gracefully', async () => {
      const mockMigrationResult = {
        success: false,
        migratedCount: 1,
        failedCount: 1,
        errors: ['Ticket with ID 9999 not found']
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        tickets: '1,9999'
      }, services);

      expect(result.success).toBe(false);
      expect(result.message).toContain('1 tickets migrated');
      expect(result.message).toContain('1 tickets failed');
      expect(result.message).toContain('Ticket with ID 9999 not found');
    });
  });

  describe('description migration bug fix', () => {
    it('should migrate tickets with description content', async () => {
      const mockMigrationResult = {
        success: true,
        migratedCount: 1,
        failedCount: 0,
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.migrateLocalToGitHub).mockResolvedValue(mockMigrationResult);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        tickets: '1'
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 tickets migrated');
    });
  });

  describe('dry run mode', () => {
    it('should support --dry-run flag', async () => {
      // Reset GitHub service mock to work normally
      vi.mocked(GitHubTicketService).mockImplementation(() => mockGitHubService);
      
      const mockValidationResult = {
        success: true,
        conflicts: [],
        warnings: ['5 tickets will be migrated'],
        errors: []
      };

      vi.mocked(TicketMigrationService.prototype.validateMigration).mockResolvedValue(mockValidationResult);
      
      // Mock the local service to return tickets for dry run
      vi.mocked(mockLocalService.listTickets).mockResolvedValue([
        { id: '0001', title: 'Test ticket 1', status: 'todo', priority: 'medium', created: '2025-01-01T00:00:00Z', updated: '2025-01-01T00:00:00Z', labels: [] },
        { id: '0002', title: 'Test ticket 2', status: 'doing', priority: 'high', created: '2025-01-01T01:00:00Z', updated: '2025-01-01T01:00:00Z', labels: [] },
        { id: '0003', title: 'Test ticket 3', status: 'done', priority: 'low', created: '2025-01-01T02:00:00Z', updated: '2025-01-01T02:00:00Z', labels: [] }
      ]);

      const result = await migrateCommand({
        from: 'local',
        to: 'github',
        owner: 'testowner',
        repo: 'testrepo',
        dryRun: true
      }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dry run completed');
      expect(result.message).toContain('3 tickets will be migrated');
      expect(TicketMigrationService.prototype.validateMigration).toHaveBeenCalled();
      expect(TicketMigrationService.prototype.migrateLocalToGitHub).not.toHaveBeenCalled();
    });
  });
});