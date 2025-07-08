import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { refactorPhase } from './refactor.js';
import { LocalTicketService } from '@/services/implementations/LocalTicketService.js';
import type { Services } from '@/common/types.js';

describe('refactorPhase Pure Function', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-refactor-${hash}-`);
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
        refactorPhase({ ticketId: '' }, services)
      ).rejects.toThrow('Ticket ID is required');
    });

    it('should validate ticket exists', async () => {
      await expect(
        refactorPhase({ ticketId: '9999' }, services)
      ).rejects.toThrow("Ticket with ID '9999' not found");
    });

    it('should reject tickets not in doing status', async () => {
      // Create ticket in todo status
      await services.ticketService.createTicket('Test feature', {
        priority: 'high'
      });

      await expect(
        refactorPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 must be in progress');
    });

    it('should generate analysis for valid ticket', async () => {
      // Create and start ticket
      await services.ticketService.createTicket('Test feature');
      await services.ticketService.startTicket('0001');

      const result = await refactorPhase({ ticketId: '0001' }, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('REFACTOR Phase');
      expect(result.message).toContain('Ticket #0001');
      expect(result.message).toContain('Claude Code Instructions');
    });
  });

  describe('analysis output', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Feature to refactor', {
        priority: 'high',
        labels: ['feature']
      });
      await services.ticketService.startTicket('0001');
    });

    it('should include code quality summary', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Code Quality Summary');
      expect(result.message).toContain('Files analyzed');
      expect(result.message).toContain('Improvement opportunities');
    });

    it('should detect code duplication', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Code Duplication');
      expect(result.message).toContain('Extract to common');
    });

    it('should identify mock implementations', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Mock Implementations');
      expect(result.message).toContain('Create ticket');
    });

    it('should suggest type improvements', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Type Improvements');
      expect(result.message).toContain('explicit return types');
    });

    it('should provide code organization suggestions', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Code Organization');
      expect(result.message).toContain('Extract');
    });
  });

  describe('verbose mode', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Verbose test');
      await services.ticketService.startTicket('0001');
    });

    it('should show detailed analysis in verbose mode', async () => {
      const result = await refactorPhase(
        { ticketId: '0001', verbose: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Detailed Analysis');
      expect(result.message).toContain('Line-by-line');
      expect(result.message).toContain('Complexity metrics');
    });

    it('should show minimal output without verbose mode', async () => {
      const result = await refactorPhase(
        { ticketId: '0001', verbose: false },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('Detailed Analysis');
      expect(result.message).toContain('Refactoring Suggestions'); // Still shows summary
    });
  });

  describe('focus option', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Focus test');
      await services.ticketService.startTicket('0001');
    });

    it('should focus on specific analysis areas when specified', async () => {
      const result = await refactorPhase(
        { ticketId: '0001', focus: ['mocks', 'duplication'] },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Mock Implementations');
      expect(result.message).toContain('Code Duplication');
      // Should not include other analyses
      expect(result.message).not.toContain('Type Improvements');
    });

    it('should show all analyses when no focus specified', async () => {
      const result = await refactorPhase(
        { ticketId: '0001' },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Code Duplication');
      expect(result.message).toContain('Mock Implementations');
      expect(result.message).toContain('Type Improvements');
      expect(result.message).toContain('Code Organization');
    });
  });

  describe('next steps guidance', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Next steps test');
      await services.ticketService.startTicket('0001');
    });

    it('should provide clear next steps', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Actions');
      expect(result.message).toContain('Review and apply suggestions');
      expect(result.message).toContain('Run tests');
    });

    it('should suggest mock ticket creation', async () => {
      const result = await refactorPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Consider creating tickets for mocks');
    });
  });

  describe('error handling', () => {
    it('should handle completed tickets', async () => {
      await services.ticketService.createTicket('Completed feature');
      await services.ticketService.startTicket('0001');
      await services.ticketService.completeTicket('0001');

      await expect(
        refactorPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 is already completed');
    });

    it('should handle analysis errors gracefully', async () => {
      await services.ticketService.createTicket('Error test');
      await services.ticketService.startTicket('0001');

      // Simulate analysis error
      const result = await refactorPhase(
        { 
          ticketId: '0001',
          _forceAnalysisError: true
        } as any,
        services
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Analysis failed');
      expect(result.message).toContain('Check your project structure');
    });
  });
});