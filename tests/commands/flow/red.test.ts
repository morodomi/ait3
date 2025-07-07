import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { redPhase } from '../../../src/commands/flow/red.js';
import { LocalTicketService } from '../../../src/services/implementations/LocalTicketService.js';
import type { Services } from '../../../src/common/types.js';

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
      ).rejects.toThrow('Ticket #9999 not found');
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
      expect(result.message).toContain('tests/commands/');
      expect(result.message).toContain('0% pass rate');
    });
  });

  describe('test type options', () => {
    beforeEach(async () => {
      // Create test ticket with acceptance criteria
      const ticketContent = `# Ticket #0001: User Authentication

## Description
Implement user authentication with JWT

## Acceptance Criteria
- [ ] Users can login with email/password
- [ ] JWT tokens are generated on successful login
- [ ] Tokens expire after 24 hours
- [ ] Invalid credentials return 401 error`;

      await mkdir(join(testDir, 'todo'), { recursive: true });
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
      const ticketContent = `---
id: 0001
title: Payment Processing
status: todo
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels: ['payment', 'api']
---
# Ticket #0001: Payment Processing

## Acceptance Criteria
- [ ] Process credit card payments
- [ ] Handle payment failures gracefully
- [ ] Send email confirmation on success`;

      await mkdir(join(testDir, 'todo'), { recursive: true });
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
      const ticketContent = `---
id: 0001
title: API Endpoint
status: todo
priority: high
created: '2025-07-07T10:00:00.000Z'
updated: '2025-07-07T10:00:00.000Z'
labels: ['api', 'rest']
---
# Ticket #0001: API Endpoint`;

      await mkdir(join(testDir, 'todo'), { recursive: true });
      await writeFile(
        join(testDir, 'todo', '0001-api-endpoint.md'),
        ticketContent
      );

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
      expect(result.message).toContain('Would generate');
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