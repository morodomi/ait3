import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { squashPhase } from '../../../src/commands/flow/squash.js';
import { LocalTicketService } from '../../../src/services/implementations/LocalTicketService.js';
import type { Services } from '../../../src/common/types.js';

describe('squashPhase Pure Function', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-squash-${hash}-`);
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
        squashPhase({ ticketId: '' }, services)
      ).rejects.toThrow('Ticket ID is required');
    });

    it('should validate ticket exists', async () => {
      await expect(
        squashPhase({ ticketId: '9999' }, services)
      ).rejects.toThrow("Ticket with ID '9999' not found");
    });

    it('should reject tickets not in doing status', async () => {
      // Create ticket in todo status
      await services.ticketService.createTicket('Test feature', {
        priority: 'high'
      });

      await expect(
        squashPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 must be in progress');
    });

    it('should generate squash suggestions for valid ticket', async () => {
      // Create and start ticket
      await services.ticketService.createTicket('flow squash command');
      await services.ticketService.startTicket('0001');

      const result = await squashPhase({ ticketId: '0001' }, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('SQUASH Phase');
      expect(result.message).toContain('Git Command Suggestions');
      expect(result.message).toContain('ticket #0001');
    });
  });

  describe('Git command suggestions', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Feature to squash', {
        priority: 'high',
        labels: ['feature']
      });
      await services.ticketService.startTicket('0001');
    });

    it('should include squash rebase commands', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('git rebase -i main');
      expect(result.message).toContain('Squash commits into logical units');
      expect(result.message).toContain('Mark commits to squash');
    });

    it('should include commit message suggestions', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('git commit --amend');
      expect(result.message).toContain('feat(#0001)');
      expect(result.message).toContain('comprehensive commit message');
    });

    it('should include push commands with safety', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('git push origin');
      expect(result.message).toContain('--force-with-lease');
    });

    it('should include merge commands', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('git checkout main');
      expect(result.message).toContain('git merge');
      expect(result.message).toContain('git pull origin main');
    });

    it('should include next steps guidance', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Next steps');
      expect(result.message).toContain('Review suggested commands');
      expect(result.message).toContain('ait3 ticket complete');
    });
  });

  describe('options support', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Options test');
      await services.ticketService.startTicket('0001');
    });

    it('should include PR commands when --pr flag is used', async () => {
      const result = await squashPhase(
        { ticketId: '0001', pr: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('gh pr create');
      expect(result.message).toContain('Create Pull Request');
    });

    it('should skip squash suggestions when --no-squash flag is used', async () => {
      const result = await squashPhase(
        { ticketId: '0001', noSquash: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('git rebase -i');
      expect(result.message).toContain('git merge');
    });

    it('should show dry-run mode when --dry-run flag is used', async () => {
      const result = await squashPhase(
        { ticketId: '0001', dryRun: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(result.message).toContain('Preview mode');
    });

    it('should support combined options', async () => {
      const result = await squashPhase(
        { 
          ticketId: '0001', 
          pr: true, 
          noSquash: true 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('gh pr create');
      expect(result.message).not.toContain('git rebase -i');
    });
  });

  describe('error handling', () => {
    it('should handle completed tickets', async () => {
      await services.ticketService.createTicket('Completed feature');
      await services.ticketService.startTicket('0001');
      await services.ticketService.completeTicket('0001');

      await expect(
        squashPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 is already completed');
    });

    it('should provide clear error messages', async () => {
      await expect(
        squashPhase({ ticketId: '' }, services)
      ).rejects.toThrow('Ticket ID is required for SQUASH phase');
    });
  });

  describe('template customization', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Custom template test', {
        priority: 'medium',
        labels: ['enhancement', 'ui']
      });
      await services.ticketService.startTicket('0001');
    });

    it('should customize commands with ticket information', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('feat(#0001): custom template test');
      expect(result.message).toContain('feature/0001-');
    });

    it('should include ticket title in branch suggestions', async () => {
      const result = await squashPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('feature/0001');
      expect(result.message).toContain('custom-template-test');
    });
  });
});