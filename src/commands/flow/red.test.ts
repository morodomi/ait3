import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { redPhase } from './red.js';
import { LocalTicketService } from '@/services/implementations/LocalTicketService.js';
import type { Services } from '@/common/types.js';
import type { TicketService } from '@/services/interfaces/TicketService.js';

// Helper to strip ANSI color codes for testing
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('redPhase Pure Function', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-red-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Create services container with test ticket service
    services = {
      ticketService: new LocalTicketService(testDir)
    };
  });

  afterEach(async () => {
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic functionality', () => {
    it('should validate ticketId is required', async () => {
      await expect(
        redPhase({ ticketId: '' }, services)
      ).rejects.toThrow('Ticket ID is required');
    });

    it('should validate ticket exists', async () => {
      await expect(
        redPhase({ ticketId: '9999' }, services)
      ).rejects.toThrow('Ticket with ID \'9999\' not found');
    });

    it('should generate unit test by default', async () => {
      // Create test ticket
      await services.ticketService.createTicket('Test feature for red phase', {
        priority: 'high',
        labels: ['test']
      });

      const result = await redPhase({ ticketId: '0001' }, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Unit test generated');
      expect(result.message).toContain('src/commands/');
      expect(result.message).toContain('0% pass rate');
    });

    it('should show local file location for LocalTicketService', async () => {
      // Create test ticket
      await services.ticketService.createTicket('Location Test Red', {
        priority: 'high'
      });

      const result = await redPhase({ ticketId: '0001' }, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/LOCATION.*\.tickets\/todo\/0001-location-test-red\.md/);
    });

    it('should use standardized prefixes', async () => {
      // Create test ticket
      await services.ticketService.createTicket('Prefix Test Red', {
        priority: 'high'
      });

      const result = await redPhase({ ticketId: '0001' }, services);
      
      expect(result.success).toBe(true);
      const strippedMessage = stripAnsi(result.message);
      
      // Should use INFO: instead of non-standard prefixes
      expect(strippedMessage).toContain('INFO:');
      expect(strippedMessage).not.toContain('CHECK:');
      expect(strippedMessage).not.toContain('CROSS:');
      
      // Should use TODO: for AI instructions
      expect(strippedMessage).toContain('TODO:');
      expect(strippedMessage).not.toContain('Next Action:');
      
      // Should use LOCATION: for test locations
      expect(strippedMessage).toContain('LOCATION:');
    });

    it('should show GitHub URL location for GitHubTicketService', async () => {
      // Mock GitHubTicketService
      const mockGitHubService = {
        getTicket: async () => ({
          id: '#82',
          title: 'GitHub Red Test',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        }),
        getConfig: () => ({ owner: 'testowner', repo: 'testrepo' })
      };

      const githubServices: Services = {
        ticketService: mockGitHubService as TicketService
      };

      const result = await redPhase({ ticketId: '82' }, githubServices);

      expect(result.success).toBe(true);
      expect(stripAnsi(result.message)).toContain('LOCATION: GitHub Issue #82 (use: gh issue view 82)');
    });
  });

  describe('test type options', () => {
    beforeEach(async () => {
      // Create test ticket using LocalTicketService
      await services.ticketService.createTicket('User Authentication', {
        priority: 'high',
        labels: ['auth', 'user']
      });
      
      // Add acceptance criteria to the ticket file manually
      const ticketContent = `---
id: '0001'
title: 'User Authentication'
status: todo
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels:
  - auth
  - user
---
# Ticket #0001: User Authentication

## Description
Implement user authentication with JWT

## Acceptance Criteria
- [ ] Users can login with email/password
- [ ] JWT tokens are generated on successful login
- [ ] Tokens expire after 24 hours
- [ ] Invalid credentials return 401 error`;

      await writeFile(
        join(testDir, 'todo', '0001-user-authentication.md'),
        ticketContent
      );
    });

    it('should generate only unit test when type is unit', async () => {
      const result = await redPhase(
        { ticketId: '0001', type: 'unit' },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Unit test generated');
      expect(result.message).not.toContain('Integration test generated');
    });

    it('should generate only integration test when type is integration', async () => {
      const result = await redPhase(
        { ticketId: '0001', type: 'integration' },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Integration test generated');
      expect(result.message).not.toContain('Unit test generated');
    });

    it('should generate both tests when type is both', async () => {
      const result = await redPhase(
        { ticketId: '0001', type: 'both' },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Unit test generated');
      expect(result.message).toContain('Integration test generated');
    });
  });

  describe('test content generation', () => {
    it('should extract test cases from acceptance criteria', async () => {
      // Create ticket using service first
      await services.ticketService.createTicket('Payment Processing', {
        priority: 'high',
        labels: ['payment', 'api']
      });
      
      // Then overwrite with acceptance criteria
      const ticketContent = `---
id: '0001'
title: 'Payment Processing'
status: todo
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels:
  - payment
  - api
---
# Ticket #0001: Payment Processing

## Acceptance Criteria
- [ ] Process credit card payments
- [ ] Handle payment failures gracefully
- [ ] Send email confirmation on success`;

      // Don't need to create todo directory - service already did that
      await writeFile(
        join(testDir, 'todo', '0001-payment-processing.md'),
        ticketContent
      );

      const result = await redPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('3 test cases generated');
      // Generated tests should fail
      expect(result.message).toContain('0% pass rate');
    });

    it('should use ticket labels to determine test patterns', async () => {
      // Create ticket using service first
      await services.ticketService.createTicket('API Endpoint', {
        priority: 'high',
        labels: ['api', 'rest']
      });
      
      const result = await redPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('API test pattern applied');
    });
  });

  describe('interactive mode', () => {
    it('should provide interactive options when flag is set', async () => {
      await services.ticketService.createTicket('Interactive test feature');

      const result = await redPhase(
        { ticketId: '0001', interactive: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Interactive mode');
      expect(result.message).toContain('[1]');
      expect(result.message).toContain('[2]');
      expect(result.message).toContain('[3]');
      expect(result.message).toContain('Claude Code Instructions');
    });
  });

  describe('dry run mode', () => {
    it('should preview without creating files', async () => {
      await services.ticketService.createTicket('Dry run test feature');

      const result = await redPhase(
        { ticketId: '0001', dryRun: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(result.message).toContain('Would execute');
      expect(result.message).toContain('Generate test files');
      expect(result.message).not.toContain('Created file');
    });
  });

  describe('error handling', () => {
    it('should handle tickets in wrong status', async () => {
      // Create and start a ticket (move to doing)
      await services.ticketService.createTicket('In progress feature');
      await services.ticketService.startTicket('0001');

      const result = await redPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Warning: Ticket is already in progress');
    });

    it('should handle completed tickets', async () => {
      // Create, start, and complete a ticket
      await services.ticketService.createTicket('Completed feature');
      await services.ticketService.startTicket('0001');
      await services.ticketService.completeTicket('0001');

      await expect(
        redPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 is already completed');
    });
  });
});